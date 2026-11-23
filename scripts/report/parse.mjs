/**
 * Parsers for the Markdown case artifacts.
 *
 * The parsers never synthesise judicial content: they only locate headings,
 * tables, conditions and registries that already exist in case.md,
 * transcript*.md, verdict*.md, comparison.md and reconstruction.md. Anything
 * that cannot be located is returned as absent and is reported as such by the
 * generator.
 */
import { cleanInline, firstParagraph, splitTableRow } from './text.mjs'

export function normalizeHeading(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitByHeadingLevel(source, level = 2) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const preamble = []
  const sections = []
  let current = null
  let fence = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const match = !fence ? new RegExp(`^#{${level}}\\s+(.*?)\\s*#*\\s*$`).exec(line) : null
    if (match) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })
      current = { title: match[1].trim(), lines: [] }
      continue
    }
    if (current) current.lines.push(line)
    else preamble.push(line)
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })

  return { preamble: preamble.join('\n').trim(), sections }
}

export function splitAtMatchers(source, matchers, level = 2) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const preamble = []
  const sections = []
  let current = null
  let fence = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const match = !fence ? new RegExp(`^#{${level}}\\s+(.*?)\\s*#*\\s*$`).exec(line) : null
    if (match) {
      const title = match[1].trim()
      const matcher = matchers.find((item) => item.test(title))
      if (matcher) {
        if (current) sections.push({ key: current.key, title: current.title, content: current.lines.join('\n').trim() })
        current = { key: matcher.key, title, lines: [] }
        continue
      }
    }
    if (current) current.lines.push(line)
    else preamble.push(line)
  }
  if (current) sections.push({ key: current.key, title: current.title, content: current.lines.join('\n').trim() })

  return { preamble: preamble.join('\n').trim(), sections }
}

/**
 * Remove named H2-H5 subsections from a block and return them separately.
 * Used to move the evidence registry and the "missing evidence" list into the
 * dedicated evidence section without duplicating them in the argument text.
 */
