import bcrypt from "bcryptjs"

export function findUser(email) {
    const user = db.data.users.find(user => user.email === email)
    if (!user) return null
    return user
}

export function isValidEmail(email) {
    return email.match(
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
}

export function hash(str) {
    const salt = bcrypt.genSaltSync(10)
    console.log("salt", salt)

    return bcrypt.hashSync(str, salt)
}
