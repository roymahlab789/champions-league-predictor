const userGreeting = document.getElementById('user-greeting')
const logoutBtn = document.getElementById('logout-btn')


async function loadCurrentUser() {

    try {
        const res = await fetch('/api/auth/me', {
            method: 'GET',
            headers:{'Content-Type': 'application/json'},
        })

        const data = await res.json()

        if (!res.ok) {
            window.location.href = '/login.html'
            return
        }

        

         userGreeting.textContent = `שלום, ${data.name}`
    } catch (err) {
        console.error(err)
    }
    
}

loadCurrentUser()

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