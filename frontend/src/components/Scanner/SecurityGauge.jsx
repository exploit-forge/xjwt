import { useEffect, useState } from 'react'

const levels = [
  [90, 'Excellent', 'var(--ef-ok)'],
  [70, 'Good', '#60a5fa'],
  [50, 'Fair', 'var(--ef-warn)'],
  [30, 'Poor', '#fb923c'],
  [0, 'Critical', 'var(--ef-danger)'],
]

const SecurityGauge = ({ score }) => {
  const [needleScore, setNeedleScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setNeedleScore(score)
      setDisplayScore(score)
      return undefined
    }

    let frameId
    const animateNumber = (from, to, duration) => {
      window.cancelAnimationFrame(frameId)
      const startedAt = performance.now()
      const tick = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - ((1 - progress) ** 3)
        setDisplayScore(from + ((to - from) * eased))
        if (progress < 1) frameId = window.requestAnimationFrame(tick)
      }
      frameId = window.requestAnimationFrame(tick)
    }

    setNeedleScore(0)
    setDisplayScore(0)
    const sweepTimer = window.setTimeout(() => {
      setNeedleScore(100)
      animateNumber(0, 100, 1200)
    }, 450)
    const settleTimer = window.setTimeout(() => {
      setNeedleScore(score)
      animateNumber(100, score, 1200)
    }, 1800)
    return () => {
      window.clearTimeout(sweepTimer)
      window.clearTimeout(settleTimer)
      window.cancelAnimationFrame(frameId)
    }
  }, [score])

  const [, level, statusColor] = levels.find(([minimum]) => score >= minimum)
  const color = 'var(--ef-ok)'
  const needleAngle = -90 + (needleScore * 1.8)

  return (
    <section className="scanner-score-card" style={{ '--gauge-color': color, '--status-color': statusColor }}>
      <div className="scanner-score-heading">
        <div className="scanner-score-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
        </div>
        <div><span>SECURITY SCORE</span><h3>Security posture</h3></div>
      </div>
      <div className="scanner-gauge scanner-speedometer">
        <svg viewBox="0 0 200 118" aria-hidden="true">
          <path className="scanner-gauge-track" d="M16 96a84 84 0 0 1 168 0" pathLength="100" />
          <path className="scanner-gauge-zone scanner-gauge-zone-start" d="M16 96a84 84 0 0 1 168 0" pathLength="100" stroke="var(--ef-danger)" strokeDasharray="31 69" />
          <path className="scanner-gauge-zone" d="M16 96a84 84 0 0 1 168 0" pathLength="100" stroke="var(--ef-warn)" strokeDasharray="31 69" strokeDashoffset="-34" />
          <path className="scanner-gauge-zone scanner-gauge-zone-end" d="M16 96a84 84 0 0 1 168 0" pathLength="100" stroke="var(--ef-ok)" strokeDasharray="32 68" strokeDashoffset="-68" />
          <g className="scanner-gauge-ticks">
            <path d="M16 96h9M40.6 36.6l6.4 6.4M100 12v9M159.4 36.6l-6.4 6.4M184 96h-9" />
          </g>
          <g className="scanner-gauge-needle" style={{ transform: `rotate(${needleAngle}deg)` }}>
            <path d="M95.5 96 100 28l4.5 68Z" />
          </g>
          <circle className="scanner-gauge-hub" cx="100" cy="96" r="7" />
        </svg>
        <div className="scanner-gauge-value"><strong>{Math.round(displayScore)}%</strong><span>{level}</span></div>
      </div>
      <div className="scanner-gauge-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      <p>Overall resilience of the token configuration.</p>
    </section>
  )
}

export { SecurityGauge }
