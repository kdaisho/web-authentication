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

        switch (true) {
            case response.password:
                document.getElementById("login_section_password").hidden = false
                break
            case response.webauthn:
                document.getElementById("login_section_webauthn").hidden = false
                break
            case response.unregistered:
                Router.go("/register")
                break
            default:
                break
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
    logout() {
        Auth.isLoggedIn = false
        Auth.account = null
        Auth.updateStatus()
        Router.go("/")

        if (window.PasswordCredential) {
            navigator.credentials.preventSilentAccess()
        }
    },
    async autoLogin() {
        if (window.PasswordCredential) {
            const credentials = await navigator.credentials.get({
                password: true,
            })
            // this won't work without https as of April 2023, so this always null
            console.log(credentials)
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
