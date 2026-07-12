import express from 'express'
import { getCurrentUser } from "../controllers/meController.js"
import { requireAuth } from '../middleware/requireAuth.js'

export const meRouter = express.Router()

meRouter.get('/me', requireAuth, getCurrentUser)