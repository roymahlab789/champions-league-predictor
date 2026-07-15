const userGreeting = document.getElementById('user-greeting')
const tournamentName = document.getElementById('tournament-name')
const tournamentStatus = document.getElementById('tournament-status')
const logoutBtn = document.getElementById('logout-btn')


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
    } catch (err) {
        console.error(err)
    }
    
}

loadCurrentUser()

// logout button logic
logoutBtn.addEventListener('click', logoutUser)

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

