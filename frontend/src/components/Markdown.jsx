// Minimal Markdown renderer for agent answers: headings, paragraphs, lists,
// tables, fenced code, inline code, bold and links. Builds React elements only
// (no innerHTML), so model output can't inject markup or scripts.

function inline(text, keyBase = '') {
  const parts = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${i++}`
    if (tok.startsWith('`')) {
      parts.push(
        <code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-indigo-200">
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key} className="font-semibold text-white">{tok.slice(2, -2)}</strong>)
    } else {
      const label = /^\[([^\]]+)\]/.exec(tok)[1]
      parts.push(
        <a key={key} href={m[2]} target="_blank" rel="noreferrer noopener" className="text-indigo-300 underline">
          {label}
        </a>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

function Markdown({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const key = `b${i}`

    if (/^```/.test(line)) {
      const body = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++])
      i += 1
      blocks.push(
        <pre key={key} className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-neutral-200">
          {body.join('\n')}
        </pre>,
      )
      continue
    }

    const h = /^(#{1,4})\s+(.*)/.exec(line)
    if (h) {
      const size = ['text-lg', 'text-base', 'text-sm', 'text-sm'][h[1].length - 1]
      blocks.push(
        <p key={key} className={`${size} mt-2 font-semibold text-white`}>
          {inline(h[2], key)}
        </p>,
      )
      i += 1
      continue
    }

    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="border-b border-white/15 px-2 py-1.5 font-semibold text-white">
                    {inline(c, `${key}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  {r.map((c, j) => (
                    <td key={j} className="border-b border-white/5 px-2 py-1.5 text-neutral-300">
                      {inline(c.replace(/<br\s*\/?>/gi, ' '), `${key}r${ri}c${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+\.)\s+/, ''))
        i += 1
      }
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={key} className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5 text-neutral-300`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}l${j}`)}</li>
          ))}
        </List>,
      )
      continue
    }

    if (!line.trim() || /^\s*(---|\*\*\*)\s*$/.test(line)) {
      i += 1
      continue
    }

    const para = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(```|#{1,4}\s|\s*([-*•]|\d+\.)\s+|\s*\|.*\|\s*$)/.test(lines[i])
    ) {
      para.push(lines[i++])
    }
    // A line that only looked like a table row: show it as text, and always advance.
    if (!para.length) para.push(lines[i++])
    blocks.push(
      <p key={key} className="text-neutral-300">
        {inline(para.join(' '), key)}
      </p>,
    )
  }

  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>
}

export default Markdown
