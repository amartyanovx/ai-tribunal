/**
 * Safe Markdown -> HTML rendering for the self-contained verdict report.
 *
 * The report is built from case artifacts that contain arbitrary agent text.
 * Every character that reaches the output goes through escapeHtml first; only
 * a deliberately small Markdown subset is turned back into markup. Raw HTML in
 * the source stays text, and link targets are restricted to http(s), mailto,
 * relative paths and in-page anchors.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}

export function escapeAttr(value) {
  return escapeHtml(value)
}

/** Strip inline Markdown markers for labels, ids and comparisons. */
export function cleanInline(value) {
  return String(value ?? '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/~~/g, '')
    .trim()
}

/**
 * Allow only links that cannot execute script and cannot leak file:// access
 * through a scheme. Relative links are limited to paths without `..`.
 */
export function safeHref(raw) {
  const url = String(raw ?? '')
    .trim()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  if (!url) return null
  if (/[\u0000-\u001f\u007f]/.test(url)) return null
  if (url.startsWith('#')) return url.length > 1 ? url : null
  if (url.startsWith('//')) return null
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  if (scheme) {
    const name = scheme[1].toLowerCase()
    if (name === 'http' || name === 'https' || name === 'mailto') return url
    return null
  }
  if (url.startsWith('\\') || url.startsWith('/') || url.includes('\\')) return null
  if (url.split(/[\\/]/).some((part) => part === '..')) return null
  return url
}

function linkAttrs(href, opts) {
  if (href.startsWith('#')) return ''
  if (/^https?:/i.test(href)) return ' target="_blank" rel="noopener noreferrer"'
  if (opts?.linkTarget === false) return ''
  return ' target="_blank" rel="noopener"'
}

function renderCode(value, opts) {
  const code = String(value ?? '')
  const escaped = escapeHtml(code)
  const name = code.trim()
  const isFile = /^[\w.-]+\.(?:md|json|html|txt|csv)$/i.test(name)
  if (isFile && typeof opts?.fileResolver === 'function') {
    const resolved = opts.fileResolver(name)
    if (resolved && resolved.exists) {
      return `<a class="file-ref" href="${escapeAttr(resolved.href)}"${linkAttrs(resolved.href, opts)}>${escaped}</a>`
    }
    return `<span class="file-ref file-ref--missing" title="Файл отсутствует в папке дела">${escaped}</span>`
  }
  return `<code>${escaped}</code>`
}

/**
 * Render inline Markdown. The input is escaped before any formatting is
 * applied, so `<script>` in an artifact can never become an element.
 */
export function renderInline(source, opts = {}) {
  const raw = String(source ?? '')
  const codes = []
  const images = []

  let text = escapeHtml(raw)

  // Code spans are protected from every other rule.
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    codes.push(code)
    return `\u0000C${codes.length - 1}\u0000`
  })

  // Images are not loaded: the report must work offline. Keep the description.
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt, url) => {
    images.push({ alt, url })
    return `\u0000I${images.length - 1}\u0000`
  })

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label, url) => {
    const href = safeHref(url)
    if (!href) return label
    return `<a href="${escapeAttr(href)}"${linkAttrs(href, opts)}>${label}</a>`
  })

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
  text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  // Italics: require boundaries so multiplication signs and IDs stay intact.
  text = text.replace(/(^|[\s(«"'])\*([^*\n]+)\*(?=$|[\s.,;:!?)»"'])/g, '$1<em>$2</em>')
  text = text.replace(/(^|[\s(«"'])_([^_\n]+)_(?=$|[\s.,;:!?)»"'])/g, '$1<em>$2</em>')

  text = text.replace(/\u0000C(\d+)\u0000/g, (_match, index) => renderCode(codes[Number(index)], opts))
  text = text.replace(/\u0000I(\d+)\u0000/g, (_match, index) => {
    const image = images[Number(index)]
    const label = image.alt ? `Изображение: ${image.alt}` : 'Изображение'
    const href = safeHref(image.url)
    return href
      ? `<span class="md-image" title="${escapeAttr(href)}">${escapeHtml(label)}</span>`
      : `<span class="md-image">${escapeHtml(label)}</span>`
  })

  return text
}

function indentOf(line) {
  const match = /^[ \t]*/.exec(line)
  return (match ? match[0] : '').replace(/\t/g, '    ').length
}

/** Split a pipe-table row, ignoring pipes inside code spans and `\|`. */
export function splitTableRow(line) {
  let source = String(line ?? '').trim()
  if (source.startsWith('|')) source = source.slice(1)
  if (source.endsWith('|')) source = source.slice(0, -1)
  const cells = []
  let current = ''
  let inCode = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (char === '\\' && source[i + 1] === '|') {
      current += '|'
      i += 1
      continue
    }
    if (char === '`') {
      inCode = !inCode
      current += char
      continue
    }
    if (char === '|' && !inCode) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function isTableSeparator(line) {
  return /^\s*\|?[\s|:-]*-[\s|:-]*\|?\s*$/.test(line) && line.includes('|')
}

function isTableStart(lines, index) {
  return /^\s*\|/.test(lines[index] ?? '') && isTableSeparator(lines[index + 1] ?? '')
}

export function renderTableHtml(headers, rows, opts = {}) {
  const head = headers
    .map((cell) => `<th scope="col">${renderInline(cell, opts)}</th>`)
    .join('')
  const body = rows
    .map((row) => {
      const cells = headers.map((_header, index) => {
        const value = row[index] ?? ''
        return `<td>${value.trim() ? renderInline(value, opts) : '<span class="muted">—</span>'}</td>`
      })
      return `<tr>${cells.join('')}</tr>`
    })
    .join('')
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderList(lines, start, opts) {
  const baseIndent = indentOf(lines[start])
  const ordered = /^\s*\d+[.)]\s+/.test(lines[start])
  const startMatch = /^\s*(\d+)[.)]\s+/.exec(lines[start])
  const startNumber = startMatch ? Number(startMatch[1]) : 1
  const items = []
  let current = null
  let index = start

  const pushCurrent = () => {
    if (current) items.push(current)
  }

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      let next = index + 1
      while (next < lines.length && !lines[next].trim()) next += 1
      if (next >= lines.length) break
      const nextIndent = indentOf(lines[next])
      const nextIsItem = /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[next])
      if (nextIsItem && nextIndent <= baseIndent + 1) {
        index = next
        continue
      }
      if (current && nextIndent > baseIndent) {
        current.text += '\n'
        index = next
        continue
      }
      break
    }
    const marker = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (marker && indentOf(line) <= baseIndent + 1) {
      pushCurrent()
      current = { text: marker[2], nested: [] }
      index += 1
      continue
    }
    if (marker && indentOf(line) > baseIndent + 1 && current) {
      const nested = renderList(lines, index, opts)
      current.nested.push(nested.html)
      index = nested.next
      continue
    }
    if (current && indentOf(line) > baseIndent) {
      current.text += ` ${line.trim()}`
      index += 1
      continue
    }
    break
  }
  pushCurrent()

  const tag = ordered ? 'ol' : 'ul'
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : ''
  const html = `<${tag}${startAttr}>${items
    .map((item) => `<li>${renderInline(item.text, opts)}${item.nested.join('')}</li>`)
    .join('')}</${tag}>`
  return { html, next: index }
}

/**
 * Render a Markdown document using the subset used by the case artifacts:
 * headings, paragraphs, emphasis, code, links, lists, blockquotes, pipe tables,
 * horizontal rules and fenced code. No raw HTML is passed through.
 *
 * @param {string} source
 * @param {{headingOffset?: number, fileResolver?: (name: string) => {exists: boolean, href?: string}, linkTarget?: boolean}} opts
 */
export function renderMarkdown(source, opts = {}) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = /^\s*(```+|~~~+)\s*([\w-]*)\s*$/.exec(line)
    if (fence) {
      const marker = fence[1][0]
      const language = fence[2] ? ` class="language-${escapeAttr(fence[2])}"` : ''
      const code = []
      index += 1
      while (index < lines.length && !new RegExp(`^\\s*${marker}{3,}\\s*$`).test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      out.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      const level = Math.min(6, Math.max(2, heading[1].length + (opts.headingOffset ?? 0)))
      out.push(`<h${level}>${renderInline(heading[2], opts)}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push('<hr>')
      index += 1
      continue
    }

    if (/^\s*>/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      out.push(`<blockquote>${renderMarkdown(quote.join('\n'), opts)}</blockquote>`)
      continue
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(line)
      const rows = []
      index += 2
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      out.push(renderTableHtml(headers, rows, opts))
      continue
    }

    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const list = renderList(lines, index, opts)
      out.push(list.html)
      index = list.next
      continue
    }

    const paragraph = []
    while (index < lines.length) {
      const current = lines[index]
      if (!current.trim()) break
      if (/^\s*(#{1,6})\s+/.test(current)) break
      if (/^\s*(```+|~~~+)/.test(current)) break
      if (/^\s*>/.test(current)) break
      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(current)) break
      if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(current)) break
      if (isTableStart(lines, index)) break
      paragraph.push(current)
      index += 1
    }
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.map((item) => renderInline(item, opts)).join('<br>')}</p>`)
    }
  }

  return out.join('\n')
}

/** First prose paragraph of a Markdown document, used for the verdict summary. */
export function firstParagraph(source) {
  const blocks = String(source ?? '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    if (/^(#{1,6})\s+/.test(trimmed)) continue
    if (/^\s*\|/.test(trimmed)) continue
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(trimmed)) continue
    if (/^\s*(```|~~~)/.test(trimmed)) continue
    return trimmed
  }
  return ''
}
