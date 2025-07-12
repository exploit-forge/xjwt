import { useEffect, useState } from 'react'

const RiskGauge = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 100)
    return () => clearTimeout(timer)
  }, [score])

  const getRiskLevel = (score) => {
    if (score >= 80) return { level: 'Critical', color: 'text-red-600 dark:text-red-400' }
    if (score >= 60) return { level: 'High', color: 'text-orange-600 dark:text-orange-400' }
    if (score >= 40) return { level: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' }
    if (score >= 20) return { level: 'Low', color: 'text-blue-600 dark:text-blue-400' }
    return { level: 'Minimal', color: 'text-green-600 dark:text-green-400' }
  }

  const { level, color } = getRiskLevel(score)
  
  // Calculate the path for the arc (red gauge)
  const radius = 90
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * Math.PI // Half circle
  
  // Convert score to angle (180 degrees max for half circle)
  const angle = (animatedScore / 100) * 180
  const strokeDasharray = `${(angle / 180) * circumference} ${circumference}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Risk Level
      </h3>
      
      <div className="flex flex-col items-center">
        {/* SVG Gauge */}
        <div className="relative">
          <svg width="200" height="120" className="transform rotate-0">
            {/* Background arc */}
            <path
              d={`M 20 100 A ${normalizedRadius} ${normalizedRadius} 0 0 1 180 100`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200 dark:text-gray-700"
            />
            
            {/* Progress arc */}
            <path
              d={`M 20 100 A ${normalizedRadius} ${normalizedRadius} 0 0 1 180 100`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="text-red-500 dark:text-red-400 transition-all duration-1000 ease-out"
              style={{
                transformOrigin: '100px 100px',
              }}
            />
          </svg>
          
          {/* Score display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(animatedScore)}%
            </div>
            <div className={`text-sm font-medium ${color}`}>
              {level}
            </div>
          </div>
        </div>

        {/* Scale markers */}
        <div className="flex justify-between w-full max-w-[160px] mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>

        {/* Legend */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Potential security vulnerabilities and threats
          </p>
        </div>
      </div>
    </div>
  )
}

export { RiskGauge }