import { useEffect, useState } from 'react'

const levels = [
  [90, 'Excellent', '#34d399'],
  [70, 'Good', '#60a5fa'],
  [50, 'Fair', '#fbbf24'],
  [30, 'Poor', '#fb923c'],
  [0, 'Critical', '#fb7185'],
]

const SecurityGauge = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const [, level, color] = levels.find(([minimum]) => score >= minimum)
  const circumference = 84 * Math.PI
  const progress = (animatedScore / 100) * circumference

  return (
    <section className="scanner-score-card" style={{ '--gauge-color': color }}>
      <div className="scanner-score-heading">
        <div className="scanner-score-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
        </div>
        <div><span>SECURITY SCORE</span><h3>Security posture</h3></div>
      </div>
      <div className="scanner-gauge">
        <svg viewBox="0 0 200 112" aria-hidden="true">
          <path className="scanner-gauge-track" d="M16 96a84 84 0 0 1 168 0" pathLength="264" />
          <path className="scanner-gauge-progress" d="M16 96a84 84 0 0 1 168 0" strokeDasharray={`${progress} ${circumference}`} />
        </svg>
        <div className="scanner-gauge-value"><strong>{Math.round(animatedScore)}%</strong><span>{level}</span></div>
      </div>
      <div className="scanner-gauge-scale"><span>0</span><span>50</span><span>100</span></div>
      <p>Overall resilience of the token configuration.</p>
    </section>
  )
}

export { SecurityGauge }
