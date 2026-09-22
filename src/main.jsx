import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import App from './App'
import './styles.css'

// Backward compatibility for old GitHub Pages URLs such as /#/about.
// Normal in-page anchors (for example #about-preview) are not touched.
const legacyHashRoute = window.location.hash.match(/^#(\/[^?#]*)/)
if (legacyHashRoute?.[1]) {
  window.history.replaceState(null, '', legacyHashRoute[1])
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)
