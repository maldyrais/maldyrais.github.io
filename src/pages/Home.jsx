import { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import AboutPreview from '../components/AboutPreview'
import SelectedWorks from '../components/SelectedWorks'
import MoreAboutMe from '../components/MoreAboutMe'
import ServiceFloat from '../components/ServiceFloat'
import ContactFooter from '../components/ContactFooter'

export default function Home() {
  useEffect(() => {
    const preventAutoscroll = (e) => {
      if (e.button !== 1) return
      const link = e.target.closest('a')
      if (link) return
      e.preventDefault()
    }
    window.addEventListener('mousedown', preventAutoscroll)
    return () => window.removeEventListener('mousedown', preventAutoscroll)
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AboutPreview />
        <SelectedWorks />
        <MoreAboutMe />
        <ContactFooter />

        <ServiceFloat />
      </main>
    </>
  )
}
