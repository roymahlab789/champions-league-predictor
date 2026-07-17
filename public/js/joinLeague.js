const joinMessage = document.getElementById('join-message')
const confirmJoinBtn = document.getElementById('confirm-join-btn')
const params = new URLSearchParams(window.location.search)
const inviteCode = normalizeInviteCode(params.get('code'))

confirmJoinBtn.addEventListener('click', joinLeague)

if (!inviteCode) {
    joinMessage.textContent = 'קישור ההזמנה אינו תקין'
    confirmJoinBtn.disabled = true
} else {
    joinMessage.textContent = 'הוזמנת להצטרף לליגה פרטית במשחק הניחושים.'
}

async function joinLeague() {
    if (!inviteCode) {
        return
    }

    confirmJoinBtn.disabled = true
    joinMessage.textContent = 'מצטרף לליגה...'

    try {
        const { res, data } = await fetchJson('/api/leagues/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inviteCode })
        })

        if (!res.ok) {
            if (res.status === 401) {
                const returnPath = `${window.location.pathname}${window.location.search}`
                window.location.assign(`/login.html?redirect=${encodeURIComponent(returnPath)}`)
                return
            }

            if (res.status === 409) {
                const leagueId = parsePositiveInteger(data.league?.id)

                if (leagueId) {
                    joinMessage.textContent = 'כבר הצטרפת לליגה הזו. מעביר אותך לטבלה...'
                    redirectToLeaderboard(leagueId, 1000)
                    return
                }
            }

            joinMessage.textContent = translateJoinError(res.status, data.error)
            confirmJoinBtn.disabled = false
            return
        }

        const leagueId = parsePositiveInteger(data.league?.id)

        if (!leagueId) {
            throw new Error('The server returned an invalid league ID')
        }

        joinMessage.textContent = 'הצטרפת לליגה בהצלחה. מעביר אותך לטבלה...'
        redirectToLeaderboard(leagueId, 1200)
    } catch (err) {
        console.error('Join league error:', err)
        joinMessage.textContent = 'ההצטרפות לליגה נכשלה'
        confirmJoinBtn.disabled = false
    }
}

function normalizeInviteCode(value) {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value
        .normalize('NFKC')
        .trim()
        .toUpperCase()

    return /^[A-F0-9]{6,64}$/.test(normalized)
        ? normalized
        : null
}

function redirectToLeaderboard(leagueId, delay) {
    const url = new URL('/leaderboard.html', window.location.origin)
    url.searchParams.set('leagueId', String(leagueId))

    window.setTimeout(() => {
        window.location.assign(`${url.pathname}${url.search}`)
    }, delay)
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.headers || {})
        }
    })

    const data = await res.json().catch(() => ({}))
    return { res, data }
}

function parsePositiveInteger(value) {
    const number = Number(value)
    return Number.isSafeInteger(number) && number > 0 ? number : null
}

function translateJoinError(status, errorMessage) {
    const statusMessages = {
        400: 'קישור ההזמנה אינו תקין',
        404: 'קישור ההזמנה אינו תקין או שהליגה אינה קיימת',
        409: 'כבר הצטרפת לליגה הזו',
        415: 'הבקשה אינה תקינה'
    }

    return statusMessages[status] || errorMessage || 'ההצטרפות לליגה נכשלה'
}
