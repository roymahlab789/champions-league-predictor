// Global elements
const userGreeting = document.getElementById('user-greeting')
const userAvatar = document.getElementById('user-avatar')
const tournamentName = document.getElementById('tournament-name')
const tournamentStatus = document.getElementById('tournament-status')
const logoutBtn = document.getElementById('logout-btn')
const leaguesList = document.getElementById('leagues-list')
const createLeagueForm = document.getElementById('create-league-form')
const leagueNameInput = document.getElementById('league-name')
const createLeagueMessage = document.getElementById('create-league-message')
const openCreateLeagueModalBtn = document.getElementById('open-create-league-modal')
const closeCreateLeagueModalBtn = document.getElementById('close-create-league-modal')
const createLeagueModal = document.getElementById('create-league-modal')
const modalBackdrop = createLeagueModal.querySelector('[data-close-modal]')

// Event listeners
logoutBtn.addEventListener('click', logoutUser)
createLeagueForm.addEventListener('submit', createLeague)
openCreateLeagueModalBtn.addEventListener('click', openCreateLeagueModal)
closeCreateLeagueModalBtn.addEventListener('click', closeCreateLeagueModal)
modalBackdrop.addEventListener('click', closeCreateLeagueModal)

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !createLeagueModal.hidden) {
        closeCreateLeagueModal()
    }
})

loadCurrentUser()

async function loadCurrentUser() {
    try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (!res.ok) {
            window.location.href = '/login.html'
            return
        }

        const displayName = data.name.trim()

        userGreeting.textContent = displayName
        userAvatar.textContent = getInitial(displayName)

        await Promise.all([
            loadCurrentTournament(),
            loadMyLeagues()
        ])
    } catch (err) {
        console.error('Load user error:', err)
    }
}

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

async function loadCurrentTournament() {
    try {
        const res = await fetch('/api/tournaments/current')
        const data = await res.json()

        if (!res.ok) {
            tournamentName.textContent = 'לא ניתן לטעון את הטורניר'
            console.error(data.error)
            return
        }

        tournamentName.textContent = `${data.tournament.name} ${data.tournament.season}`

        const statusTranslation = {
            upcoming: 'טרם התחיל',
            active: 'פעיל',
            completed: 'הסתיים'
        }

        const translatedStatus = statusTranslation[data.tournament.status] || data.tournament.status
        tournamentStatus.textContent = translatedStatus
        tournamentStatus.dataset.status = data.tournament.status
    } catch (err) {
        console.error('Load tournament error:', err)
        tournamentName.textContent = 'לא ניתן לטעון את הטורניר'
    }
}

async function loadMyLeagues() {
    try {
        const res = await fetch('/api/leagues')
        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            leaguesList.innerHTML = '<p class="empty-state">לא ניתן לטעון את הליגות</p>'
            return
        }

        if (data.leagues.length === 0) {
            leaguesList.innerHTML = `
                <div class="empty-state-card">
                    <strong>עדיין אין לך ליגה</strong>
                    <span>צור ליגה חדשה והזמן אליה חברים.</span>
                </div>
            `
            return
        }

        leaguesList.innerHTML = data.leagues.map(league => {
            const leagueName = escapeHtml(league.name)
            const initial = escapeHtml(getInitial(league.name))
            const memberCount = Number(league.member_count || 0)

            return `
                <a
                    class="league-card ${league.is_favorite ? 'favorite' : ''}"
                    href="/leaderboard.html?leagueId=${league.id}"
                >
                    <span class="league-avatar">${initial}</span>

                    <span class="league-card-copy">
                        <strong dir="auto">${leagueName}</strong>
                        <small>${formatMemberCount(memberCount)}</small>
                    </span>

                    <span class="league-card-meta">
                        ${league.is_favorite ? '<span class="favorite-star" title="ליגה ראשית">★</span>' : ''}
                        <span class="league-arrow" aria-hidden="true">‹</span>
                    </span>
                </a>
            `
        }).join('')
    } catch (err) {
        console.error('Load leagues error:', err)
        leaguesList.innerHTML = '<p class="empty-state">לא ניתן לטעון את הליגות</p>'
    }
}

async function createLeague(event) {
    event.preventDefault()

    const name = leagueNameInput.value.trim()

    try {
        createLeagueMessage.textContent = 'יוצר את הליגה...'

        const res = await fetch('/api/leagues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        })

        const data = await res.json()

        if (!res.ok) {
            createLeagueMessage.textContent = translateLeagueError(data.error)
            return
        }

        createLeagueMessage.textContent = 'הליגה נוצרה בהצלחה'
        leagueNameInput.value = ''

        await loadMyLeagues()

        setTimeout(() => {
            closeCreateLeagueModal()
        }, 700)
    } catch (err) {
        console.error('Create league error:', err)
        createLeagueMessage.textContent = 'יצירת הליגה נכשלה'
    }
}

function openCreateLeagueModal() {
    createLeagueMessage.textContent = ''
    createLeagueModal.hidden = false
    document.body.classList.add('modal-open')
    leagueNameInput.focus()
}

function closeCreateLeagueModal() {
    createLeagueModal.hidden = true
    document.body.classList.remove('modal-open')
    createLeagueForm.reset()
    createLeagueMessage.textContent = ''
}

function getInitial(value) {
    const cleanValue = String(value || '').trim()
    return cleanValue ? cleanValue.charAt(0).toUpperCase() : '?'
}

function formatMemberCount(count) {
    if (count === 1) return 'חבר אחד'
    return `${count} חברים`
}

function translateLeagueError(errorMessage) {
    const translations = {
        'League name is required': 'יש להזין שם לליגה',
        'League name cannot contain only spaces': 'שם הליגה אינו יכול להכיל רווחים בלבד',
        'League name cannot exceed 50 characters': 'שם הליגה יכול להכיל עד 50 תווים'
    }

    return translations[errorMessage] || errorMessage || 'יצירת הליגה נכשלה'
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, character => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }

        return entities[character]
    })
}
