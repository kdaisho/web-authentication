import express from "express"
import db from "./db.js"
import * as url from "url"

import * as jwtJsDecode from "jwt-js-decode"
import base64url from "base64url"
import SimpleWebAuthnServer from "@simplewebauthn/server"
import { findUser, isInvalidEmail, hash } from "./utils.js"

const app = express()
app.use(express.json())

const __dirname = url.fileURLToPath(new URL(".", import.meta.url))

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

app.post("auth/login", (req, res) => {
    const { name, email, password } = req.body
    const foundUser = findUser(req.body.email)

    if (foundUser) {
        if (compare(password, foundUser.password)) {
            res.ok({ ok: true, name, email })
        } else {
            res.send({ ok: false, message: "Credential are wrong." })
        }
    } else {
        res.send({ ok: false, message: "Credential are wrong." })
    }
})

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

app.get("*", (_, res) => {
    // this actually doesn't do anything as long as the line above `app.use(express.static("public"))` is there
    res.sendFile(__dirname + "public/index.html")
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
