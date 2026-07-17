// global variables
const leagueSelect = document.getElementById('league-select')
const inviteFriendsBtn = document.getElementById('invite-friends-btn')
const inviteMessage = document.getElementById('invite-message')
const leaderboardTitle = document.getElementById('leaderboard-title')
const leaderboardList = document.getElementById('leaderboard-list')

// event listeners
inviteFriendsBtn.addEventListener('click', shareInviteLink)
leagueSelect.addEventListener('change', () => {
    const leagueId = leagueSelect.value

    const url = new URL(window.location.href)
    url.searchParams.set('leagueId', leagueId)
    window.history.replaceState({}, '', url)

      loadLeaderboard(leagueId)
})

let userLeagues = []
async function loadLeagueOptions() {
    try {
        const res = await fetch('/api/leagues')
        const data = await res.json()

        if (!res.ok) {
            console.error(data.error)
            
                if (res.status === 401) {
                window.location.href = '/login.html'
            }

            return
        }

        userLeagues = data.leagues

        if (userLeagues.length === 0) {
            leagueSelect.innerHTML = `<option value ="">אין ליגות</option>`
            leaderboardTitle.textContent = 'טבלת דירוג'
            leaderboardList.innerHTML = '<p>עדיין לא הצטרפת לליגה</p>'
            inviteFriendsBtn.disabled = true
            return
        }

        inviteFriendsBtn.disabled = false

        leagueSelect.innerHTML = userLeagues.map(league => {
            return `
                <option value="${league.id}">
                ${league.name}
                </option>
            `
        }).join('')

        const params = new URLSearchParams(window.location.search)
        const leagueIdFromUrl = params.get('leagueId')

        const requestedLeagueExists = userLeagues.some(league => {
            return String(league.id) === leagueIdFromUrl
        })

        if (requestedLeagueExists) {
            leagueSelect.value = leagueIdFromUrl
        } else {
            leagueSelect.value = String(userLeagues[0].id)
        }

        loadLeaderboard(leagueSelect.value)

    } catch (err) {
        console.error('Load league options error:', err)
    }
}
loadLeagueOptions()

async function shareInviteLink() {
    const selectedLeagueId = Number(leagueSelect.value)

    const selectedLeague = userLeagues.find(league => {
        return league.id === selectedLeagueId
    })

    if (!selectedLeague) {
        inviteMessage.textContent = 'לא נבחרה ליגה'
        return
    }

     const inviteLink =
        `${window.location.origin}/join-league.html?code=${encodeURIComponent(selectedLeague.invite_code)}`

    try {
        if (navigator.share) {
            await navigator.share({
                title: `הזמנה לליגת ${selectedLeague.name}`,
                text: `הצטרפו לליגה שלי: ${selectedLeague.name}`,
                url: inviteLink
            })

            inviteMessage.textContent = 'ההזמנה שותפה בהצלחה'
            return
        }

        await navigator.clipboard.writeText(inviteLink)
        inviteMessage.textContent = 'קישור ההזמנה הועתק'
    } catch (err) {
        console.error('Share invitation error:', err)
    }
}

async function loadLeaderboard(leagueId) {
    if (!leagueId) {
        leaderboardList.innerHTML = '<p>לא נבחרה ליגה</p>'
        return
    }

    try {
        const res = await fetch(`/api/leagues/${leagueId}/leaderboard`)
        const data = await res.json()

        if (!res.ok) {
            leaderboardList.innerHTML = `<p>${data.error}</p>`
            return
        }

          leaderboardTitle.textContent = data.league.name

          leaderboardList.innerHTML = data.standings.map((member, index) => {
            return `
                <article class="leaderboard-row">
                    <span>${index + 1}</span>
                    <span class="member-name" dir="auto">${member.name}</span>
                    <span>${member.points} נקודות</span>
                </article>
            `
        }).join('')
        } catch (err) {
            console.error('Load leaderboard error:', err)
            leaderboardList.innerHTML = '<p>לא ניתן למצוא את טבלת הדירוג</p>'
        }
    }

