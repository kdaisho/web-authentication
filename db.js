import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import * as url from "url"

export const __dirname = url.fileURLToPath(new URL(".", import.meta.url))

const adapter = new JSONFile(__dirname + "/data.json")
const db = new Low(adapter)
await db.read()
db.data ||= { users: [] }

export default db
