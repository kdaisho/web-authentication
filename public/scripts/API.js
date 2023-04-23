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
    register: async user => {
        return await makePostRequest(endpoint + "register", user)
    },
    login: async credentials => {
        return await makePostRequest(endpoint + "login", credentials)
    },
}

export default API
