import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { reportError } from '../../lib/errorReporting'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID

export default function AdminLogin() {
  const { user, loading, signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && ADMIN_USER_ID && user.id === ADMIN_USER_ID) navigate('/admin', { replace: true })
  }, [user, navigate])

  if (!loading && user && ADMIN_USER_ID && user.id === ADMIN_USER_ID) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { data, error: signInError } = await signIn(email.trim(), password)

    if (signInError) {
      reportError('admin-login.sign-in', signInError)
      setError('Email atau password tidak cocok.')
      setSubmitting(false)
      return
    }

    if (!ADMIN_USER_ID || data.user?.id !== ADMIN_USER_ID) {
      await signOut()
      setError('Akun ini tidak memiliki akses ke dashboard.')
      setSubmitting(false)
      return
    }

    navigate('/admin', { replace: true })
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link to="/" className="admin-back-link">← Kembali ke portfolio</Link>
        <div className="admin-login-heading">
          <span className="admin-chip">PRIVATE AREA</span>
          <h1>Maldy Admin.</h1>
          <p>Masuk untuk mengelola karya tanpa mengubah kode React.</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="admin-form-error">{error}</div>}

          <button className="admin-button primary full" disabled={submitting}>
            {submitting ? 'Masuk…' : 'Masuk ke Dashboard'}
          </button>
        </form>
      </section>
    </main>
  )
}
