import { useEffect } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const NIHONGO_URL = 'https://maldyrais.github.io/Nihongo-gakushu/'

export default function NihongoGakushu() {
  const { t } = useLanguage()

  useEffect(() => {
    window.location.replace(NIHONGO_URL)
  }, [])

  return (
    <main className="simple-page">
      <div>
        <div className="section-kicker">日本語学習</div>
        <h1>{t('nihongo.opening')}</h1>
        <p>{t('nihongo.description')}</p>
      </div>
    </main>
  )
}
