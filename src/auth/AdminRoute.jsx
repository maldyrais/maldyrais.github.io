import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID

export default function AdminRoute({ children }) {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <div className="admin-route-state">Memeriksa sesi admin…</div>
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  if (!ADMIN_USER_ID || user.id !== ADMIN_USER_ID) {
    return (
      <main className="admin-denied">
        <div className="admin-denied-card">
          <span className="admin-chip">ADMIN</span>
          <h1>Akun ini tidak memiliki akses.</h1>
          <p>Sesi ini tidak memiliki izin untuk membuka dashboard.</p>
          <button className="admin-button secondary" onClick={() => signOut()}>Keluar</button>
        </div>
      </main>
    )
  }

  return children
}
