const loginForm = document.getElementById('login-form')
const formMessage = document.getElementById('form-message')
const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')
const submitButton = loginForm.querySelector('button[type="submit"]')
const params = new URLSearchParams(window.location.search)
const redirectPath = getSafeRedirect(params.get('redirect'))

loginForm.addEventListener('submit', loginUser)

async function loginUser(event) {
    event.preventDefault()

    formMessage.textContent = ''

    const username = sanitizePlainText(usernameInput.value)
    const password = passwordInput.value

    if (!username || !password) {
        formMessage.textContent = 'יש למלא שם משתמש וסיסמה'
        return
    }

    submitButton.disabled = true

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
            formMessage.textContent = res.status === 401
                ? 'שם המשתמש או הסיסמה אינם נכונים, אנא נסה שנית'
                : data.error || 'ההתחברות נכשלה'
            submitButton.disabled = false
            return
        }

        formMessage.textContent = 'ההתחברות בוצעה בהצלחה, מעביר אותך...'

        window.setTimeout(() => {
            window.location.assign(redirectPath || '/dashboard.html')
        }, 1000)
    } catch (err) {
        console.error('Login error:', err)
        formMessage.textContent = 'אירעה שגיאה. נסה שוב מאוחר יותר'
        submitButton.disabled = false
    }
}

function getSafeRedirect(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
        return null
    }

    try {
        const url = new URL(value, window.location.origin)

        if (url.origin !== window.location.origin) {
            return null
        }

        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return null
    }
}

function sanitizePlainText(value) {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .normalize('NFKC')
        .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, '')
        .trim()
}
