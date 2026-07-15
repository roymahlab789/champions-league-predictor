import { getDBConnection } from "../db/db.js"



export async function getCurrentTournament(req, res) {
let db

    try {
        db = await getDBConnection()

        const tournament = await db.get(`SELECT id, name, season, prediction_deadline, status
            FROM tournaments
            LIMIT 1
            `
        )

        if (!tournament) {
            return res.status(404).json({
                error: 'Tournament not found'
            })
        }

        return res.json({tournament})
    } catch (err) {
        console.error('getCurrentTournament error:', err)
        return res.status(500).json({
            error: 'Internal sever error'
        })
    } finally {
        if (db) {
            await db.close()
        }
    }

    
}