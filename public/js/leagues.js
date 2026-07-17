const leaguesList = document.getElementById('leagues-list')
const leaguesCount = document.getElementById('leagues-count')
const leaguesMessage = document.getElementById('leagues-message')

let userLeagues = []

loadLeagues()

async function loadLeagues() {
    leaguesMessage.textContent = ''

    try {
        const res = await fetch('/api/leagues')
        const data = await res.json()

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href =
                    `/login.html?redirect=${encodeURIComponent(window.location.href)}`
                return
            }

            throw new Error(data.error || 'Failed to load leagues')
        }

        userLeagues = data.leagues
        renderLeagues()
    } catch (err) {
        console.error('Load leagues error:', err)

        leaguesCount.textContent = ''
        leaguesList.replaceChildren(
            createMessageCard('לא ניתן לטעון את הליגות')
        )
    }
}

function renderLeagues() {
    leaguesList.replaceChildren()

    leaguesCount.textContent = `${userLeagues.length} ליגות`

    if (userLeagues.length === 0) {
        leaguesList.append(
            createMessageCard('עדיין לא הצטרפת לליגה')
        )

        return
    }

    userLeagues.forEach(league => {
        leaguesList.append(createLeagueCard(league))
    })
}

function createLeagueCard(league) {
    const card = document.createElement('article')
    card.className = 'league-management-card'

    if (league.is_favorite) {
        card.classList.add('favorite-league-card')
    }

    const header = document.createElement('div')
    header.className = 'league-management-header'

    const identity = document.createElement('div')
    identity.className = 'league-identity'

    const avatar = document.createElement('span')
    avatar.className = 'league-avatar'
    avatar.setAttribute('aria-hidden', 'true')
    avatar.textContent = getLeagueInitial(league.name)

    const titleContainer = document.createElement('div')
    titleContainer.className = 'league-title-container'

    const title = document.createElement('h2')
    title.className = 'league-management-title'
    title.dir = 'auto'
    title.textContent = league.name

    const memberCount = document.createElement('p')
    memberCount.className = 'league-member-count'

    const totalMembers = Number(league.member_count) || 0

    memberCount.textContent =
        totalMembers === 1
            ? 'משתתף אחד'
            : `${totalMembers} משתתפים`

    titleContainer.append(title, memberCount)
    identity.append(avatar, titleContainer)
    header.append(identity)

    if (league.is_favorite) {
        const favoriteBadge = document.createElement('span')
        favoriteBadge.className = 'favorite-league-badge'
        favoriteBadge.textContent = 'ליגה ראשית'

        header.append(favoriteBadge)
    }

    const description = document.createElement('p')
    description.className = 'league-management-description'

    description.textContent = league.is_favorite
        ? 'ליגה זו מוצגת ראשונה ונבחרת כברירת המחדל.'
        : 'ניתן לפתוח את הדירוג, להזמין חברים או להגדיר כליגה ראשית.'

    const actions = document.createElement('div')
    actions.className = 'league-management-actions'

    const leaderboardLink = document.createElement('a')
    leaderboardLink.className = 'league-action league-action-primary'
    leaderboardLink.href =
        `/leaderboard.html?leagueId=${encodeURIComponent(league.id)}`
    leaderboardLink.textContent = 'פתיחת הטבלה'

    const inviteButton = document.createElement('button')
    inviteButton.className = 'league-action'
    inviteButton.type = 'button'
    inviteButton.textContent = 'הזמנת חברים'

    inviteButton.addEventListener('click', () => {
        shareLeagueInvite(league)
    })

    actions.append(leaderboardLink, inviteButton)

    if (!league.is_favorite) {
        const favoriteButton = document.createElement('button')
        favoriteButton.className = 'league-action'
        favoriteButton.type = 'button'
        favoriteButton.textContent = 'הגדרה כליגה ראשית'

        favoriteButton.addEventListener('click', () => {
            setFavoriteLeague(league.id, favoriteButton)
        })

        actions.append(favoriteButton)
    }

    card.append(header, description, actions)

    return card
}

function createMessageCard(message) {
    const card = document.createElement('article')
    card.className = 'empty-state'

    const text = document.createElement('p')
    text.textContent = message

    card.append(text)

    return card
}

function getLeagueInitial(name) {
    const normalizedName =
        typeof name === 'string'
            ? name.trim()
            : ''

    return normalizedName.charAt(0).toUpperCase() || 'CL'
}

async function setFavoriteLeague(leagueId, button) {
    leaguesMessage.textContent = ''
    button.disabled = true

    try {
        const res = await fetch('/api/leagues/favorite', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leagueId
            })
        })

        const data = await res.json()

        if (!res.ok) {
            throw new Error(
                data.error || 'Failed to update favorite league'
            )
        }

        leaguesMessage.textContent =
            'הליגה הוגדרה כליגה הראשית'

        await loadLeagues()
    } catch (err) {
        console.error('Set favorite league error:', err)

        leaguesMessage.textContent =
            'לא ניתן לעדכן את הליגה הראשית'

        button.disabled = false
    }
}

async function shareLeagueInvite(league) {
    leaguesMessage.textContent = ''

    const inviteLink =
        `${window.location.origin}/join-league.html?code=${encodeURIComponent(league.invite_code)}`

    try {
        if (navigator.share) {
            await navigator.share({
                title: `הזמנה לליגת ${league.name}`,
                text: `הצטרפו לליגה שלי: ${league.name}`,
                url: inviteLink
            })

            leaguesMessage.textContent =
                'ההזמנה שותפה בהצלחה'

            return
        }

        await copyInviteLink(inviteLink)

        leaguesMessage.textContent =
            'קישור ההזמנה הועתק'
    } catch (err) {
        if (err.name === 'AbortError') {
            return
        }

        console.error('Share league invitation error:', err)

        leaguesMessage.textContent =
            'לא ניתן לשתף את ההזמנה'
    }
}

async function copyInviteLink(inviteLink) {
    if (!navigator.clipboard) {
        throw new Error('Clipboard API is not supported')
    }

    await navigator.clipboard.writeText(inviteLink)
}