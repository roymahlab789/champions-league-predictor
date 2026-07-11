import express from 'express'
import { authRouter } from './routes/authRouter.js'


const PORT = 8000

const app = express()

app.use(express.json())
app.use(express.static('public'))

app.use('/api/auth', authRouter)


app.listen(PORT, ()=> console.log(`Server connected on port ${PORT}`))