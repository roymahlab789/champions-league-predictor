import crypto from 'node:crypto'
import { getDBConnection } from '../db/db.js'

const MAX_LEAGUE_NAME_LENGTH = 50
const INVITE_CODE_PATTERN = /^[A-F0-9]{6,64}$/

function parsePositiveInteger(value) {
    const number = Number(value)

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null
}

function sanitizePlainText(value) {
    if (typeof value !== 'string') {
        return null
    }

    return value
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/\s+/gu, ' ')
        .trim()
}

function countCharacters(value) {
    return Array.from(value).length
}

async function createUniqueInviteCode(db) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        // 128 bits of randomness. Existing shorter codes remain compatible.
        const inviteCode = crypto.randomBytes(16).toString('hex').toUpperCase()
        const existingLeague = await db.get(
            `SELECT id
             FROM leagues
             WHERE invite_code = ?`,
            [inviteCode]
        )

        if (!existingLeague) {
            return inviteCode
        }
    }

    throw new Error('Could not generate a unique invite code')
}

async function rollbackQuietly(db) {
    try {
        await db.exec('ROLLBACK')
    } catch (rollbackError) {
        console.error('Database rollback error:', rollbackError)
    }
}

export async function createLeague(req, res) {
    const ownerId = parsePositiveInteger(req.session.userId)
    const name = sanitizePlainText(req.body?.name)
    let db
    let transactionOpen = false

    if (!ownerId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (name === null) {
        return res.status(400).json({ error: 'League name must be a string' })
    }

    if (!name) {
        return res.status(400).json({
            error: 'League name cannot contain only spaces'
        })
    }

    if (countCharacters(name) > MAX_LEAGUE_NAME_LENGTH) {
        return res.status(400).json({
            error: 'League name cannot exceed 50 characters'
        })
    }

    try {
        db = await getDBConnection()
        await db.exec('BEGIN IMMEDIATE TRANSACTION')
        transactionOpen = true

        const inviteCode = await createUniqueInviteCode(db)
        const result = await db.run(
            `INSERT INTO leagues (name, owner_id, invite_code)
             VALUES (?, ?, ?)`,
            [name, ownerId, inviteCode]
        )

        await db.run(
            `INSERT INTO league_members (league_id, user_id)
             VALUES (?, ?)`,
            [result.lastID, ownerId]
        )

        await db.run(
            `UPDATE users
             SET favorite_league_id = COALESCE(favorite_league_id, ?)
             WHERE id = ?`,
            [result.lastID, ownerId]
        )

        await db.exec('COMMIT')
        transactionOpen = false

        return res.status(201).json({
            league: {
                id: result.lastID,
                name,
                inviteCode
            }
        })
    } catch (err) {
        if (db && transactionOpen) {
            await rollbackQuietly(db)
        }

        console.error('League creation error:', err)

        return res.status(500).json({
            error: 'Failed to create league'
        })
    } finally {
        if (db) {
            await db.close()
        }
    }
}

export async function getMyLeagues(req, res) {
    const userId = req.session.userId
    let db

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

                (
                    SELECT COUNT(*)
                    FROM league_members AS counted_members
                    WHERE counted_members.league_id = l.id
                ) AS member_count,

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

             ORDER BY
                is_favorite DESC,
                lm.joined_at ASC`,
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
    const userId = parsePositiveInteger(req.session.userId)
    const rawInviteCode = sanitizePlainText(req.body?.inviteCode)
    let db
    let transactionOpen = false

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (rawInviteCode === null) {
        return res.status(400).json({
            error: 'Invite code must be a string'
        })
    }

    const inviteCode = rawInviteCode.toUpperCase()

    if (!INVITE_CODE_PATTERN.test(inviteCode)) {
        return res.status(400).json({
            error: 'Invalid invite code'
        })
    }

    try {
        db = await getDBConnection()

        const league = await db.get(
            `SELECT id, name, invite_code
             FROM leagues
             WHERE invite_code = ?`,
            [inviteCode]
        )

        if (!league) {
            return res.status(404).json({
                error: 'League not found'
            })
        }

        await db.exec('BEGIN IMMEDIATE TRANSACTION')
        transactionOpen = true

        const existingMember = await db.get(
            `SELECT id
             FROM league_members
             WHERE league_id = ? AND user_id = ?`,
            [league.id, userId]
        )

        if (existingMember) {
            await db.exec('ROLLBACK')
            transactionOpen = false

            return res.status(409).json({
                error: 'User is already a member of this league',
                league
            })
        }

        await db.run(
            `INSERT INTO league_members (league_id, user_id)
             VALUES (?, ?)`,
            [league.id, userId]
        )

        await db.run(
            `UPDATE users
             SET favorite_league_id = COALESCE(favorite_league_id, ?)
             WHERE id = ?`,
            [league.id, userId]
        )

        await db.exec('COMMIT')
        transactionOpen = false

        return res.status(201).json({
            message: 'League joined successfully',
            league
        })
    } catch (err) {
        if (db && transactionOpen) {
            await rollbackQuietly(db)
        }

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
    const leagueId = parsePositiveInteger(req.params.leagueId)
    const userId = parsePositiveInteger(req.session.userId)
    let db

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!leagueId) {
        return res.status(400).json({
            error: 'Valid league ID is required'
        })
    }

    try {
        db = await getDBConnection()

        const membership = await db.get(
            `SELECT l.id, l.name
             FROM leagues AS l
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

        const standings = await db.all(
            `SELECT
                u.id AS user_id,
                u.name,
                0 AS points,
                lm.joined_at
             FROM league_members AS lm
             JOIN users AS u
               ON u.id = lm.user_id
             WHERE lm.league_id = ?
             ORDER BY points DESC, lm.joined_at ASC`,
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

export async function setFavoriteLeague(req, res) {
    const userId = parsePositiveInteger(req.session.userId)
    const leagueId = parsePositiveInteger(req.body?.leagueId)
    let db

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!leagueId) {
        return res.status(400).json({
            error: 'Valid league ID is required'
        })
    }

    try {
        db = await getDBConnection()

        const membership = await db.get(
            `SELECT id
             FROM league_members
             WHERE league_id = ? AND user_id = ?`,
            [leagueId, userId]
        )

        if (!membership) {
            return res.status(403).json({
                error: 'You are not a member of this league'
            })
        }

        await db.run(
            `UPDATE users
             SET favorite_league_id = ?
             WHERE id = ?`,
            [leagueId, userId]
        )

        return res.json({
            message: 'Favorite league updated',
            leagueId
        })
    } catch (err) {
        console.error('Set favorite league error:', err)

        return res.status(500).json({
            error: 'Failed to update favorite league'
        })
    } finally {
        if (db) {
            await db.close()
        }
    }
}
