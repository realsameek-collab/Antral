import { Fragment, useState } from 'react'

// One real (invisible) input drawn as separate boxes, so typing, paste,
// backspace and phone autofill all behave like a normal text field.
function CodeInput({ value, onChange, length = 8, disabled = false, autoFocus = false }) {
  const [focused, setFocused] = useState(false)
  const activeIndex = Math.min(value.length, length - 1)

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label={`${length}-character verification code`}
        className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const char = value[i]
          const active = focused && !disabled && i === activeIndex
          return (
            <Fragment key={i}>
              {i === length / 2 && <span className="h-px w-2 shrink-0 bg-white/25" />}
              <div
                className={`code-cell ${char ? 'code-cell-filled' : ''} ${active ? 'code-cell-active' : ''} ${disabled ? 'opacity-60' : ''}`}
              >
                {char ? <span className="code-char">{char}</span> : active && <span className="code-caret" />}
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default CodeInput
