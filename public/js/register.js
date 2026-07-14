const registerForm = document.getElementById('register-form')
const formMessage = document.getElementById('form-message')

registerForm.addEventListener('submit', registerUser)

async function registerUser(e) {
    e.preventDefault()
    formMessage.textContent = ''

    const name = document.getElementById('name').value
    const username = document.getElementById('username').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const passwordRepeat = document.getElementById('password-repeat').value

    if (password !== passwordRepeat) {
        formMessage.textContent = 'הסיסמאות אינן תואמות'
        return
    }

    try {
        const res = await fetch("/api/auth/register", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                username,
                email,
                password
            })
        })
    
        const data = await res.json()

    if (!res.ok) {
        formMessage.textContent = data.error
        return
    }    

    formMessage.textContent = 'ההרשמה הושלמה בהצלחה. מעביר אותך להתחברות'

    setTimeout(() => {
        window.location.href = '/login.html'
    }, 1500)

    } catch(err){
        console.error(err)
        formMessage.textContent = 'אירעה שגיאה. נסה שוב מאוחר יותר'
    }
}