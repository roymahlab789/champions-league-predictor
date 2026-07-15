import express from 'express'
import { getCurrentTournament } from '../controllers/tournamentsController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const tournamentRouter = express.Router()

tournamentRouter.get('/current', requireAuth, getCurrentTournament)