const loginForm = document.getElementById('login-form')
const formMessage = document.getElementById('form-message')

loginForm.addEventListener('submit', loginUser)

async function loginUser(e) {
    e.preventDefault()

    formMessage.textContent = ''
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value

    if (!password || !username) {
        formMessage.textContent = 'יש למלא שם משתמש וסיסמה'
        return
    }

    try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers:{
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password
          })
        })

        const data = await res.json()

        if (!res.ok) {

                if (res.status === 401) {
                    formMessage.textContent =  'שם המשתמש או הסיסמה אינם נכונים, אנא נסה שנית'
                } else {
                    formMessage.textContent = data.error
                }
            return
        }

        formMessage.textContent = 'ההתחברות בוצעה בהצלחה מעביר אותך לדף הבית'

        setTimeout(() => {
            window.location.href ='/dashboard.html'
        }, 1500)
    } catch (err) {
        console.error(err)
        formMessage.textContent = 'אירעה שגיאה. נסה שוב מאוחר יותר'
    }

}