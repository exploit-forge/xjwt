import { useState } from 'react'

function JSONWithTimestampTooltips({ data, editedData, onChange, readOnly = false }) {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 })

  // Check if a value looks like a Unix timestamp
  const isTimestamp = (value) => {
    const num = Number(value)
    if (isNaN(num)) return false
    return num > 946684800 && num < 4102444800 // Between 2000 and 2100
  }

  // Format timestamp for tooltip
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    
    let relative = ''
    if (Math.abs(diffHours) < 24) {
      relative = diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`
    } else {
      const diffDays = Math.round(diffHours / 24)
      relative = diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`
    }
    
    return `${date.toLocaleString()} (${relative})`
  }

  // If it's editable, show regular textarea
  if (!readOnly) {
    return (
      <textarea
        value={editedData}
        onChange={onChange}
        className="w-full h-32 p-3 font-mono text-sm bg-transparent border-0 focus:ring-0 resize-none"
        spellCheck={false}
      />
    )
  }

  // Handle mouse events for hover detection
  const handleMouseMove = (e) => {
    // Get the text content and mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Use document.caretRangeFromPoint to find what's under the cursor
    const range = document.caretRangeFromPoint(e.clientX, e.clientY)
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      const textContent = range.startContainer.textContent
      const offset = range.startOffset
      
      // Look for a timestamp around the cursor position
      const beforeText = textContent.substring(Math.max(0, offset - 10), offset + 10)
      const timestampMatch = beforeText.match(/\b(1[0-9]{9})\b/)
      
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1])
        if (isTimestamp(timestamp)) {
          setTooltip({
            show: true,
            content: formatTimestamp(timestamp),
            x: e.clientX,
            y: e.clientY
          })
          return
        }
      }
    }
    
    setTooltip({ show: false, content: '', x: 0, y: 0 })
  }

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 })
  }

  return (
    <div className="relative">
      <div
        className="w-full h-32 p-3 font-mono text-sm bg-transparent overflow-auto whitespace-pre text-gray-700 dark:text-gray-300 cursor-default"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {editedData}
      </div>
      
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded shadow-lg pointer-events-none max-w-xs whitespace-nowrap"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 40,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}

export default JSONWithTimestampTooltips