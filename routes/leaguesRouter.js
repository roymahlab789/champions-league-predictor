import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { createLeague,
    getLeagueLeaderboard,
    getMyLeagues,
    joinLeague,
    setFavoriteLeague 
} from '../controllers/leaguesController.js'

export const leaguesRouter = express.Router()

leaguesRouter.post('/', requireAuth, createLeague)
leaguesRouter.get('/', requireAuth, getMyLeagues)
leaguesRouter.post('/join',requireAuth, joinLeague)
leaguesRouter.get('/:leagueId/leaderboard', requireAuth, getLeagueLeaderboard)
leaguesRouter.patch('/favorite', requireAuth, setFavoriteLeague)