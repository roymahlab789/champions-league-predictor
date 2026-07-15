import { getDBConnection } from "./db/db.js";

async function insertData() {
    let db

    try {
        db = await getDBConnection()
        await db.run(`INSERT OR IGNORE INTO tournaments (name, season)
            VALUES(?, ?)`,
        ['UEFA Champions League', '2026/27']
    )
    console.log('Tournament seed completed')

    } catch (err) {
        console.error('Seed error:', err.message)
    } finally {
        if (db) {
            await db.close()
        }
    }
} 

insertData()
    