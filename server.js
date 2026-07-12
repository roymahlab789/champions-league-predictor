import express from 'express'
import { authRouter } from './routes/authRouter.js'
import session from 'express-session'
import'dotenv/config'


const PORT = 8000

const app = express()

app.use(express.json())

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}))

app.use(express.static('public'))

app.use('/api/auth', authRouter)


app.listen(PORT, ()=> console.log(`Server connected on port ${PORT}`))