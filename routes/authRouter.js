import express from 'express'
import { loginUser, logoutUser, registerUser } from '../controllers/authController.js'

export const authRouter = express.Router()

authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)
authRouter.delete('/logout', logoutUser)
