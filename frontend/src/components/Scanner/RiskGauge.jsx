import { useEffect, useState } from 'react'

const levels = [
  [80, 'Critical', '#fb7185'],
  [60, 'High', '#fb923c'],
  [40, 'Medium', '#fbbf24'],
  [20, 'Low', '#60a5fa'],
  [0, 'Minimal', '#34d399'],
]

const RiskGauge = ({ score }) => {
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
          <svg viewBox="0 0 24 24"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></svg>
        </div>
        <div><span>RISK SCORE</span><h3>Exposure level</h3></div>
      </div>
      <div className="scanner-gauge">
        <svg viewBox="0 0 200 112" aria-hidden="true">
          <path className="scanner-gauge-track" d="M16 96a84 84 0 0 1 168 0" pathLength="264" />
          <path className="scanner-gauge-progress" d="M16 96a84 84 0 0 1 168 0" strokeDasharray={`${progress} ${circumference}`} />
        </svg>
        <div className="scanner-gauge-value"><strong>{Math.round(animatedScore)}%</strong><span>{level}</span></div>
      </div>
      <div className="scanner-gauge-scale"><span>0</span><span>50</span><span>100</span></div>
      <p>Potential impact of the findings detected.</p>
    </section>
  )
}

export { RiskGauge }
