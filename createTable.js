import { getDBConnection } from "./db/db.js";

async function createTable() {
    const db = await getDBConnection()

    await db.exec(`
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ); 
`)

    await db.close()
    console.log('table created')

}

createTable()