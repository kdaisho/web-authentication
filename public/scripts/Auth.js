import API from "./API.js"
import Router from "./Router.js"

const Auth = {
    isLoggedIn: false,
    account: null,
    async register(event) {
        event.preventDefault()
        const formData = new FormData(event.target)
        const user = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
        }
        const response = await API.register(user)
        console.log("response for register", response)
    },
    async login(event) {
        event.preventDefault()
        const formData = new FormData(event.target)
        const credentials = {
            email: formData.get("email"),
            password: formData.get("password"),
        }
        const response = await API.login(credentials)
        console.log("response for login", response)
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
    init: () => {},
}
Auth.updateStatus()

export default Auth

// make it a global object
window.Auth = Auth
