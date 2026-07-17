import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import express from 'express'
import { authRouter } from './routes/authRouter.js'
import { meRouter } from './routes/meRouter.js'
import { tournamentRouter } from './routes/tournamentsRouter.js'
import { leaguesRouter } from './routes/leaguesRouter.js'
import session from 'express-session'
import 'dotenv/config'



const PORT = 8000

const app = express()

app.use(helmet())

app.use(express.json({
    limit: '10kb'
}))

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please try again later.'
    }
})

app.use('/api', apiLimiter)

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

app.use('/api/auth', meRouter)

app.use('/api/tournaments',tournamentRouter)

app.use('/api/leagues', leaguesRouter)


app.listen(PORT, ()=> console.log(`Server connected on port ${PORT}`))