
// global variables
const joinMessage = document.getElementById('join-message')
const confirmJoinBtn = document.getElementById('confirm-join-btn')
const params = new URLSearchParams(window.location.search)
const inviteCode = params.get('code')

// event listener
confirmJoinBtn.addEventListener('click', joinLeague)

// checking the invite code
if (!inviteCode) {
    joinMessage.textContent = 'קישור הזמנה אינו תקין'
    confirmJoinBtn.disabled = true
} else {
    joinMessage.textContent = 'לחץ כאן להצטרף לליגה'
}

async function joinLeague() {
    try {
        const res = await fetch('/api/leagues/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inviteCode })
        })
        const data = await res.json()

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href =
                `/login.html?redirect=${encodeURIComponent(window.location.href)}`
                return
            }

            joinMessage.textContent = data.error
            return
        }
        joinMessage.textContent = 'הצטרפת לליגה בהצלחה'
        confirmJoinBtn.disabled = true

        setTimeout(() => {
            window.location.href = 
            `/leaderboard.html?leagueId=${data.league.id}`
        }, 1500)

    } catch (err) {
        console.error('Join league error', err)
        joinMessage.textContent = 'הצטרפות לליגה נכשלה'
    }
}

