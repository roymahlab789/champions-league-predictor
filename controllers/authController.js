import { getDBConnection } from "../db/db.js";
import validator from 'validator'
import bcrypt from "bcryptjs";

export async function registerUser(req, res) {
    let {name, email, username, password} = req.body

    if (!name || !email || !username || !password) {
        return res.status(400).json({error: 'All fields are required'})
    }
    
    name = name.trim()
    email = email.trim().toLowerCase()
    username = username.trim()

    if (!name || !email || !username || !password.trim()) {
        return res.status(400).json({error: 'fields cannot contain only spaces'})
    }

    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {
        return res.status(400).json({
            error: 'Username must be 1-20 characters, using letters, numbers, _ or -.'
        })
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({error: 'Invalid email format'})

    }
    let db
    try {
         db = await getDBConnection()

        const existing = await db.get(`SELECT id FROM users WHERE email = ? OR username = ?`, [email, username])

        if (existing) {
            return res.status(409).json({
                error: 'Email or username already in use.'
            })
        }

        if (!existing) {
            const hashedPassword = await bcrypt.hash(password, 10)
            await db.run(`
                INSERT INTO users (
                name,
                email,
                username,
                password_hash
                )
                VALUES(?, ?, ?, ?)
                `, [name, email, username, hashedPassword]
            )

            return res.status(201).json({
                message: 'User registered'
            })
        }
    } catch (err) {
        console.error('Registration error:', err.message);
       return res.status(500).json({error: 'Registration failed. Please try again.'})
    } finally {
        if (db) {
            await db.close()
        }
    }
}