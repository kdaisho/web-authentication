import express from "express"
import db from "./db.js"
import base64url from "base64url"
import * as url from "url"
import SimpleWebAuthnServer from "@simplewebauthn/server"
import { findUser, isInvalidEmail, hash, compare } from "./utils.js"

const app = express()
app.use(express.json())

const __dirname = url.fileURLToPath(new URL(".", import.meta.url))

// rp = relying party
const rpID = "localhost"
const protocol = "http"
const port = 5050
const expectedOrigin = `${protocol}://${rpID}:${port}`

app.use(express.static("public"))
app.use(express.json())
app.use(
    express.urlencoded({
        extended: true,
    })
)

app.post("/auth/register", (req, res) => {
    const { name, email, password } = req.body
    const foundUser = findUser(email)

    switch (true) {
        case isInvalidEmail(email):
            res.send({ ok: false, message: "Email is invalid." })
            break
        case foundUser:
            res.send({ ok: false, message: "User already exists." })
            break
        default:
            const user = {
                name,
                email,
                password: hash(password),
            }
            db.data.users.push(user)
            db.write()
            res.send({ ok: true })
    }
})

app.post("/auth/auth-options", (req, res) => {
    if (isInvalidEmail(req.body.email)) return
    const foundUser = findUser(req.body.email)

    if (foundUser) {
        res.send({
            password: true,
            webauthn: foundUser.webauthn || false,
        })
    } else {
        res.send({ unregistered: true })
    }
})

app.post("/auth/login", (req, res) => {
    const { email, password } = req.body
    const foundUser = findUser(email)

    if (foundUser) {
        if (compare(password, foundUser.password)) {
            res.send({ ok: true, name: foundUser.name, email: foundUser.email })
        } else {
            res.send({ ok: false, message: "Credential are wrong." })
        }
    } else {
        res.send({ ok: false, message: "Credential are wrong." })
    }
})

// WEBAUTHN ENDPOINTS: 4 endpoints -  2 for registration, 2 for login
// 1st endpoint for webauthn
app.post("/auth/webauth-registration-options", (req, res) => {
    const user = findUser(req.body.email)

    const options = {
        rpName: "Coffee Masters",
        rpID,
        userID: user.email,
        userName: user.name,
        timeout: 60000, // deprecated in ver.7
        attestationType: "none",

        /**
         * Passing in a user's list of already-registered authenticator IDs here prevents users from
         * registering the same device multiple times. The authenticator will simply throw an error in
         * the browser if it's asked to perform registration when one of these ID's already resides
         * on it.
         */
        excludeCredentials: user.devices
            ? user.devices.map(device => ({
                  id: device.credentialID,
                  type: "public-key",
                  transports: device.transports,
              }))
            : [],

        // deprecated in ver.7
        authenticatorSelection: {
            userVerification: "required",
            residentKey: "required",
        },
        /**
         * The two most common algorithms: ES256, and RS256
         * deprecated in ver.7
         */
        supportedAlgorithmIDs: [-7, -257],
    }

    /**
     * The server needs to temporarily remember this value for verification, so don't lose it until
     * after you verify an authenticator response.
     */
    const regOptions = SimpleWebAuthnServer.generateRegistrationOptions(options)
    user.currentChallenge = regOptions.challenge
    db.write()

    res.send(regOptions)
})

// 2rd endpoint for webauthn
app.post("/auth/webauth-registration-verification", async (req, res) => {
    const user = findUser(req.body.user.email)
    const data = req.body.data

    const expectedChallenge = user.currentChallenge

    let verification
    try {
        const options = {
            credential: data,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            requireUserVerification: true, // deprecated in ver.7?
        }
        verification = await SimpleWebAuthnServer.verifyRegistrationResponse(
            options
        )
    } catch (error) {
        console.error(error)
        return res.status(400).send({ error: error.toString() })
    }

    const { verified, registrationInfo } = verification

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo

        const existingDevice = user.devices
            ? user.devices.find(device => {
                  const result = new Buffer.from(
                      device.credentialID.data
                  ).equals(credentialID)
                  return result
              })
            : false

        if (!existingDevice) {
            const newDevice = {
                credentialPublicKey,
                credentialID,
                counter,
                transports: data.transports,
            }
            if (user.devices === undefined) {
                user.devices = []
            }
            user.webauthn = true
            user.devices.push(newDevice)
            db.write() // here, we save devices (only and the last thing) here
        }
    }

    res.send({ ok: true })
})

// 3rd endpoint for webauthn
app.post("/auth/webauth-login-options", (req, res) => {
    const user = findUser(req.body.email)
    const options = {
        timeout: 60000,
        allowCredentials: [],
        devices:
            user && user.devices
                ? user.devices.map(device => ({
                      id: device.credentialID,
                      type: "public-key",
                      transports: device.transports,
                  }))
                : [],
        userVerification: "required",
        rpID,
    }
    const loginOpts =
        SimpleWebAuthnServer.generateAuthenticationOptions(options)
    if (user) user.currentChallenge = loginOpts.challenge // saveしてなくね？でも動いてるし、なんで？//it's because saving to memory, not file system at this point

    res.send(loginOpts)
})

// 4th endpoint for webauthn
app.post("/auth/webauth-login-verification", async (req, res) => {
    const data = req.body.data
    const user = findUser(req.body.email)

    if (user === null) {
        res.sendStatus(400).send({ ok: false })
        return
    }

    const expectedChallenge = user.currentChallenge

    let dbAuthenticator
    const bodyCredIDBuffer = base64url.toBuffer(data.rawId)

    for (const device of user.devices) {
        const currentCredential = Buffer(device.credentialID.data)
        if (bodyCredIDBuffer.equals(currentCredential)) {
            dbAuthenticator = device
            break
        }
    }

    if (!dbAuthenticator) {
        return res.status(400).send({
            ok: false,
            message: "Authenticator is not registered with this site",
        })
    }

    let verification
    try {
        const options = {
            credential: data, // deprecated in ver.7 and replaced with 'response'
            expectedChallenge: expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: {
                ...dbAuthenticator,
                credentialPublicKey: new Buffer.from( // new Buffer.from is wrong; should be Buffer.from
                    dbAuthenticator.credentialPublicKey.data
                ), // Re-convert to Buffer from JSON
            },
            requireUserVerification: true,
        }
        verification = await SimpleWebAuthnServer.verifyAuthenticationResponse(
            options
        )
    } catch (error) {
        return res.status(400).send({ ok: false, message: error.toString() })
    }

    const { verified, authenticationInfo } = verification

    if (verified) {
        dbAuthenticator.counter = authenticationInfo.newCounter
    }

    res.send({
        ok: true,
        user: {
            name: user.name,
            email: user.email,
        },
    })
})

app.get("*", (_, res) => {
    // this actually doesn't do anything as long as the line above `app.use(express.static("public"))` is there
    res.sendFile(__dirname + "public/index.html")
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
