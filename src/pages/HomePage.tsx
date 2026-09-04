import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

export function HomePage() {
  return (
    <main className="app-shell landing-shell">
      <AppHeader />
      <section className="mode-section" aria-labelledby="mode-title">
        <p className="eyebrow">入局</p>
        <h2 id="mode-title">择一席，对弈一局</h2>
        <div className="mode-grid">
          <Link className="mode-card local-mode" to="/local">
            <span className="mode-seal" aria-hidden="true">双</span>
            <strong>本地对战</strong>
            <small>同屏落子，轮流行棋</small>
          </Link>
          <Link className="mode-card online-mode" to="/online">
            <span className="mode-seal" aria-hidden="true">联</span>
            <strong>联机对战</strong>
            <small>创建房间，邀友入局</small>
          </Link>
        </div>
      </section>
    </main>
  )
}
