import React, { useState, useEffect, useCallback } from 'react'

interface PunctuationBarProps {
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
  onInsert: (symbol: string) => void
}

const PUNCTUATIONS = [
  ['「', '」'],
  ['『', '』'],
  ['"', '"'],
  ['（', '）'],
  ['【', '】'],
  ['《', '》'],
  ['……', '——'],
  ['，', '。'],
  ['！', '？'],
  ['：', '；']
]

const ChinesePunctuationBar: React.FC<PunctuationBarProps> = ({
  isVisible,
  position,
  onClose,
  onInsert
}) => {
  const [showChoice, setShowChoice] = useState<{ x: number; y: number; symbol: string } | null>(
    null
  )
  const barRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible) {
      // eslint-disable-next-line @eslint-react/set-state-in-effect
      setShowChoice(null)
      return
    }

    const handleClickOutside = (e: MouseEvent): void => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible, onClose])

  const handleClick = useCallback(
    (symbol: string, e: React.MouseEvent): void => {
      e.stopPropagation()
      onInsert(symbol)
      onClose()
    },
    [onInsert, onClose]
  )

  const handleLongPress = useCallback((symbol: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    if (symbol.length === 2 && symbol !== '……' && symbol !== '——') {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setShowChoice({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        symbol
      })
    }
  }, [])

  const handleChoice = useCallback(
    (char: string) => {
      if (showChoice) {
        onInsert(char)
        setShowChoice(null)
        onClose()
      }
    },
    [showChoice, onInsert, onClose]
  )

  if (!isVisible) return null

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 280),
    top: Math.min(position.y + 20, window.innerHeight - 120),
    zIndex: 10000,
    pointerEvents: 'auto'
  }

  return (
    <>
      <div ref={barRef} className="chinese-punctuation-bar" style={barStyle}>
        {PUNCTUATIONS.map((pair) => (
          <div key={`pair-${pair[0]}-${pair[1]}`} className="punctuation-pair">
            {pair.map((symbol, symbolIndex) => (
              <button
                key={`sym-${pair[0]}-${pair[1]}-${symbol}`}
                className="punctuation-btn"
                onClick={(e) => handleClick(symbol, e)}
                onMouseDown={(e) => handleLongPress(symbol, e)}
                title={symbolIndex === 0 ? `左: ${symbol}` : `右: ${symbol}`}
              >
                {symbol}
              </button>
            ))}
          </div>
        ))}
      </div>
      {showChoice && (
        <div
          className="punctuation-choice-menu"
          style={{
            position: 'fixed',
            left: showChoice.x,
            top: showChoice.y,
            transform: 'translateX(-50%) translateY(-100%)',
            zIndex: 10001
          }}
        >
          <button
            className="punctuation-choice-btn"
            onClick={() => handleChoice(showChoice.symbol[0])}
          >
            {showChoice.symbol[0]}
          </button>
          <button
            className="punctuation-choice-btn"
            onClick={() => handleChoice(showChoice.symbol[1])}
          >
            {showChoice.symbol[1]}
          </button>
        </div>
      )}
    </>
  )
}

export default ChinesePunctuationBar
