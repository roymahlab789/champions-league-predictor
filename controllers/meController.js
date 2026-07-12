import { getDBConnection } from "../db/db.js"


export async function getCurrentUser(req, res) {
    let db
    try {

        db = await getDBConnection()
        const user = await db.get('SELECT name FROM users WHERE id = ?', [req.session.userId])

        if(!user) {
            return res.status(401).json({isLoggedIn: false})
        }

        return res.json({isLoggedIn: true, name: user.name})
    }catch (err) {
        console.error('getCurrentUser error:', err)
        return res.status(500).json({error: 'Internal server error'})
    } finally{
        if (db) {
            await db.close()
        }
    }
}
