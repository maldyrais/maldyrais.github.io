import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import AdminWorksPanel from '../../components/admin/AdminWorksPanel'
import ActivityAdmin from '../../components/admin/ActivityAdmin'
import ProfilePanel from '../../components/admin/ProfilePanel'
import SiteStatusPanel from '../../components/admin/SiteStatusPanel'
import AdminOverview from '../../components/admin/AdminOverview'
import AdminShowcasePanel from '../../components/admin/AdminShowcasePanel'

const sectionLabels = {
  dashboard: 'Dashboard',
  works: 'Karya',
  showcase: 'Selected Works',
  activity: 'Activity',
  profile: 'Profil',
  status: 'Site Status',
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const [section, setSection] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('admin-route-active')

    return () => {
      root.classList.remove('admin-route-active')
      root.classList.remove('admin-menu-open')
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    if (menuOpen) {
      root.classList.add('admin-menu-open')
      window.addEventListener('keydown', onKeyDown)
    } else {
      // Important for HMR/dev: never leave a stale overflow lock behind.
      root.classList.remove('admin-menu-open')
    }

    return () => {
      root.classList.remove('admin-menu-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const selectSection = (nextSection) => {
    setSection(nextSection)
    setMenuOpen(false)
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-mobile-bar">
        <button
          type="button"
          className={`admin-menu-toggle ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          aria-label={menuOpen ? 'Tutup menu admin' : 'Buka menu admin'}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="admin-mobile-title">
          <small>PORTFOLIO ADMIN</small>
          <strong>{sectionLabels[section]}</strong>
        </div>

        <Link className="admin-mobile-site-link" to="/" target="_blank">Website ↗</Link>
      </header>

      <button
        type="button"
        className={`admin-sidebar-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Tutup menu admin"
        tabIndex={menuOpen ? 0 : -1}
      />

      <aside id="admin-navigation" className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div>
          <span className="admin-chip">MALDY</span>
          <h1>Portfolio<br />Admin</h1>
          <nav aria-label="Admin sections">
            <button className={section === 'dashboard' ? 'active' : ''} onClick={() => selectSection('dashboard')}>Dashboard</button>
            <span className="admin-nav-divider" aria-hidden="true">Content</span>
            <button className={section === 'works' ? 'active' : ''} onClick={() => selectSection('works')}>Karya</button>
            <button className={section === 'showcase' ? 'active' : ''} onClick={() => selectSection('showcase')}>Selected Works</button>
            <button className={section === 'activity' ? 'active' : ''} onClick={() => selectSection('activity')}>Activity</button>
            <button className={section === 'profile' ? 'active' : ''} onClick={() => selectSection('profile')}>Profil</button>
            <span className="admin-nav-divider" aria-hidden="true">Website</span>
            <button className={section === 'status' ? 'active' : ''} onClick={() => selectSection('status')}>Site Status</button>
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <Link to="/" target="_blank">Lihat website ↗</Link>
          <button type="button" onClick={handleSignOut}>Keluar</button>
          <small>{user?.email ?? ''}</small>
        </div>
      </aside>

      <section className="admin-main">
        {section === 'dashboard' && <AdminOverview onNavigate={selectSection} user={user} />}
        {section === 'works' && <AdminWorksPanel />}
        {section === 'showcase' && <AdminShowcasePanel />}
        {section === 'activity' && <ActivityAdmin />}
        {section === 'profile' && <ProfilePanel />}
        {section === 'status' && <SiteStatusPanel />}
      </section>
    </main>
  )
}
