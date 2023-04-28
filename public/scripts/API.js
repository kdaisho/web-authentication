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
}

export default API
