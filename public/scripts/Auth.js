import API from "./API.js"
import Router from "./Router.js"

const Auth = {
    isLoggedIn: false,
    account: null,
    postLogin(res, user) {
        if (res.ok) {
            Auth.isLoggedIn = true
            Auth.account = {
                name: user.name,
                email: user.email,
            }
            Auth.updateStatus()
            Router.go("/account")
        } else {
            alert(res.message)
        }

        // credential management api storage - works only on chromium-based browsers
        if (window.PasswordCredential && user.password) {
            const credentials = new PasswordCredential({
                id: user.email,
                name: user.name,
                password: user.password,
            })

            try {
                navigator.credentials.store(credentials)
            } catch (err) {
                console.error("Failed to save", err)
            }
        }
    },
    async register(event) {
        event.preventDefault()
        const formData = new FormData(event.target)
        const user = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
        }
        const response = await API.register(user)
        Auth.postLogin(response, user)
    },
    async checkAuthOptions(email) {
        const response = await API.checkAuthOptions({ email })
        Auth.loginStep = 2

        if (response.password) {
            document.getElementById("login_section_password").hidden = false
        }
        if (response.webauthn) {
            document.getElementById("login_section_webauthn").hidden = false
        }
        if (response.unregistered) {
            Router.go("/register")
        }
    },

    // 2nd
    async addWebAuthn() {
        const options = await API.webAuthn.registrationOptions()
        // deprecated in ver.7? these 3 lines are not addressed in the docs
        options.authenticatorSelection.residentKey = "required"
        options.authenticatorSelection.requireResidentKey = true
        options.extensions = {
            credProps: true,
        }
        const authRes = await SimpleWebAuthnBrowser.startRegistration(options)
        const verificationRes = await API.webAuthn.registrationVerification(
            authRes
        )
        if (verificationRes.ok) {
            alert("You can now login with WebAuthn")
        } else {
            alert(verificationRes.message)
        }
    },
    async login(event) {
        event.preventDefault()
        const formData = new FormData(event.target)
        const email = formData.get("email")
        if (Auth.loginStep === 1) {
            Auth.checkAuthOptions(email)
        } else {
            // step 2
            const credentials = {
                email,
                password: formData.get("password"),
            }
            const response = await API.login(credentials)
            Auth.postLogin(response, { ...credentials, name: response.name })
        }
    },
    async webAuthnLogin() {
        const email = document.getElementById("login_email").value
        const options = await API.webAuthn.loginOptions(email)
        const loginRes = await SimpleWebAuthnBrowser.startAuthentication(
            options
        )
        const verificationRes = await API.webAuthn.loginVerification(
            email,
            loginRes
        )

        if (verificationRes.ok) {
            Auth.postLogin(verificationRes, verificationRes.user)
        } else {
            alert(verificationRes.message)
        }
    },
    logout() {
        Auth.isLoggedIn = false
        Auth.account = null
        Auth.updateStatus()
        Router.go("/")

        if (window.PasswordCredential) {
            try {
                navigator.credentials.preventSilentAccess()
            } catch (err) {
                console.log("navigator: error", err)
            }
        }
    },
    async autoLogin() {
        if (window.PasswordCredential) {
            const credentials = await navigator.credentials.get({
                password: true,
            })
            // this won't work without https as of April 2023, so this always null
        }
    },
    updateStatus() {
        if (Auth.isLoggedIn && Auth.account) {
            document
                .querySelectorAll(".logged_out")
                .forEach(elem => (elem.style.display = "none"))
            document
                .querySelectorAll(".logged_in")
                .forEach(elem => (elem.style.display = "block"))
            document
                .querySelectorAll(".account_name")
                .forEach(elem => (elem.innerHTML = Auth.account.name))
            document
                .querySelectorAll(".account_username")
                .forEach(elem => (elem.innerHTML = Auth.account.email))
        } else {
            document
                .querySelectorAll(".logged_out")
                .forEach(elem => (elem.style.display = "block"))
            document
                .querySelectorAll(".logged_in")
                .forEach(elem => (elem.style.display = "none"))
        }
    },
    loginStep: 1,
    init: () => {
        document.getElementById("login_section_password").hidden = true
        document.getElementById("login_section_webauthn").hidden = true
    },
}
Auth.updateStatus()
Auth.autoLogin()

export default Auth

// make it a global object
window.Auth = Auth
