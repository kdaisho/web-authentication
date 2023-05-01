const endpoint = "/auth/"

const makePostRequest = async (url, data) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
    return await response.json()
}

const API = {
    async register(user) {
        return await makePostRequest(endpoint + "register", user)
    },
    async login(credentials) {
        return await makePostRequest(endpoint + "login", credentials)
    },
    async credentials() {
        return await makePostRequest(endpoint + "login", credentials)
    },
    async checkAuthOptions(user) {
        return await makePostRequest(endpoint + "auth-options", user)
    },
    webAuthn: {
        async loginOptions(email) {
            return await makePostRequest(endpoint + "webauth-login-options", {
                email,
            })
        },
        async loginVerification(email, data) {
            return await makePostRequest(
                endpoint + "webauth-login-verification",
                {
                    email,
                    data,
                }
            )
        },
        async registrationOptions() {
            return await makePostRequest(
                endpoint + "webauth-registration-options",
                Auth.account
            )
        },
        async registrationVerification(data) {
            return await makePostRequest(
                endpoint + "webauth-registration-verification",
                {
                    user: Auth.account,
                    data,
                }
            )
        },
    },
}

export default API
