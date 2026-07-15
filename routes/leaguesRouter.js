import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { createLeague } from '../controllers/leaguesController.js'

export const leaguesRouter = express.Router()

leaguesRouter.post('/', requireAuth, createLeague)