const leagueSelect = document.getElementById('league-select')
const inviteFriendsBtn = document.getElementById('invite-friends-btn')
const inviteMessage = document.getElementById('invite-message')
const favoriteLeagueBtn = document.getElementById('favorite-league-btn')
const favoriteMessage = document.getElementById('favorite-message')
const leaderboardTitle = document.getElementById('leaderboard-title')
const leaderboardList = document.getElementById('leaderboard-list')

const INVITE_CODE_PATTERN = /^[A-F0-9]{6,64}$/
let userLeagues = []

inviteFriendsBtn.addEventListener('click', shareInviteLink)
favoriteLeagueBtn.addEventListener('click', setFavoriteLeague)
leagueSelect.addEventListener('change', handleLeagueChange)

loadLeagueOptions()

async function loadLeagueOptions() {
    try {
        const { res, data } = await fetchJson('/api/leagues')

        if (!res.ok) {
            if (res.status === 401) {
                redirectToLogin()
                return
            }

            console.error(data.error)
            showLeaderboardMessage('לא ניתן לטעון את הליגות')
            return
        }

        userLeagues = Array.isArray(data.leagues)
            ? data.leagues
                .map(normalizeLeague)
                .filter(Boolean)
            : []

        if (userLeagues.length === 0) {
            renderNoLeaguesState()
            return
        }

        inviteFriendsBtn.disabled = false
        renderLeagueOptions()

        const params = new URLSearchParams(window.location.search)
        const leagueIdFromUrl = parsePositiveInteger(params.get('leagueId'))
        const requestedLeagueExists = userLeagues.some(league => {
            return league.id === leagueIdFromUrl
        })

        leagueSelect.value = String(
            requestedLeagueExists
                ? leagueIdFromUrl
                : userLeagues[0].id
        )

        updateUrl(leagueSelect.value)
        updateFavoriteButton()
        await loadLeaderboard(leagueSelect.value)
    } catch (err) {
        console.error('Load league options error:', err)
        showLeaderboardMessage('לא ניתן לטעון את הליגות')
    }
}

async function handleLeagueChange() {
    const leagueId = parsePositiveInteger(leagueSelect.value)

    inviteMessage.textContent = ''
    favoriteMessage.textContent = ''

    if (!leagueId) {
        showLeaderboardMessage('לא נבחרה ליגה')
        return
    }

    updateUrl(leagueId)
    updateFavoriteButton()
    await loadLeaderboard(leagueId)
}

async function shareInviteLink() {
    const selectedLeague = getSelectedLeague()

    if (!selectedLeague) {
        inviteMessage.textContent = 'לא נבחרה ליגה'
        return
    }

    if (!INVITE_CODE_PATTERN.test(selectedLeague.inviteCode)) {
        inviteMessage.textContent = 'לא ניתן ליצור קישור הזמנה לליגה הזו'
        return
    }

    const inviteUrl = new URL('/join-league.html', window.location.origin)
    inviteUrl.searchParams.set('code', selectedLeague.inviteCode)

    const shareData = {
        title: `הזמנה לליגת ${selectedLeague.name}`,
        text: `הצטרפו לליגה שלי: ${selectedLeague.name}`,
        url: inviteUrl.href
    }

    try {
        const canUseNativeShare = typeof navigator.share === 'function' &&
            (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))

        if (canUseNativeShare) {
            await navigator.share(shareData)
            inviteMessage.textContent = 'ההזמנה שותפה בהצלחה'
            return
        }

        if (!navigator.clipboard?.writeText) {
            throw new Error('Clipboard API is not available')
        }

        await navigator.clipboard.writeText(inviteUrl.href)
        inviteMessage.textContent = 'קישור ההזמנה הועתק'
    } catch (err) {
        if (err.name === 'AbortError') {
            return
        }

        console.error('Share invitation error:', err)
        inviteMessage.textContent = 'לא ניתן לשתף את ההזמנה'
    }
}

async function setFavoriteLeague() {
    const selectedLeague = getSelectedLeague()

    if (!selectedLeague) {
        favoriteMessage.textContent = 'לא נבחרה ליגה'
        return
    }

    favoriteLeagueBtn.disabled = true
    favoriteMessage.textContent = 'מעדכן ליגה ראשית...'

    try {
        const { res, data } = await fetchJson('/api/leagues/favorite', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leagueId: selectedLeague.id
            })
        })

        if (!res.ok) {
            favoriteMessage.textContent = translateFavoriteError(data.error)
            favoriteLeagueBtn.disabled = false
            return
        }

        userLeagues = userLeagues.map(league => ({
            ...league,
            isFavorite: league.id === selectedLeague.id
        }))

        favoriteMessage.textContent = 'הליגה הוגדרה כליגה הראשית'
        updateFavoriteButton()
    } catch (err) {
        console.error('Set favorite league error:', err)
        favoriteMessage.textContent = 'לא ניתן לעדכן את הליגה הראשית'
        favoriteLeagueBtn.disabled = false
    }
}

