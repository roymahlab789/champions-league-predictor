import express from 'express'
import { registerUser } from '../controllers/authController.js'

export const authRouter = express.Router()

authRouter.post('/register', registerUser)