export function stripSubsections(source, matchers) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const keep = []
  const removed = []
  let index = 0
  let fence = false

  while (index < lines.length) {
    const line = lines[index]
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const heading = !fence ? /^(#{2,5})\s+(.*?)\s*#*\s*$/.exec(line) : null
    if (heading) {
      const level = heading[1].length
      const title = heading[2].trim()
      const matcher = matchers.find((item) => item.test(title))
      if (matcher) {
        const body = []
        let next = index + 1
        let innerFence = false
        while (next < lines.length) {
          const candidate = lines[next]
          if (/^\s*(```|~~~)/.test(candidate)) innerFence = !innerFence
          const nextHeading = !innerFence ? /^(#{1,6})\s+/.exec(candidate) : null
          if (nextHeading && nextHeading[1].length <= level) break
          body.push(candidate)
          next += 1
        }
        removed.push({ key: matcher.key, title, body: body.join('\n').trim() })
        index = next
        continue
      }
    }
    keep.push(line)
    index += 1
  }

  return { body: keep.join('\n').trim(), removed }
}

function isTableSeparator(line) {
  return /^\s*\|?[\s|:-]*-[\s|:-]*\|?\s*$/.test(line) && line.includes('|')
}

export function parseTables(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const tables = []
  let index = 0
  let fence = false

  while (index < lines.length) {
    if (/^\s*(```|~~~)/.test(lines[index])) {
      fence = !fence
      index += 1
      continue
    }
    if (
      !fence
      && /^\s*\|/.test(lines[index])
      && isTableSeparator(lines[index + 1] ?? '')
    ) {
      const headers = splitTableRow(lines[index])
      const rows = []
      let next = index + 2
      while (next < lines.length && /^\s*\|/.test(lines[next])) {
        rows.push(splitTableRow(lines[next]))
        next += 1
      }
      tables.push({ headers, rows, start: index, end: next - 1 })
      index = next
      continue
    }
    index += 1
  }

  return tables
}

/** Map source column headers to semantic fields. First match wins. */
export function mapColumns(headers) {
  const map = {}
  headers.forEach((header, index) => {
    const name = normalizeHeading(header)
    if (map.id === undefined && (name === 'id' || /^id\b/.test(name) || name === '№' || /^№\b/.test(name))) {
      map.id = index
    } else if (map.thesis === undefined && /тезис|утвержден/.test(name)) {
      map.thesis = index
    } else if (map.status === undefined && /статус/.test(name)) {
      map.status = index
    } else if (map.confidence === undefined && /уверенност/.test(name)) {
      map.confidence = index
    } else if (map.required === undefined && /что требовалось|что было/.test(name)) {
      map.required = index
    } else if (map.done === undefined && /что сделано/.test(name)) {
      map.done = index
    } else if (map.justification === undefined && name.startsWith('обоснование')) {
      map.justification = index
    } else if (map.basis === undefined && name.startsWith('основание')) {
      map.basis = index
    } else if (map.type === undefined && (name === 'тип' || name.startsWith('тип '))) {
      map.type = index
    } else if (map.source === undefined && /источник|данные/.test(name)) {
      map.source = index
    } else if (map.claim === undefined && /что подтверждает|подтверждает/.test(name)) {
      map.claim = index
    } else if (map.reliability === undefined && /над[её]жност/.test(name)) {
      map.reliability = index
    } else if (map.limits === undefined && /ограничен/.test(name)) {
      map.limits = index
    } else if (map.change === undefined && /изменение/.test(name)) {
      map.change = index
    } else if (map.defect === undefined && /дефект|условие v1/.test(name)) {
      map.defect = index
    } else if (map.verification === undefined && /как проверяется|проверяется/.test(name)) {
      map.verification = index
    } else if (map.risk === undefined && /риск изменения/.test(name)) {
      map.risk = index
    }
  })
  return map
}

function rowToObject(headers, row) {
  const map = mapColumns(headers)
  const out = {}
  for (const [key, index] of Object.entries(map)) out[key] = row[index] ?? ''
  return out
}

export function classifyStatus(value) {
  const raw = cleanInline(value)
  const qualifierMatch = /\(([^)]*)\)/.exec(raw)
  const qualifier = qualifierMatch ? qualifierMatch[1].trim() : ''
  const baseRaw = raw.replace(/\([^)]*\)/g, '').trim().toLowerCase()
  let base = baseRaw
  let known = true

  if (baseRaw.startsWith('неопределено')) base = 'неопределено'
  else if (baseRaw.startsWith('не доказано')) base = 'не доказано'
  else if (baseRaw.startsWith('не закрыто')) base = 'не закрыто'
  else if (baseRaw.startsWith('опровергнуто')) base = 'опровергнуто'
  else if (baseRaw.startsWith('доказано')) base = 'доказано'
  else if (baseRaw.startsWith('закрыто')) base = 'закрыто'
  else if (baseRaw.startsWith('частично')) base = 'частично'
  else if (baseRaw.startsWith('доказан')) base = 'доказано'
  else if (baseRaw.startsWith('опровергнут')) base = 'опровергнуто'
  else {
    base = baseRaw || 'не указан'
    known = false
  }

  return { raw: raw || 'не указан', base, qualifier, known }
}

export function groupOfId(value) {
  const match = /^([A-Za-zА-Яа-я])\s*\d/.exec(cleanInline(value))
  if (!match) return '?'
  return match[1].toUpperCase()
}

function classifyTable(headers) {
  const map = mapColumns(headers)
  if (map.id !== undefined && map.thesis !== undefined && map.status !== undefined) {
    return { kind: 'theses', map }
  }
  if (
    map.id !== undefined
    && map.status !== undefined
    && (map.required !== undefined || map.done !== undefined)
  ) {
    return { kind: 'reconciliation', map }
  }
  return { kind: 'generic', map }
}

function buildSectionBlocks(content) {
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let buffer = []
  let index = 0

  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) blocks.push({ type: 'markdown', text })
    buffer = []
  }

  while (index < lines.length) {
    const fence = /^\s*(```+|~~~+)\s*[\w-]*\s*$/.exec(lines[index])
    if (fence) {
      buffer.push(lines[index])
      index += 1
      const marker = fence[1][0]
      while (index < lines.length) {
        buffer.push(lines[index])
        const closing = new RegExp(`^\\s*${marker}{3,}\\s*$`).test(lines[index])
        index += 1
        if (closing) break
      }
      continue
    }
    if (
      /^\s*\|/.test(lines[index])
      && isTableSeparator(lines[index + 1] ?? '')
    ) {
      flush()
      const headers = splitTableRow(lines[index])
      const rows = []
      let next = index + 2
      while (next < lines.length && /^\s*\|/.test(lines[next])) {
        rows.push(splitTableRow(lines[next]))
        next += 1
      }
      const { kind, map } = classifyTable(headers)
      blocks.push({ type: 'table', headers, rows, kind, map })
      index = next
      continue
    }
    buffer.push(lines[index])
    index += 1
  }
  flush()
  return blocks
}

function parseConditions(content) {
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n')
  const items = []
  const lead = []
  let current = null

  const startPrefixed = /^\s*\*\*\s*([A-ZА-Я]\d+[a-zа-я]?)\.\s*([^*]+?)\s*\.?\s*\*\*\s*(.*)$/
  const startNumbered = /^\s*(\d+)[.)]\s+\*\*\s*([^*]+?)\s*\.?\s*\*\*\s*(.*)$/

  const push = () => {
    if (!current) return
    const body = current.body.join('\n').trim()
    items.push({ id: current.id, title: current.title, body })
    current = null
  }

  for (const line of lines) {
    const prefixed = startPrefixed.exec(line)
    const numbered = startNumbered.exec(line)
    if (prefixed || numbered) {
      push()
      const id = prefixed ? prefixed[1] : numbered[1]
      const title = (prefixed ? prefixed[2] : numbered[2]).trim().replace(/\.$/, '')
      const rest = prefixed ? prefixed[3] : numbered[3]
      current = { id, title, body: [rest] }
      continue
    }
    if (current) current.body.push(line)
    else lead.push(line)
  }
  push()

  return {
    items,
    lead: items.length > 0 ? lead.join('\n').trim() : String(content ?? '').trim(),
  }
}

function classifyVerdictSection(title) {
  const name = normalizeHeading(title)
  if (/почему такой итог|краткий вывод|суть дела/.test(name)) return 'rationale'
  if (/мотивировка/.test(name)) return 'motivation'
  if (/сверка с v1/.test(name)) return 'reconciliation'
  if (/условия|требования к запуску/.test(name)) return 'conditions'
  if (/что проверено|проверенные утверждения/.test(name)) return 'theses'
  if (/границы|ограничения вердикта/.test(name)) return 'boundaries'
  if (/доказанные тезисы/.test(name)) return 'proven-list'
  if (/опровергнутые тезисы/.test(name)) return 'refuted-list'
  if (/неопределенн\w* тезисы/.test(name)) return 'uncertain-list'
  return 'other'
}

function extractLabeled(source, label) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const pattern = new RegExp(`^\\s*\\*\\*\\s*${label}\\s*:\\s*\\*\\*\\s*(.*)$`, 'i')
    const match = pattern.exec(lines[index])
    if (match) {
      let value = match[1].trim()
      let next = index + 1
      while (next < lines.length) {
        const line = lines[next]
        if (!line.trim()) break
        if (/^\s*#{1,6}\s+/.test(line)) break
        if (/^\s*\*\*[^*]+:\*\*/.test(line)) break
        value += ` ${line.trim()}`
        next += 1
      }
      return value
    }
  }
  const plain = new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, 'im').exec(String(source ?? ''))
  return plain ? plain[1].trim() : null
}

function countStatuses(rows) {
  const counts = {}
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1
  return counts
}

/**
 * Parse verdict.md (stage-1 and stage-2 variants, including the older
 * five-column table and numbered conditions).
 */
export function parseVerdict(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n').trim()
  if (!text) {
    return {
      available: false,
      raw: '',
      title: 'Вердикт',
      statusRaw: null,
      status: null,
      statusKnown: false,
      decision: null,
      sections: [],
      rationale: '',
      motivation: '',
      summary: '',
      conditions: [],
      conditionsLead: '',
      theses: [],
      reconciliation: [],
      counts: {},
      reconciliationCounts: {},
      boundaries: '',
      hasThesesTable: false,
    }
  }

  const titleMatch = /^#\s+(.*)$/m.exec(text)
  const title = titleMatch ? titleMatch[1].trim() : 'Вердикт'
  const statusRaw = extractLabeled(text, 'Статус')
  const decision = extractLabeled(text, 'Решение')
  const { sections: rawSections } = splitByHeadingLevel(text, 2)

  const sections = []
  const theses = []
  const reconciliation = []
  let rationale = ''
  let motivation = ''
  let conditionsLead = ''
  let conditions = []
  let boundaries = ''
  let hasThesesTable = false
  let hasConditionsSection = false

  for (const rawSection of rawSections) {
    const key = classifyVerdictSection(rawSection.title)
    const blocks = buildSectionBlocks(rawSection.content)

    for (const block of blocks) {
      if (block.kind === 'theses') {
        const rows = block.rows
          .map((row) => {
            const cells = rowToObject(block.headers, row)
            const id = cleanInline(cells.id)
            const thesis = cells.thesis ?? ''
            if (!id && !thesis) return null
            const parsedStatus = classifyStatus(cells.status)
            return {
              id,
              thesis,
              statusRaw: parsedStatus.raw,
              status: parsedStatus.base,
              statusKnown: parsedStatus.known,
              qualifier: parsedStatus.qualifier,
              basis: cells.basis ?? '',
              confidence: cells.confidence ?? '',
              group: groupOfId(id),
              sectionTitle: rawSection.title,
            }
          })
          .filter(Boolean)
        if (rows.length > 0) {
          block.kind = 'theses'
          block.rows = rows
          theses.push(...rows)
          hasThesesTable = true
        } else {
          block.kind = 'generic'
        }
      } else if (block.kind === 'reconciliation') {
        const rows = block.rows
          .map((row) => {
            const cells = rowToObject(block.headers, row)
            const id = cleanInline(cells.id)
            if (!id && !cells.required && !cells.done) return null
            const parsedStatus = classifyStatus(cells.status)
            return {
              id,
              required: cells.required ?? '',
              done: cells.done ?? '',
              statusRaw: parsedStatus.raw,
              status: parsedStatus.base,
              statusKnown: parsedStatus.known,
            }
          })
          .filter(Boolean)
        if (rows.length > 0) {
          block.kind = 'reconciliation'
          block.rows = rows
          reconciliation.push(...rows)
        } else {
          block.kind = 'generic'
        }
      }
    }

    if (key === 'rationale' && !rationale) rationale = rawSection.content
    if (key === 'motivation' && !motivation) motivation = rawSection.content
    if (key === 'boundaries' && !boundaries) boundaries = rawSection.content

    const sectionEntry = { key, title: rawSection.title, content: rawSection.content, blocks }
    if (key === 'conditions') {
      hasConditionsSection = true
      const parsed = parseConditions(rawSection.content)
      sectionEntry.conditions = parsed.items
      sectionEntry.conditionsLead = parsed.lead
      if (parsed.items.length > 0) {
        if (!conditionsLead) conditionsLead = parsed.lead
        conditions = parsed.items
      }
    }

    sections.push(sectionEntry)
  }

  const summarySource = firstParagraph(rationale) || firstParagraph(motivation) || decision || ''

  return {
    available: true,
    raw: text,
    title,
    statusRaw: statusRaw ? cleanInline(statusRaw) : null,
    status: statusRaw ? cleanInline(statusRaw) : null,
    statusKnown: null,
    statusQualifier: '',
    decision,
    sections,
    rationale,
    motivation,
    summary: summarySource,
    conditions,
    conditionsLead,
    hasConditionsSection,
    theses,
    reconciliation,
    counts: countStatuses(theses),
    reconciliationCounts: countStatuses(reconciliation),
    boundaries,
    hasThesesTable,
  }
}

function stripLeadingDuplicateHeading(content, title) {
  const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n')
  let index = 0
  while (index < lines.length && !lines[index].trim()) index += 1
  const match = /^#\s+(.*)$/.exec(lines[index] ?? '')
  if (match && normalizeHeading(match[1]) === normalizeHeading(title)) {
    lines.splice(index, 1)
    return lines.join('\n').trim()
  }
  return String(content ?? '').trim()
}

function parseEvidenceRows(content) {
  const rows = []
  for (const table of parseTables(content)) {
    const map = mapColumns(table.headers)
    if (map.id === undefined) continue
    if (map.claim === undefined && map.source === undefined) continue
    for (const row of table.rows) {
      const cells = rowToObject(table.headers, row)
      const id = cleanInline(cells.id)
      if (!id && !cells.claim) continue
      const typeRaw = cleanInline(cells.type)
      const types = typeRaw
        .split(/[\/,;]+|\s+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
      const reliability = cleanInline(cells.reliability)
      const limits = cleanInline(cells.limits)
      const assumption = types.includes('A')
      const lowReliability = /низк/i.test(reliability)
      rows.push({
        id,
        typeRaw,
        types,
        source: cells.source ?? '',
        claim: cells.claim ?? '',
        reliability,
        limits,
        assumption,
        lowReliability,
        unverified: assumption || lowReliability || /не провер|непровер|допущен/i.test(limits),
      })
    }
  }
  return rows
}

const EVIDENCE_MATCHER = [{ key: 'evidence', test: (title) => /реестр доказательств/i.test(title) }]
const GAPS_MATCHER = [{ key: 'gaps', test: (title) => /чего не хватает/i.test(title) }]

function uniqueIds(content) {
  const found = new Set()
  const pattern = /\b[CDNSUX]\d+[a-zа-яА-Я]?\b/g
  let match = pattern.exec(String(content ?? ''))
  while (match) {
    found.add(match[0])
    match = pattern.exec(String(content ?? ''))
  }
  return found
}

const TRANSCRIPT_MATCHERS = [
  { key: 'position-prosecution', test: (title) => /^позиция обвинения(\s+v2)?$/i.test(normalizeHeading(title)) },
  { key: 'position-defense', test: (title) => /^позиция защиты(\s+v2)?$/i.test(normalizeHeading(title)) },
  ...Array.from({ length: 4 }, (_value, index) => {
    const round = index + 1
    return [
      {
        key: `round-${round}-prosecution`,
        test: (title) => new RegExp(`^раунд ${round} обвинение(\\s+v2)?$`, 'i').test(normalizeHeading(title)),
      },
      {
        key: `round-${round}-defense`,
        test: (title) => new RegExp(`^раунд ${round} защита(\\s+v2)?$`, 'i').test(normalizeHeading(title)),
      },
    ]
  }).flat(),
]

/**
 * Parse transcript.md / transcript-v2.md into positions and debate rounds.
 * Recognised sections keep their original heading; any other structure is kept
 * as an ordered fallback section so no material is silently dropped.
 */
export function parseTranscript(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n').trim()
  const result = {
    available: Boolean(text),
    raw: text,
    sections: [],
    positions: { prosecution: null, defense: null },
    rounds: [],
    evidence: { prosecution: [], defense: [] },
    gaps: { prosecution: null, defense: null },
    fallback: false,
    knownSections: 0,
    idCount: 0,
  }
  if (!text) return result

  let parsed = splitAtMatchers(text, TRANSCRIPT_MATCHERS, 2)
  if (parsed.sections.length === 0) {
    const fallback = splitByHeadingLevel(text, 2)
    result.fallback = true
    if (fallback.sections.length > 0) {
      parsed = {
        preamble: fallback.preamble,
        sections: fallback.sections.map((section, index) => ({
          key: `section-${index + 1}`,
          title: section.title,
          content: section.content,
        })),
      }
    } else {
      parsed = {
        preamble: '',
        sections: [{ key: 'full-transcript', title: 'Стенограмма', content: text }],
      }
    }
  }

  for (const section of parsed.sections) {
    const roundMatch = /^round-(\d+)-(prosecution|defense)$/.exec(section.key)
    const positionMatch = /^position-(prosecution|defense)$/.exec(section.key)
    const side = roundMatch
      ? roundMatch[2]
      : (positionMatch ? positionMatch[1] : null)

    let body = stripLeadingDuplicateHeading(section.content, section.title)
    let evidence = []
    let gaps = null

    if (side) {
      const withoutEvidence = stripSubsections(body, EVIDENCE_MATCHER)
      evidence = parseEvidenceRows(withoutEvidence.removed[0]?.body ?? '')
      const withoutGaps = stripSubsections(withoutEvidence.body, GAPS_MATCHER)
      gaps = withoutGaps.removed[0]?.body ?? null
      body = withoutGaps.body
    }

    const item = {
      key: section.key,
      title: section.title,
      content: section.content,
      body,
      side,
      round: roundMatch ? Number(roundMatch[1]) : null,
      evidence,
      gaps,
      missingMarker: /Позиция не получена|Вердикт не получен|не завершил работу до дедлайна|материал отсутствует/i.test(body),
      mentionedIds: uniqueIds(body).size,
    }
    result.sections.push(item)
    if (positionMatch) result.positions[side] = item
    if (roundMatch) {
      let round = result.rounds.find((entry) => entry.number === item.round)
      if (!round) {
        round = { number: item.round, prosecution: null, defense: null }
        result.rounds.push(round)
      }
      if (!round[side]) round[side] = item
    }
  }

  result.rounds.sort((a, b) => a.number - b.number)
  result.knownSections = parsed.sections.filter((section) => !section.key.startsWith('section-') && section.key !== 'full-transcript').length
  result.evidence.prosecution = result.positions.prosecution?.evidence ?? []
  result.evidence.defense = result.positions.defense?.evidence ?? []
  result.gaps.prosecution = result.positions.prosecution?.gaps ?? null
  result.gaps.defense = result.positions.defense?.gaps ?? null
  result.idCount = uniqueIds(text).size
  return result
}

/** Parse case.md: idea, context, assumptions, boundaries, success criteria. */
export function parseCase(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n').trim()
  const { sections } = splitByHeadingLevel(text, 2)
  const find = (pattern) => sections.find((section) => pattern.test(normalizeHeading(section.title))) ?? null

  const titleMatch = /^#\s+(.*)$/m.exec(text)
  let title = titleMatch ? titleMatch[1].trim() : ''
  const quoted = /«([^»]+)»/.exec(title)
  if (quoted) title = quoted[1].trim()

  const parseBullets = (content) => {
    const lines = String(content ?? '').replace(/\r\n?/g, '\n').split('\n')
    const items = []
    let current = null
    const push = () => {
      if (!current) return
      const idMatch = /^([A-ZА-Я]?\d+[a-zа-я]?)[.)]\s+(.*)$/.exec(current.text)
      const id = idMatch ? idMatch[1] : null
      const body = idMatch ? idMatch[2] : current.text
      items.push({ id, text: body.trim(), raw: current.text.trim() })
      current = null
    }
    for (const line of lines) {
      const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
      if (bullet) {
        push()
        current = { text: bullet[1].trim() }
        continue
      }
      if (current && line.trim() && !/^#{1,6}\s+/.test(line)) {
        current.text += ` ${line.trim()}`
        continue
      }
      if (!line.trim()) push()
    }
    push()
    return items
  }

  const assumptionSection = find(/явные предположения|предположения/)
  const questionSection = find(/открытые вопросы/)
  const sourceSection = find(/доступные материалы|источники/)
  const successSection = find(/критерий успеха/)
  const ideaSection = find(/исходная идея/)
  const factsSection = find(/уточнённые факты/)
  const boundariesSection = find(/границы рассмотрения/)

  return {
    available: Boolean(text),
    raw: text,
    title,
    sections,
    idea: ideaSection?.content ?? '',
    facts: factsSection?.content ?? '',
    assumptions: assumptionSection ? parseBullets(assumptionSection.content) : [],
    assumptionsRaw: assumptionSection?.content ?? '',
    questions: questionSection ? parseBullets(questionSection.content) : [],
    questionsRaw: questionSection?.content ?? '',
    sources: sourceSection?.content ?? '',
    success: successSection?.content ?? '',
    boundaries: boundariesSection?.content ?? '',
  }
}

const COMPARISON_MATCHERS = [
  { key: 'improved', test: (title) => /что улучшилось/.test(normalizeHeading(title)) },
  { key: 'retained', test: (title) => /какие проблемы сохранились/.test(normalizeHeading(title)) },
  { key: 'appeared', test: (title) => /какие проблемы появились/.test(normalizeHeading(title)) },
  { key: 'preference', test: (title) => /какой вариант предпочтительнее/.test(normalizeHeading(title)) },
  { key: 'verdict2', test: (title) => /вердикт v2/.test(normalizeHeading(title)) },
  { key: 'procedure', test: (title) => /регламент повторного суда/.test(normalizeHeading(title)) },
]

export function parseComparison(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n').trim()
  const result = {
    available: Boolean(text),
    raw: text,
    title: '',
    v1Status: null,
    v2Status: null,
    duration: null,
    sections: {},
    hasRequiredSections: false,
    fallback: false,
  }
  if (!text) return result

  const titleMatch = /^#\s+(.*)$/m.exec(text)
  result.title = titleMatch ? titleMatch[1].trim() : 'Сравнение V1 и V2'
  const v1 = /\*\*V1:\*\*\s*([^*·\n]+)/i.exec(text)
  const v2 = /\*\*V2:\*\*\s*([^*·\n]+)/i.exec(text)
  result.v1Status = v1 ? cleanInline(v1[1]) : null
  result.v2Status = v2 ? cleanInline(v2[1]) : null
  const duration = /Повторный суд:\*\*\s*([0-9]+\s*с[^·\n]*)/i.exec(text)
  result.duration = duration ? cleanInline(duration[1]) : null

  let parsed = splitAtMatchers(text, COMPARISON_MATCHERS, 2)
  if (parsed.sections.length === 0) {
    result.fallback = true
    parsed = splitByHeadingLevel(text, 2)
    result.sections.other = parsed.sections.map((section) => ({ title: section.title, content: section.content }))
    result.hasRequiredSections = false
    return result
  }

  for (const section of parsed.sections) {
    result.sections[section.key] = { title: section.title, content: section.content }
  }
  result.hasRequiredSections = ['improved', 'retained', 'appeared', 'preference']
    .every((key) => Boolean(result.sections[key]?.content?.trim()))
  return result
}

const RECONSTRUCTION_MATCHERS = [
  { key: 'request', test: (title) => /^0 запрос пользователя/.test(normalizeHeading(title)) },
  { key: 'draft', test: (title) => /^1 черновик v2/.test(normalizeHeading(title)) },
  { key: 'audit', test: (title) => /^2 независимая рецензия/.test(normalizeHeading(title)) },
  { key: 'final', test: (title) => /^3 итоговая редакция v2/.test(normalizeHeading(title)) },
  { key: 'unresolved', test: (title) => /^3a /.test(normalizeHeading(title)) },
  { key: 'revision', test: (title) => /^4 редакция после замечаний/.test(normalizeHeading(title)) },
]

function classifyReconstructionSubsection(title) {
  const name = normalizeHeading(title)
  if (/что меняется/.test(name)) return 'changes'
  if (/сохраненные сильные стороны|сильные стороны v1/.test(name)) return 'strengths'
  if (/рассмотренные альтернативы/.test(name)) return 'alternatives'
  if (/итоговая концепция v2/.test(name)) return 'concept'
  if (/нерешенное|допущения/.test(name)) return 'unresolved'
  if (/что изменено по рецензии/.test(name)) return 'auditChanges'
  return 'other'
}

export function parseReconstruction(source, ideaV2Source = '') {
  const text = String(source ?? '').replace(/\r\n?/g, '\n').trim()
  const ideaV2 = String(ideaV2Source ?? '').replace(/\r\n?/g, '\n').trim()
  const result = {
    available: Boolean(text),
    raw: text,
    title: '',
    request: '',
    draft: '',
    audit: '',
    finalEdition: '',
    finalAvailable: false,
    workingEdition: '',
    workingFromDraft: false,
    concept: '',
    conceptSource: 'none',
    auditSummary: '',
    changes: null,
    strengths: '',
    alternatives: '',
    unresolved: '',
    revisions: 0,
    subsections: {},
  }

  if (ideaV2) {
    const titleMatch = /^#\s+(.*)$/m.exec(ideaV2)
    result.concept = titleMatch ? ideaV2.slice(ideaV2.indexOf('\n') + 1).trim() : ideaV2
    result.conceptSource = 'idea-v2.md'
  }

  if (!text) {
    result.concept = result.concept || ''
    return result
  }

  const titleMatch = /^#\s+(.*)$/m.exec(text)
  result.title = titleMatch ? titleMatch[1].trim() : 'Реконструкция V2'
  const parsed = splitAtMatchers(text, RECONSTRUCTION_MATCHERS, 2)
  for (const section of parsed.sections) {
    if (section.key === 'request') result.request = section.content
    if (section.key === 'draft') result.draft = section.content
    if (section.key === 'audit') result.audit = section.content
    if (section.key === 'final') {
      result.finalEdition = section.content
      result.finalAvailable = true
    }
    if (section.key === 'revision') {
      result.revisions += 1
      result.finalEdition = section.content
      result.finalAvailable = true
    }
    if (section.key === 'unresolved' && section.content) result.unresolved = section.content
  }

  if (!result.finalEdition && result.draft) {
    result.workingEdition = result.draft
    result.workingFromDraft = true
  } else {
    result.workingEdition = result.finalEdition
  }

  if (result.workingEdition) {
    const { sections } = splitByHeadingLevel(result.workingEdition, 2)
    for (const section of sections) {
      const key = classifyReconstructionSubsection(section.title)
      result.subsections[key] = { title: section.title, content: section.content }
      if (key === 'changes') {
        const table = parseTables(section.content)
          .find((candidate) => {
            const map = mapColumns(candidate.headers)
            return map.change !== undefined || map.justification !== undefined
          })
        if (table) result.changes = table
      }
      if (key === 'strengths') result.strengths = section.content
      if (key === 'alternatives') result.alternatives = section.content
      if (key === 'concept' && result.conceptSource !== 'idea-v2.md') {
        result.concept = section.content
        result.conceptSource = result.workingFromDraft ? 'draft' : 'reconstruction.md'
      }
      if (key === 'unresolved') result.unresolved = section.content
    }
  }

  result.auditSummary = firstParagraph(result.audit)
  return result
}
