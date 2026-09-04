import { Link } from 'react-router-dom'

interface AppHeaderProps {
  backTo?: string
  backLabel?: string
  onRules?: () => void
}

export function AppHeader({ backTo, backLabel = '返回', onRules }: AppHeaderProps) {
  return (
    <header className="masthead">
      <Link className="brand-mark" to="/" aria-label="返回暗棋首页">暗</Link>
      <div>
        <h1>暗棋</h1>
        <p className="subtitle">棋背藏兵，落子定营</p>
      </div>
      <div className="header-actions">
        {backTo && <Link className="quiet-button header-link" to={backTo}>{backLabel}</Link>}
        {onRules && (
          <button className="quiet-button" type="button" onClick={onRules}>玩法</button>
        )}
      </div>
    </header>
  )
}
