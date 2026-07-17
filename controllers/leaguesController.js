import { error } from "node:console";
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

            await db.run(
                `UPDATE users
                SET favorite_league_id = COALESCE(favorite_league_id, ?)
                WHERE id = ?`, 
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

export async function getMyLeagues (req, res) {
    let db
    const userId = req.session.userId

    try {
        db = await getDBConnection()

        const leagues = await db.all(
        `SELECT
            l.id,
            l.name,
            l.owner_id,
            l.invite_code,
            l.created_at,
            lm.joined_at,
            CASE
                WHEN l.id = u.favorite_league_id THEN 1
                ELSE 0
            END AS is_favorite
        FROM league_members AS lm
        JOIN leagues AS l
        ON l.id = lm.league_id
        JOIN users AS u
        ON u.id = lm.user_id
        WHERE lm.user_id = ?
        ORDER BY is_favorite DESC, lm.joined_at ASC`,
        [userId]
    )

        return res.json({ leagues })
    } catch (err) {
        console.error('Get leagues error:', err)

        return res.status(500).json({
            error: 'Failed to retrieve leagues'
        })
    } finally {
        if (db) {
            await db.close()
        }
    }
}

    export async function joinLeague(req, res) {
        let db

        let { inviteCode } = req.body
        const userId = req.session.userId

        if (!inviteCode) {
            return res.status(400).json({
                error: 'Invite code is required'
            })
        }

        if (typeof inviteCode !== 'string') {
            return res.status(400).json({
                error: 'Invite code must be a string'
            })
        }

        inviteCode = inviteCode.trim().toUpperCase()

        if (!inviteCode) {
            return res.status(400).json({
                error: 'Invite code cannot contain only white spaces'
            })
        }

        try {
            db = await getDBConnection()

            const league = await db.get(`
                SELECT id, name, invite_code
                FROM leagues
                WHERE invite_code = ?`, [inviteCode])

                if (!league) {
                    return res.status(404).json({
                        error: 'League not found'
                    })
                }

                const existingMember = await db.get(`
                    SELECT id FROM league_members
                    WHERE league_id = ? AND user_id = ?`, 
                    [league.id, userId]
                )

                if (existingMember) {
                    return res.status(409).json({
                        error: 'User is already a member of this league'
                    })
                }

                await db.run(
                    `
                    INSERT INTO league_members(league_id, user_id)
                    VALUES(?, ?)`,
                [league.id, userId]
            )

                await db.run(

                `UPDATE users
                SET favorite_league_id = COALESCE(favorite_league_id, ?)
                WHERE id = ?`,
                [league.id, userId]
            )

            return res.status(201).json({
                message: 'League joined successfully',
                league
            })
        } catch (err) {
            console.error('Join league error:', err)

            return res.status(500).json({
                error: 'Failed to join league'
            })
        } finally {
            if (db) {
                await db.close()
            }
        }
    }

    export async function getLeagueLeaderboard(req, res) {
        const leagueId = req.params.leagueId
        const userId = req.session.userId
        let db

        try {
            db = await getDBConnection()
            const membership = await db.get(
                `
                SELECT l.id, l.name FROM leagues AS l
                JOIN league_members AS lm
                ON lm.league_id = l.id
                WHERE l.id = ? AND lm.user_id = ?`,
                [leagueId, userId]
            )

            if (!membership) {
                return res.status(403).json({
                    error: 'You are not a member of this league'
                })
            }

            const standings = await db.all(`
                SELECT
                u.id AS user_id,
                u.name,
                0 AS points,
                lm.joined_at
                FROM league_members AS lm
                JOIN users AS u
                ON u.id = lm.user_id
                WHERE lm.league_id = ?
                ORDER BY lm.joined_at ASC`,
                [leagueId]
            )
            return res.json({
                league: membership,
                standings
            })
        } catch (err) {
            console.error('Get league leaderboard error:', err)
            return res.status(500).json({
                error: 'Failed to get leaderboard'
            })
        } finally {
            if (db) {
                await db.close()
            }
        }
    }