async function loadLeaderboard(leagueIdValue) {
    const leagueId = parsePositiveInteger(leagueIdValue)

    if (!leagueId) {
        showLeaderboardMessage('לא נבחרה ליגה')
        return
    }

    showLeaderboardMessage('טוען טבלת דירוג...')

    try {
        const { res, data } = await fetchJson(`/api/leagues/${leagueId}/leaderboard`)

        if (!res.ok) {
            if (res.status === 401) {
                redirectToLogin()
                return
            }

            showLeaderboardMessage(translateLeaderboardError(data.error))
            return
        }

        const leagueName = normalizeDisplayText(data.league?.name) || 'טבלת דירוג'
        const standings = Array.isArray(data.standings)
            ? data.standings
            : []

        leaderboardTitle.textContent = leagueName

        if (standings.length === 0) {
            showLeaderboardMessage('אין עדיין חברים בליגה')
            return
        }

        const fragment = document.createDocumentFragment()

        standings.forEach((member, index) => {
            fragment.append(createLeaderboardRow(member, index + 1))
        })

        leaderboardList.replaceChildren(fragment)
    } catch (err) {
        console.error('Load leaderboard error:', err)
        showLeaderboardMessage('לא ניתן לטעון את טבלת הדירוג')
    }
}

function createLeaderboardRow(member, rank) {
    const name = normalizeDisplayText(member?.name) || 'משתמש'
    const points = parseNonNegativeInteger(member?.points)

    const row = document.createElement('article')
    row.className = 'leaderboard-row'

    const rankNumber = document.createElement('span')
    rankNumber.className = 'rank-number'
    rankNumber.textContent = String(rank)

    const memberCell = document.createElement('span')
    memberCell.className = 'member-cell'

    const avatar = document.createElement('span')
    avatar.className = 'member-avatar'
    avatar.textContent = getInitial(name)

    const memberName = document.createElement('span')
    memberName.className = 'member-name'
    memberName.dir = 'auto'
    memberName.textContent = name

    memberCell.append(avatar, memberName)

    const memberPoints = document.createElement('strong')
    memberPoints.className = 'member-points'
    memberPoints.textContent = String(points)

    row.append(rankNumber, memberCell, memberPoints)
    return row
}

function renderLeagueOptions() {
    const fragment = document.createDocumentFragment()

    userLeagues.forEach(league => {
        const option = document.createElement('option')
        option.value = String(league.id)
        option.textContent = league.name
        fragment.append(option)
    })

    leagueSelect.replaceChildren(fragment)
}

function renderNoLeaguesState() {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = 'אין ליגות'
    leagueSelect.replaceChildren(option)

    leaderboardTitle.textContent = 'טבלת דירוג'
    showLeaderboardMessage('עדיין לא הצטרפת לליגה')
    inviteFriendsBtn.disabled = true
    favoriteLeagueBtn.disabled = true
}

function showLeaderboardMessage(message) {
    const paragraph = document.createElement('p')
    paragraph.className = 'empty-state'
    paragraph.textContent = message
    leaderboardList.replaceChildren(paragraph)
}

function updateFavoriteButton() {
    const selectedLeague = getSelectedLeague()

    favoriteLeagueBtn.classList.remove('selected-favorite')

    if (!selectedLeague) {
        favoriteLeagueBtn.disabled = true
        favoriteLeagueBtn.textContent = '☆ הגדרה כליגה ראשית'
        return
    }

    if (selectedLeague.isFavorite) {
        favoriteLeagueBtn.disabled = true
        favoriteLeagueBtn.classList.add('selected-favorite')
        favoriteLeagueBtn.textContent = '★ הליגה הראשית'
        return
    }

    favoriteLeagueBtn.disabled = false
    favoriteLeagueBtn.textContent = '☆ הגדרה כליגה ראשית'
}

function getSelectedLeague() {
    const selectedLeagueId = parsePositiveInteger(leagueSelect.value)

    if (!selectedLeagueId) {
        return null
    }

    return userLeagues.find(league => {
        return league.id === selectedLeagueId
    }) || null
}

function normalizeLeague(league) {
    const id = parsePositiveInteger(league?.id)
    const name = normalizeDisplayText(league?.name)
    const inviteCode = typeof league?.invite_code === 'string'
        ? league.invite_code.trim().toUpperCase()
        : ''

    if (!id || !name) {
        return null
    }

    return {
        id,
        name,
        inviteCode,
        isFavorite: Boolean(league.is_favorite)
    }
}

function updateUrl(leagueIdValue) {
    const leagueId = parsePositiveInteger(leagueIdValue)

    if (!leagueId) {
        return
    }

    const url = new URL(window.location.href)
    url.searchParams.set('leagueId', String(leagueId))
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

function redirectToLogin() {
    const returnPath = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/login.html?redirect=${encodeURIComponent(returnPath)}`)
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

function sanitizePlainText(value) {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/\s+/gu, ' ')
        .trim()
}

function normalizeDisplayText(value) {
    return sanitizePlainText(typeof value === 'string' ? value : '')
}

function parsePositiveInteger(value) {
    const number = Number(value)
    return Number.isSafeInteger(number) && number > 0 ? number : null
}

function parseNonNegativeInteger(value) {
    const number = Number(value)
    return Number.isSafeInteger(number) && number >= 0 ? number : 0
}

function getInitial(value) {
    const cleanValue = normalizeDisplayText(value)
    return cleanValue ? Array.from(cleanValue)[0].toUpperCase() : '?'
}

function translateFavoriteError(errorMessage) {
    const translations = {
        'Valid league ID is required': 'הליגה שנבחרה אינה תקינה',
        'You are not a member of this league': 'אינך חבר בליגה הזו',
        'Content-Type must be application/json': 'הבקשה אינה תקינה'
    }

    return translations[errorMessage] || 'לא ניתן לעדכן את הליגה הראשית'
}

function translateLeaderboardError(errorMessage) {
    const translations = {
        'Valid league ID is required': 'הליגה שנבחרה אינה תקינה',
        'You are not a member of this league': 'אינך חבר בליגה הזו'
    }

    return translations[errorMessage] || 'לא ניתן לטעון את טבלת הדירוג'
}
