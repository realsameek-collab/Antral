// Minimal renderer for the small markdown subset used in policy bodies:
// `# h1`, `## h2`, `- bullet`, `**bold**`, `_italic_`.
function renderInline(text, keyPrefix) {
  const nodes = []
  const regex = /(\*\*[^*]+\*\*|_[^_]+_)/g
  let last = 0
  let match
  let i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      )
    } else {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="text-neutral-400 not-italic">
          {token.slice(1, -1)}
        </em>,
      )
    }
    last = match.index + token.length
    i += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderBody(body) {
  const lines = body.split('\n')
  const blocks = []
  let bullets = null

  const flushBullets = () => {
    if (bullets) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-1 text-neutral-300">
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b, `li-${blocks.length}-${i}`)}</li>
          ))}
        </ul>,
      )
      bullets = null
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      bullets = bullets || []
      bullets.push(line.slice(2))
      return
    }
    flushBullets()
    if (!line.trim()) return
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={idx} className="mt-5 text-sm font-semibold tracking-wide text-white">
          {renderInline(line.slice(3), `h3-${idx}`)}
        </h3>,
      )
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={idx} className="text-lg font-semibold tracking-tight text-white">
          {renderInline(line.slice(2), `h2-${idx}`)}
        </h2>,
      )
    } else {
      blocks.push(
        <p key={idx} className="text-sm leading-relaxed text-neutral-300">
          {renderInline(line, `p-${idx}`)}
        </p>,
      )
    }
  })
  flushBullets()
  return blocks
}

function PolicyDocument({ document, className = '' }) {
  return (
    <article className={`space-y-2 ${className}`}>{renderBody(document.body)}</article>
  )
}

export default PolicyDocument
