import { getDBConnection } from "../db/db.js";
import crypto from 'node:crypto'


export async function createLeague(req, res) {
    let { name } = req.body
    
    if (!name) {
        return res.status(400).json({error: 'League name is required'})
    }

    name = name.trim()

    if(!name) {
        return res.status(400).json({error: 'League name cannot contain only spaces'})
    }

    if(name.length > 50) {
        return res.status(400).json({
            error: 'League name cannot exceed 50 characters'
        })
    }

    const ownerId = req.session.userId
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase()

    let db

    try {
        db = await getDBConnection()

        const result = await db.run(`
            INSERT INTO leagues(name, owner_id, invite_code)  
            VALUES(?, ?, ?)`, 
            [name, ownerId, inviteCode])

            await db.run(
                `INSERT INTO league_members (league_id, user_id)
                VALUES(?, ?)`,
                [result.lastID, ownerId]
            )

            return res.status(201).json({
                league: {
                    id: result.lastID,
                    name,
                    inviteCode
                }
            })
    } catch (err) {
        console.error('League creation error:', err)

        return res.status(500).json({error: 'failed to create league'})
    } finally {
        if (db) {
            await db.close()
        }
    }
}