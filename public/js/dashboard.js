// global variables
const userGreeting = document.getElementById('user-greeting')
const tournamentName = document.getElementById('tournament-name')
const tournamentStatus = document.getElementById('tournament-status')
const logoutBtn = document.getElementById('logout-btn')
const leaguesList = document.getElementById('leagues-list')
const createLeagueForm = document.getElementById('create-league-form')
const leagueNameInput = document.getElementById('league-name')
const createLeagueMessage = document.getElementById('create-league-message')


// event listeners
logoutBtn.addEventListener('click', logoutUser)
createLeagueForm.addEventListener('submit', createLeague)


// user login logic
async function loadCurrentUser() {

    try {
        const res = await fetch('/api/auth/me')

        const data = await res.json()

        if (!res.ok) {
            window.location.href = '/login.html'
            return
        }

        

         userGreeting.textContent = `שלום, ${data.name}`
         loadCurrentTournament()
         loadMyLeagues()
    } catch (err) {
        console.error(err)
    }
    
}

loadCurrentUser()


// logout button logic
async function logoutUser() {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'DELETE' 
        })

        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            return
        }

        window.location.href = '/login.html'
    } catch (err) {
        console.error('Logout error:', err)
    }
}

// displaying tournament details

async function loadCurrentTournament() {
    try {
        const res = await fetch('/api/tournaments/current')

        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            return
        }
       
        tournamentName.textContent = `${data.tournament.name} ${data.tournament.season}`

         const statusTranslation = {
             upcoming: 'טרם התחיל',
             active: 'פעיל',
             completed: 'הסתיים'
        }

        tournamentStatus.textContent = statusTranslation[data.tournament.status] || data.tournament.status
    } catch (err) {
        console.error(err)
    }
}
// load user's leagues
async function loadMyLeagues() {
    try {
        const res = await fetch('/api/leagues')
        
        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            leaguesList.innerHTML = '<p>לא ניתן לטעון את הליגות</p>'
            return
        }

        if (data.leagues.length === 0) {
            leaguesList.innerHTML = `<p>עדיין לא הצטרפת לליגה</p>`
            return
        }

        leaguesList.innerHTML = data.leagues.map(league => {
            return `
            <a 
            class="league-card"
            href="/leaderboard.html?leagueId=${league.id}">
                <h3>${league.name}</h3>
                ${
                    league.is_favorite
                    ? '<p>ליגה מועדפת</p>'
                    : ''
                }
            </a>
            `
        }).join('')
    } catch(err) {
        console.error('Load leagues error:', err)
        leaguesList.innerHTML = '<p>לא ניתן לטעון את הליגות</p>'
    }
}

async function createLeague(e) {
    e.preventDefault()

    const name = leagueNameInput.value.trim()

    try {
        const res = await fetch('/api/leagues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        })

        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            createLeagueMessage.textContent = data.error
            return
        }

        createLeagueMessage.textContent = 'הליגה נוצרה בהצלחה'
        leagueNameInput.value = ''

        loadMyLeagues()
    } catch (err) {
        console.error('Create league error:', err)
        createLeagueMessage.textContent = 'יצירת ליגה נכשלה'
    }
}

