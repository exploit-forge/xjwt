import { useLayoutEffect, useRef, useState } from 'react'
import XJwtLogo from './XJwtLogo'

const navItems = [
  { id: 'decoder', label: 'Decoder' }, { id: 'crack', label: 'Cracker' },
  { id: 'scanner', label: 'Scanner' }, { id: 'advanced', label: 'Advanced' },
  { id: 'libraries', label: 'Libraries' }
]

function Header({ theme, setTheme, currentView, setCurrentView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })
  const navRef = useRef(null)
  const navItemRefs = useRef({})
  const selectView = (view) => { setCurrentView(view); setIsMenuOpen(false) }

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeItem = navItemRefs.current[currentView]
      if (!activeItem || !navRef.current || activeItem.offsetWidth === 0) return
      setPill({ left: activeItem.offsetLeft, width: activeItem.offsetWidth, ready: true })
    }

    updatePill()
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  }, [currentView])

  return (
    <header className="app-header sticky top-0 z-40 px-3 py-3 sm:px-5">
      <div className="nav-shell mx-auto max-w-8xl">
        <button type="button" onClick={() => selectView('decoder')} className="nav-brand" aria-label="Open JWT decoder">
          <span className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center">
            <XJwtLogo />
          </span>
          <span className="min-w-0 text-left">
            <strong className="block truncate text-base font-semibold tracking-tight sm:text-lg">JWT Security Checker</strong>
          </span>
        </button>

        <nav ref={navRef} className="nav-primary hidden lg:flex" aria-label="Primary navigation">
          <span className={`nav-active-pill ${pill.ready ? 'nav-active-pill-ready' : ''}`} style={{ width: `${pill.width}px`, transform: `translateX(${pill.left}px)` }} aria-hidden="true" />
          {navItems.map((item) => <button ref={(node) => { navItemRefs.current[item.id] = node }} key={item.id} type="button" onClick={() => selectView(item.id)} className={`nav-primary-item ${currentView === item.id ? 'nav-primary-item-active' : ''}`}>{item.label}</button>)}
        </nav>

        <div className="nav-actions">
          <a href="https://github.com/exploit-forge/xjwt" target="_blank" rel="noopener noreferrer" className="nav-icon-button hidden sm:inline-flex" title="View xjwt on GitHub" aria-label="View xjwt on GitHub">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12 24 5.373 18.627 0 12 0z" /></svg>
          </a>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="nav-icon-button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.4 15.2A8.5 8.5 0 118.8 3.6a7 7 0 0011.6 11.6z" /></svg> : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
          </button>
          <button type="button" onClick={() => setIsMenuOpen((open) => !open)} className="nav-icon-button lg:hidden" aria-label="Toggle navigation" aria-expanded={isMenuOpen}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth={1.8} d={isMenuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
        </div>

        {isMenuOpen && <nav className="nav-mobile lg:hidden" aria-label="Mobile navigation">{navItems.map((item) => <button key={item.id} type="button" onClick={() => selectView(item.id)} className={currentView === item.id ? 'nav-mobile-active' : ''}>{item.label}</button>)}<a href="https://github.com/exploit-forge/xjwt" target="_blank" rel="noopener noreferrer">GitHub</a></nav>}
      </div>
    </header>
  )
}

export default Header
