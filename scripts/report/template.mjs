/**
 * HTML template for the standalone verdict report.
 *
 * Every dynamic value is escaped or rendered through the safe Markdown subset;
 * the generated file contains no external resources and no server dependency.
 */
import {
  escapeAttr,
  escapeHtml as esc,
  renderInline,
  renderMarkdown,
  renderTableHtml,
} from './text.mjs'
import { REPORT_CSS } from './styles.mjs'
import { REPORT_JS } from './client.mjs'

const TYPE_LABELS = {
  M: 'материал дела',
  W: 'внешний источник',
  C: 'расчёт',
  A: 'допущение',
}

const PHASE_LABELS = {
  preparation: 'Подготовка',
  debate: 'Дебаты',
  verdict: 'Вердикт',
}

const STAGE_STATUS_LABELS = {
  completed: 'завершена',
  failed: 'неудачна',
  skipped: 'пропущена',
  awaiting_approval: 'ожидает утверждения',
  declined: 'отклонена',
  none: 'не начиналась',
}

const APPROVAL_LABELS = {
  approved: 'утверждено',
  changes: 'требуются изменения',
  stop: 'процесс остановлен',
}

const CHECKPOINT_LABELS = {
  offer: 'предложение сделано',
  reconstruct: 'запущена реконструкция',
  finish: 'дело завершено',
}

function stageStatusLabel(value) {
  return STAGE_STATUS_LABELS[value] || value || '—'
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'item'
}

function secondsBetween(start, end) {
  if (!start || !end) return null
  const first = new Date(start).getTime()
  const second = new Date(end).getTime()
  if (Number.isNaN(first) || Number.isNaN(second)) return null
  return Math.max(0, Math.round((second - first) / 1000))
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest} с`
  return `${minutes} мин ${rest} с`
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} МБ`
}

function toneForThesis(status) {
  switch (status) {
    case 'доказано': return 'proven'
    case 'опровергнуто': return 'refuted'
    case 'неопределено': return 'undetermined'
    case 'не доказано': return 'unproven'
    default: return 'neutral'
  }
}

function toneForReconciliation(status) {
  switch (status) {
    case 'закрыто': return 'closed'
    case 'частично': return 'partial'
    case 'не закрыто': return 'open'
    default: return 'neutral'
  }
}

function statusChip(statusRaw, status, className = 'chip') {
  return `<span class="${className} chip--${toneForThesis(status)}">${esc(statusRaw)}</span>`
}

function reconciliationChip(statusRaw, status) {
  return `<span class="chip chip--${toneForReconciliation(status)}">${esc(statusRaw)}</span>`
}

function verdictBadge(display) {
  return `<span class="badge badge--${display.tone}">${esc(display.text)}</span>`
}

function renderDecisionBlock(verdict, model) {
  if (!verdict.decision) return ''
  return `<div class="decision">
      <p class="decision__label">Решение Судьи</p>
      <p class="decision__text">${inline(verdict.decision, model)}</p>
    </div>`
}

function inline(text, model) {
  return renderInline(text, { fileResolver: model.resolveFile, linkTarget: true })
}

function markdown(text, model, headingOffset = 3) {
  return renderMarkdown(text, {
    headingOffset,
    fileResolver: model.resolveFile,
    linkTarget: true,
  })
}

function renderNotice(text, tone = 'warning') {
  const icon = tone === 'danger' ? '!' : (tone === 'success' ? '✓' : 'i')
  return `<div class="notice notice--${tone}"><span class="notice__icon" aria-hidden="true">${icon}</span><p>${text}</p></div>`
}

function renderSectionHeader(kicker, title, note = '') {
  return `<header class="section-header">
  <div><span class="section-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2></div>
  ${note ? `<p class="section-header__note">${note}</p>` : ''}
</header>`
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function renderSummaryItems(items, model, kind, hearing) {
  if (items.length === 0) {
    const text = kind === 'action'
      ? 'В вердикте не выделены отдельные условия запуска или рекомендации.'
      : 'В таблице вердикта нет доказанных пунктов этого вида.'
    return `<p class="summary-card__empty">${text}</p>`
  }

  const visible = items.slice(0, 3)
  return `<ol>${visible.map((item) => {
    const id = item.id || '—'
    if (kind === 'action') {
      const title = item.title || ''
      const text = item.body || ''
      return `<li><span class="mini-id">${esc(id)}</span><span>${title ? `<strong>${inline(title, model)}.</strong> ` : ''}${text ? `<span class="summary-card__body">${inline(text, model)}</span>` : ''}</span></li>`
    }
    const text = item.thesis || ''
    return `<li><span class="mini-id">${esc(id)}</span><span>${inline(text, model)}</span>${item.statusRaw ? `<span class="chip chip--${toneForThesis(item.status)} summary-card__status">${esc(item.statusRaw)}</span>` : ''}</li>`
  }).join('')}</ol>
  ${items.length > 3 ? `<p class="summary-card__more"><a href="#verdict">Ещё ${items.length - 3} — в разделе «Вердикт»</a></p>` : ''}`
}

function renderHeroVersion(model, hearing) {
  const verdict = hearing === 1 ? model.verdict1 : model.verdict2
  const display = hearing === 1 ? model.display1 : model.display2
  const highlights = hearing === 1 ? model.highlights1 : model.highlights2
  const label = hearing === 1 ? 'V1' : 'V2'

  if (!verdict.available) {
    return `<div class="hero__verdict" data-hearing="${hearing}" id="hero-v${hearing}">
      ${verdictBadge(display)}
      ${renderNotice(`Вердикт ${label} не получен: файл отсутствует или пуст. Отчёт не восстанавливает его текст.`, 'danger')}
    </div>`
  }

  const decision = renderDecisionBlock(verdict, model)
  const decisionMissing = verdict.decision
    ? ''
    : '<p class="hero__decision-missing">Отдельная формулировка решения в вердикте не выделена. Полное обоснование и условия — в разделе «Вердикт».</p>'

  return `<div class="hero__verdict" data-hearing="${hearing}" id="hero-v${hearing}">
  <div class="hero__statusline">
    ${verdictBadge(display)}
    <span class="hero__version">Вердикт ${label}</span>
    ${verdict.statusQualifier ? `<span class="muted small">${esc(verdict.statusQualifier)}</span>` : ''}
  </div>
  ${decision}
  ${decisionMissing}
  <div class="hero__cards">
    <article class="summary-card summary-card--merit">
      <h3>Ключевые достоинства <span class="summary-card__count">${highlights.merits.length}</span></h3>
      <p class="summary-card__hint">Доказанные тезисы защиты и опровергнутые обвинения.</p>
      ${renderSummaryItems(highlights.merits, model, 'merit', hearing)}
    </article>
    <article class="summary-card summary-card--defect">
      <h3>Критические недостатки <span class="summary-card__count">${highlights.defects.length}</span></h3>
      <p class="summary-card__hint">Доказанные обвинения и опровергнутые тезисы защиты.</p>
      ${renderSummaryItems(highlights.defects, model, 'defect', hearing)}
    </article>
    <article class="summary-card summary-card--action">
      <h3>Рекомендации <span class="summary-card__count">${verdict.conditions.length}</span></h3>
      <p class="summary-card__hint">Условия Судьи, сформулированные в вердикте.</p>
      ${renderSummaryItems(verdict.conditions, model, 'action', hearing)}
    </article>
  </div>
</div>`
}

function renderHero(model) {
  const meta = [
    model.case.id ? `<li><span>ID дела</span> <strong>${esc(model.case.id)}</strong></li>` : '',
    model.case.date ? `<li><span>Дата</span> <strong>${esc(model.case.date)}</strong></li>` : '',
    model.procedure.outcome.rounds !== null
      ? `<li><span>Раундов дебатов</span> <strong>${esc(model.procedure.outcome.rounds)}</strong></li>`
      : '',
    model.procedure.hearings[0]?.total !== null && model.procedure.hearings[0]?.total !== undefined
      ? `<li><span>Длительность V1</span> <strong>${formatDuration(model.procedure.hearings[0].total)}</strong></li>`
      : '',
    model.hasV2 ? '<li><span>Разбирательств</span> <strong>два (V1 и V2)</strong></li>' : '',
  ].filter(Boolean).join('')

  return `<section id="overview" class="section hero" aria-labelledby="case-title">
  <div class="hero__kicker">
    <span>Судебное разбирательство · AI Tribunal</span>
    ${model.case.id ? `<span class="hero__case-id">${esc(model.case.id)}</span>` : ''}
    <span class="muted" data-version-label>Версия V1</span>
  </div>
  <h1 id="case-title">${esc(model.case.title)}</h1>
  <ul class="hero__meta">${meta}</ul>
  ${renderHeroVersion(model, 1)}
  ${model.hasV2 ? renderHeroVersion(model, 2) : ''}
  <p class="hero__method"><strong>Как читать сводку.</strong> Достоинства и недостатки собраны из таблицы вердикта без переформулирования: доказанные тезисы защиты и опровергнутые обвинения отнесены к достоинствам, доказанные обвинения и опровергнутые тезисы защиты — к недостаткам. Рекомендации — это условия Судьи. Если вердикт не позволяет отнести тезис к одной из групп, он остаётся в полной таблице ниже и не подменяется выводом отчёта.</p>
</section>`
}

/* ------------------------------------------------------------------ */
/* Verdict                                                             */
/* ------------------------------------------------------------------ */

function renderThesesTable(rows, { model, hearing, sectionKey }) {
  if (rows.length === 0) return renderNotice('Таблица тезисов распознана, но строки не найдены.', 'warning')

  const scope = `theses-${hearing}-${slug(sectionKey)}`
  const statuses = [...new Set(rows.map((row) => row.status))]
  const counts = {}
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1
  const hasConfidence = rows.some((row) => row.confidence)

  const buttons = [
    `<button type="button" class="filter-btn" data-filter-value="all" aria-pressed="true">Все <span class="count">${rows.length}</span></button>`,
    ...statuses.map((status) => `<button type="button" class="filter-btn" data-filter-value="${slug(status)}" aria-pressed="false">${esc(status)} <span class="count">${counts[status]}</span></button>`),
  ].join('')

  const body = rows.map((row, index) => {
    const anchor = `thesis-${hearing}-${slug(row.id || `row-${index}`)}`
    const search = [row.id, row.statusRaw, row.thesis, row.basis, row.confidence, row.group]
      .join(' ')
      .toLowerCase()
    return `<tr id="${anchor}" data-filter-row data-filter-value="${slug(row.status)}" data-search="${escapeAttr(search)}">
      <td><a class="id-chip" href="#${anchor}">${esc(row.id || '—')}</a></td>
      <td>${inline(row.thesis, model)}</td>
      <td>${statusChip(row.statusRaw, row.status)}</td>
      <td class="cell-basis">${inline(row.basis, model)}</td>
      ${hasConfidence ? `<td class="cell-basis">${inline(row.confidence, model)}</td>` : ''}
    </tr>`
  }).join('')

  return `<div class="thesis-block" data-filter-scope="${scope}">
  <div class="filterbar" role="group" aria-label="Фильтр тезисов">
    ${buttons}
    <label class="filter-search"><span class="sr-only">Поиск по тезисам</span><input type="search" data-filter-search placeholder="Поиск по ID, тезису или основанию"></label>
  </div>
  <p class="filter-status" data-filter-status aria-live="polite"></p>
  <div class="table-wrap">
    <table class="thesis-table">
      <caption class="sr-only">Тезисы вердикта ${hearing === 1 ? 'V1' : 'V2'}</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">Тезис</th><th scope="col">Статус</th><th scope="col">Основание</th>${hasConfidence ? '<th scope="col">Уверенность</th>' : ''}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  <p class="filter-empty" data-filter-empty hidden>По этому фильтру строк нет.</p>
</div>`
}

function renderReconciliationTable(rows, { model, hearing, sectionKey }) {
  if (rows.length === 0) return renderNotice('Таблица сверки с V1 распознана, но строки не найдены.', 'warning')

  const scope = `recon-${hearing}-${slug(sectionKey)}`
  const statuses = [...new Set(rows.map((row) => row.status))]
  const counts = {}
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1
  const buttons = [
    `<button type="button" class="filter-btn" data-filter-value="all" aria-pressed="true">Все <span class="count">${rows.length}</span></button>`,
    ...statuses.map((status) => `<button type="button" class="filter-btn" data-filter-value="${slug(status)}" aria-pressed="false">${esc(status)} <span class="count">${counts[status]}</span></button>`),
  ].join('')

  const body = rows.map((row, index) => {
    const anchor = `recon-${hearing}-${slug(row.id || `row-${index}`)}`
    const search = [row.id, row.required, row.done, row.statusRaw].join(' ').toLowerCase()
    return `<tr id="${anchor}" data-filter-row data-filter-value="${slug(row.status)}" data-search="${escapeAttr(search)}">
      <td><span class="id-chip">${esc(row.id || '—')}</span></td>
      <td>${inline(row.required, model)}</td>
      <td>${inline(row.done, model)}</td>
      <td>${reconciliationChip(row.statusRaw, row.status)}</td>
    </tr>`
  }).join('')

  return `<div class="thesis-block" data-filter-scope="${scope}">
  <div class="count-strip">${statuses.map((status) => `<span class="chip chip--${toneForReconciliation(status)}">${esc(status)} · ${counts[status]}</span>`).join('')}</div>
  <div class="filterbar" role="group" aria-label="Фильтр сверки с V1">
    ${buttons}
    <label class="filter-search"><span class="sr-only">Поиск по сверке</span><input type="search" data-filter-search placeholder="Поиск по ID, требованию или результату"></label>
  </div>
  <p class="filter-status" data-filter-status aria-live="polite"></p>
  <div class="table-wrap">
    <table class="recon-table">
      <caption class="sr-only">Сверка требований V1 с V2</caption>
      <thead><tr><th scope="col">ID V1</th><th scope="col">Что требовалось</th><th scope="col">Что сделано в V2</th><th scope="col">Статус</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  <p class="filter-empty" data-filter-empty hidden>По этому фильтру строк нет.</p>
</div>`
}

function renderConditionsSection(section, model, hearing) {
  const lead = section.conditionsLead
    ? `<div class="prose">${markdown(section.conditionsLead, model, 4)}</div>`
    : ''
  if (!section.conditions || section.conditions.length === 0) {
    return `<article class="verdict-block" id="v${hearing}-conditions">
      <h4>${esc(section.title)}</h4>
      ${lead || `<div class="prose">${markdown(section.content, model, 4)}</div>`}
    </article>`
  }
  const cards = section.conditions.map((item) => `<article class="condition-card">
    <header><span class="id-chip">${esc(item.id)}</span><h5>${inline(item.title, model)}</h5></header>
    ${item.body ? `<div class="prose">${markdown(item.body, model, 4)}</div>` : ''}
  </article>`).join('')
  return `<article class="verdict-block" id="v${hearing}-conditions">
    <h4>${esc(section.title)}</h4>
    ${lead}
    <div class="condition-list">${cards}</div>
  </article>`
}

function renderVerdictSection(section, model, hearing, index) {
  if (section.key === 'conditions') return renderConditionsSection(section, model, hearing)

  const parts = []
  for (const block of section.blocks) {
    if (block.type === 'markdown') {
      parts.push(markdown(block.text, model, 4))
      continue
    }
    if (block.type === 'table') {
      if (block.kind === 'theses') {
        parts.push(renderThesesTable(block.rows, { model, hearing, sectionKey: `${section.key}-${index}` }))
      } else if (block.kind === 'reconciliation') {
        parts.push(renderReconciliationTable(block.rows, { model, hearing, sectionKey: `${section.key}-${index}` }))
      } else {
        parts.push(renderTableHtml(block.headers, block.rows, { fileResolver: model.resolveFile, linkTarget: true }))
      }
    }
  }

  return `<article class="verdict-block" id="v${hearing}-${slug(section.key)}-${index}">
    <h4>${esc(section.title)}</h4>
    ${parts.join('') || renderNotice('Раздел вердикта пуст или не распознан.', 'warning')}
  </article>`
}

function renderVerdictChapter(model, hearing) {
  const verdict = hearing === 1 ? model.verdict1 : model.verdict2
  const label = hearing === 1 ? 'V1' : 'V2'

  if (!verdict.available) {
    return `<div class="version-panel" data-hearing="${hearing}" id="verdict-v${hearing}">
      <h3 class="version-title">Вердикт ${label}</h3>
      ${renderNotice(`Файл вердикта ${label} отсутствует или пуст. В отчёте действует протокольный маркер НЕДОСТАТОЧНО ДАННЫХ; текст вердикта не восстановлен.`, 'danger')}
    </div>`
  }

  const sections = verdict.sections.map((section, index) => renderVerdictSection(section, model, hearing, index)).join('')

  return `<div class="version-panel" data-hearing="${hearing}" id="verdict-v${hearing}">
  <h3 class="version-title">Вердикт ${label}</h3>
  <p class="version-lead">Полный текст: обоснование, условия, проверенные тезисы и границы. Статус и решение — в разделе <a href="#overview">«Суть вердикта»</a>.</p>
  ${sections || renderNotice('Структурированные разделы вердикта не распознаны. Ниже приведён исходный текст без изменений.', 'warning')}
  ${sections ? '' : `<div class="prose">${markdown(verdict.raw, model, 4)}</div>`}
</div>`
}

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

function renderArgumentAccordion(item, model, hearing, sideLabel, kindLabel) {
  const id = `arg-${hearing}-${slug(item.key)}`
  const sideClass = item.side === 'prosecution' ? 'prosecution' : (item.side === 'defense' ? 'defense' : 'neutral')
  const meta = [
    item.mentionedIds ? `ID: ${item.mentionedIds}` : '',
    item.evidence && item.evidence.length ? `доказательств: ${item.evidence.length}` : '',
  ].filter(Boolean).join(' · ')

  const missing = item.missingMarker
    ? renderNotice('В этом разделе зафиксировано отсутствие материала. Текст не восстановлен и не выдуман.', 'warning')
    : ''

  return `<details class="acc" id="${id}">
  <summary>
    <span class="acc__badge acc__badge--${sideClass}">${esc(sideLabel)}</span>
    <span class="acc__title">${esc(kindLabel)}</span>
    <span class="acc__meta">${esc(meta)}</span>
    <span class="acc__chevron" aria-hidden="true"></span>
  </summary>
  <div class="acc__body">
    ${missing}
    <div class="prose">${item.body ? markdown(item.body, model, 3) : renderNotice('Содержимое раздела пусто.', 'warning')}</div>
    ${item.evidence && item.evidence.length ? `<p class="acc__link">Реестр доказательств (${item.evidence.length}) — в разделе <a href="#evidence">«Доказательства»</a>. Там же перечислены ограничения источников.</p>` : ''}
  </div>
</details>`
}

function renderJudgeDecisions(model, hearing) {
  const verdict = hearing === 1 ? model.verdict1 : model.verdict2
  if (!verdict.available || verdict.theses.length === 0) {
    return `<div class="judge-decisions">
      <h4>Решения Судьи по спорным утверждениям</h4>
      ${renderNotice('Таблица тезисов вердикта не найдена; перечень решений не подставлен.', 'warning')}
    </div>`
  }
  return `<div class="judge-decisions">
    <h4>Решения Судьи по спорным утверждениям</h4>
    <p class="muted small">Решения по каждому из ${verdict.theses.length} тезисов приведены в таблице вердикта с ID, статусом и основанием. Отдельного пересказа здесь нет, чтобы не дублировать вердикт.</p>
    <p class="small"><a href="#verdict">Открыть таблицу решений →</a></p>
  </div>`
}

function renderArgumentsChapter(model, hearing) {
  const transcript = hearing === 1 ? model.transcript1 : model.transcript2
  const label = hearing === 1 ? 'V1' : 'V2'

  if (!transcript.available) {
    return `<div class="version-panel" data-hearing="${hearing}" id="arguments-v${hearing}">
      <h3 class="version-title">Аргументы сторон ${label}</h3>
      ${renderNotice(`Файл стенограммы ${label} отсутствует. Позиции сторон и дебаты не показаны.`, 'danger')}
    </div>`
  }

  if (transcript.fallback) {
    const items = transcript.sections.map((section) => renderArgumentAccordion(section, model, hearing, 'Материал', section.title)).join('')
    return `<div class="version-panel" data-hearing="${hearing}" id="arguments-v${hearing}">
      <h3 class="version-title">Аргументы сторон ${label}</h3>
      ${renderNotice('Структура стенограммы не распознана; разделы показаны в порядке файла.', 'warning')}
      ${items}
      ${renderJudgeDecisions(model, hearing)}
    </div>`
  }

  const parts = []
  const missingSides = []
  for (const [side, title, sideLabel] of [
    ['prosecution', 'Позиция обвинения', 'Прокурор'],
    ['defense', 'Позиция защиты', 'Адвокат'],
  ]) {
    const item = transcript.positions[side]
    if (item) parts.push(renderArgumentAccordion(item, model, hearing, sideLabel, title))
    else missingSides.push(sideLabel)
  }

  if (missingSides.length > 0) {
    parts.push(renderNotice(`Не найдены материалы: ${missingSides.join(', ')}. Аргументы не восстановлены.`, 'warning'))
  }

  const rounds = transcript.rounds.map((round) => {
    const roundParts = []
    if (round.prosecution) {
      roundParts.push(renderArgumentAccordion(round.prosecution, model, hearing, 'Прокурор', `Раунд ${round.number}`))
    }
    if (round.defense) {
      roundParts.push(renderArgumentAccordion(round.defense, model, hearing, 'Адвокат', `Раунд ${round.number}`))
    }
    return roundParts.join('')
  }).join('')

  parts.push(rounds || renderNotice('Раунды дебатов не найдены в стенограмме.', 'warning'))

  return `<div class="version-panel" data-hearing="${hearing}" id="arguments-v${hearing}">
    <h3 class="version-title">Аргументы сторон ${label}</h3>
    <p class="version-lead">Позиции и ответы приведены дословно. Отчёт не пересказывает дебаты и не добавляет аргументов.</p>
    ${parts.join('')}
    ${renderJudgeDecisions(model, hearing)}
  </div>`
}

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

function evidenceSearchText(entry) {
  return [entry.id, entry.typeRaw, entry.claim, entry.source, entry.reliability, entry.limits]
    .join(' ')
    .toLowerCase()
}

function renderEvidenceCard(entry, model) {
  const types = entry.types.length > 0 ? entry.types : ['—']
  const typeChips = types.map((type) => {
    const value = type.toLowerCase()
    const label = TYPE_LABELS[type] || 'тип не указан'
    return `<span class="chip chip--type chip--type-${esc(value)}">${esc(type)} · ${esc(label)}</span>`
  }).join('')
  const flags = [
    entry.assumption ? '<span class="chip chip--warn">допущение, не доказательство</span>' : '',
    entry.lowReliability ? '<span class="chip chip--warn">низкая надёжность</span>' : '',
  ].filter(Boolean).join('')
  const filterValue = entry.types.map((type) => type.toLowerCase()).join(' ') || 'none'

  return `<article class="evidence-card" data-filter-row data-filter-value="${escapeAttr(filterValue)}" data-filter-unverified="${entry.unverified ? 'true' : 'false'}" data-search="${escapeAttr(evidenceSearchText(entry))}">
    <header class="evidence-card__head">
      <span class="id-chip">${esc(entry.id || '—')}</span>
      ${typeChips}
      ${flags}
    </header>
    <p class="evidence-card__claim">${entry.claim ? inline(entry.claim, model) : '<span class="muted">Не указано, что подтверждает запись.</span>'}</p>
    <dl class="evidence-card__meta">
      <div><dt>Источник</dt><dd>${entry.source ? inline(entry.source, model) : '<span class="muted">не указан</span>'}</dd></div>
      ${entry.reliability ? `<div><dt>Надёжность</dt><dd>${inline(entry.reliability, model)}</dd></div>` : ''}
      ${entry.limits ? `<div><dt>Ограничения</dt><dd>${inline(entry.limits, model)}</dd></div>` : ''}
    </dl>
  </article>`
}

function renderEvidenceChapter(model, hearing) {
  const transcript = hearing === 1 ? model.transcript1 : model.transcript2
  const highlights = hearing === 1 ? model.highlights1 : model.highlights2
  const label = hearing === 1 ? 'V1' : 'V2'

  if (!transcript.available) {
    return `<div class="version-panel" data-hearing="${hearing}" id="evidence-v${hearing}">
      <h3 class="version-title">Доказательства ${label}</h3>
      ${renderNotice(`Стенограмма ${label} отсутствует; реестры доказательств и пробелы не показаны.`, 'danger')}
    </div>`
  }

  const prosecution = transcript.evidence.prosecution ?? []
  const defense = transcript.evidence.defense ?? []
  const all = [...prosecution, ...defense]
  const unverified = all.filter((entry) => entry.unverified)
  const typeCounts = {}
  for (const entry of all) {
    for (const type of entry.types) typeCounts[type] = (typeCounts[type] ?? 0) + 1
  }
  const typeOrder = ['M', 'W', 'C', 'A'].filter((type) => typeCounts[type])
  const scope = `evidence-${hearing}`

  const buttons = [
    `<button type="button" class="filter-btn" data-filter-value="all" aria-pressed="true">Все <span class="count">${all.length}</span></button>`,
    ...typeOrder.map((type) => `<button type="button" class="filter-btn" data-filter-value="${type.toLowerCase()}" aria-pressed="false">${type} · ${esc(TYPE_LABELS[type] || type)} <span class="count">${typeCounts[type]}</span></button>`),
    `<button type="button" class="filter-btn" data-filter-value="unverified" aria-pressed="false">Неподтверждённые <span class="count">${unverified.length}</span></button>`,
  ].join('')

  const groups = [
    { side: 'prosecution', title: 'Обвинение', entries: prosecution, gaps: transcript.gaps.prosecution },
    { side: 'defense', title: 'Защита', entries: defense, gaps: transcript.gaps.defense },
  ].map((group) => `<div class="evidence-group">
    <h4>${esc(group.title)} <span class="muted">реестр доказательств · ${group.entries.length}</span></h4>
    ${group.entries.length > 0
      ? `<div class="evidence-grid">${group.entries.map((entry) => renderEvidenceCard(entry, model)).join('')}</div>`
      : renderNotice(`Реестр доказательств стороны «${esc(group.title)}» не найден в стенограмме.`, 'warning')}
    ${group.gaps ? `<details class="acc acc--secondary"><summary><span class="acc__title">Чего не хватает для доказательства — ${esc(group.title)}</span><span class="acc__meta">позиция стороны</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(group.gaps, model, 3)}</div></div></details>` : ''}
  </div>`).join('')

  const uncertain = highlights.uncertain
  const uncertainList = uncertain.length > 0
    ? `<ul class="assumption-list">${uncertain.map((row) => {
      const anchor = `thesis-${hearing}-${slug(row.id)}`
      return `<li><span class="mini-id">${esc(row.id)}</span><span>${statusChip(row.statusRaw, row.status)} <a href="#${anchor}">основание в таблице вердикта</a></span></li>`
    }).join('')}</ul>`
    : '<p class="muted">В таблице вердикта нет тезисов со статусом «неопределено» или «не доказано».</p>'

  return `<div class="version-panel" data-hearing="${hearing}" id="evidence-v${hearing}">
    <h3 class="version-title">Доказательства ${label}</h3>
    <div class="thesis-block" data-filter-scope="${scope}">
      <div class="filterbar" role="group" aria-label="Фильтр доказательств">
        ${buttons}
        <label class="filter-search"><span class="sr-only">Поиск по доказательствам</span><input type="search" data-filter-search placeholder="Поиск по ID, источнику или утверждению"></label>
      </div>
      <p class="filter-status" data-filter-status aria-live="polite"></p>
      ${groups}
      <p class="filter-empty" data-filter-empty hidden>По этому фильтру записей нет.</p>
    </div>
    <div class="callout">
      <h3>Отметки о неподтверждённых утверждениях</h3>
      <p>В реестрах ${label}: <strong>${unverified.length}</strong> записей с типом A, низкой надёжностью или прямым ограничением источника. По вердикту не подтверждено тезисов: <strong>${uncertain.length}</strong>.</p>
      ${uncertainList}
    </div>
  </div>`
}

function renderEvidenceContext(model) {
  const assumptions = model.caseDoc.assumptions
  const assumptionList = assumptions.length > 0
    ? `<ul class="assumption-list">${assumptions.map((item) => `<li><span class="mini-id">${esc(item.id || '—')}</span><span>${inline(item.text, model)}</span></li>`).join('')}</ul>`
    : '<p class="muted">Раздел явных предположений не найден в case.md.</p>'

  return `<div class="evidence-context">
    <details class="acc acc--secondary">
      <summary><span class="acc__title">Явные предположения из case.md</span><span class="acc__meta">${assumptions.length}</span><span class="acc__chevron" aria-hidden="true"></span></summary>
      <div class="acc__body"><p class="muted small">Это условия задачи, а не доказательства. Отчёт не повышает их статус.</p>${assumptionList}</div>
    </details>
    <details class="acc acc--secondary">
      <summary><span class="acc__title">Доступные материалы и источники по case.md</span><span class="acc__meta">раздел 6</span><span class="acc__chevron" aria-hidden="true"></span></summary>
      <div class="acc__body"><div class="prose">${model.caseDoc.sources ? markdown(model.caseDoc.sources, model, 3) : '<p class="muted">Раздел не найден.</p>'}</div></div>
    </details>
    ${renderNotice('Ссылки на материалы дела ведут на файлы в этой же папке. Если файл, указанный в источнике, отсутствует, он показан как отсутствующий, а не как подтверждение.', 'warning')}
  </div>`
}

/* ------------------------------------------------------------------ */
/* Reconstruction                                                      */
/* ------------------------------------------------------------------ */

function renderReconstructionSection(model) {
  if (!model.hasReconstruction && !model.hasV2) return ''
  const reconstruction = model.reconstruction
  const stage2 = model.stage2
  const reconMeta = stage2?.reconstruction
  const duration = secondsBetween(reconMeta?.startedAt, reconMeta?.endedAt)
  const lastApproval = stage2?.approval?.decisions?.[stage2.approval.decisions.length - 1] ?? null
  const status = reconMeta?.status || (reconstruction.available ? 'материалы сохранены' : 'не проводилась')

  if (!reconstruction.available) {
    return `<section id="reconstruction" class="section" data-v2-only>
      ${renderSectionHeader('Этап 3 · реконструкция', 'Реконструкция V2', 'Раздел показан, потому что этап 2 зафиксирован в деле.')}
      ${renderNotice('Файл reconstruction.md отсутствует. Что изменилось и какие дефекты закрыты, из материалов дела установить нельзя.', 'danger')}
    </section>`
  }

  const userInput = stage2?.checkpoint?.userInput ?? {}
  const requestParts = [
    reconstruction.request,
    !reconstruction.request && userInput.goals ? `**Цели:** ${userInput.goals}` : '',
    !reconstruction.request && userInput.constraints ? `**Ограничения:** ${userInput.constraints}` : '',
    !reconstruction.request && userInput.note ? `**Примечание:** ${userInput.note}` : '',
  ].filter(Boolean)
  const request = requestParts.length > 0
    ? `<div class="prose">${markdown(requestParts.join('\n\n'), model, 3)}</div>`
    : renderNotice('Запрос пользователя на реконструкцию не найден в материалах.', 'warning')

  const changes = reconstruction.changes
    ? renderTableHtml(reconstruction.changes.headers, reconstruction.changes.rows, { fileResolver: model.resolveFile, linkTarget: true })
    : renderNotice('Таблица изменений R1..Rn не найдена в reconstruction.md. Проверьте файл напрямую.', 'warning')

  const reconRows = model.verdict2.reconciliation ?? []
  const closedCount = reconRows.filter((row) => row.status === 'закрыто').length
  const partialCount = reconRows.filter((row) => row.status === 'частично').length
  const openCount = reconRows.filter((row) => row.status === 'не закрыто').length
  const reconciliation = reconRows.length > 0
    ? `<div class="count-strip">
        <span class="chip chip--closed">закрыто · ${closedCount}</span>
        <span class="chip chip--partial">частично · ${partialCount}</span>
        <span class="chip chip--open">не закрыто · ${openCount}</span>
      </div>
      <p class="muted small">Постатейная сверка с требованиями V1 — в таблице «Сверка с V1» вердикта V2; что из этого следует для выбора версии — в разделе <a href="#comparison">«Сравнение V1/V2»</a>.
        <button type="button" class="icon-btn" data-goto-version="2" data-goto="#verdict">Открыть сверку V1/V2</button>
      </p>`
    : renderNotice(model.verdict2.available
      ? 'Таблица сверки V1/V2 в вердикте V2 не найдена; судьба требований V1 не определена.'
      : 'Вердикт V2 отсутствует; судьба требований V1 не определена.', 'warning')

  const concept = reconstruction.concept
    ? `<div class="prose">${markdown(reconstruction.concept, model, 3)}</div>
       <p class="muted small">Источник: ${esc(reconstruction.conceptSource === 'idea-v2.md' ? 'idea-v2.md (утверждённая концепция)' : reconstruction.conceptSource)}.</p>`
    : renderNotice('Итоговая концепция V2 не найдена ни в idea-v2.md, ни в reconstruction.md.', 'danger')

  const audit = reconstruction.audit
    ? `<details class="acc"><summary><span class="acc__title">Независимая рецензия Аудитора</span><span class="acc__meta">дословно</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(reconstruction.audit, model, 3)}</div></div></details>`
    : renderNotice('Рецензия Аудитора не найдена.', 'warning')

  const draft = reconstruction.draft
    ? `<details class="acc"><summary><span class="acc__title">Черновик Архитектора</span><span class="acc__meta">дословно</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(reconstruction.draft, model, 3)}</div></div></details>`
    : ''

  const alternatives = reconstruction.alternatives
    ? `<details class="acc"><summary><span class="acc__title">Рассмотренные альтернативы</span><span class="acc__meta">из итоговой редакции</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(reconstruction.alternatives, model, 3)}</div></div></details>`
    : ''

  const unresolved = reconstruction.unresolved
    ? `<details class="acc"><summary><span class="acc__title">Нерешённое и допущения реконструкции</span><span class="acc__meta">из материалов</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(reconstruction.unresolved, model, 3)}</div></div></details>`
    : ''

  return `<section id="reconstruction" class="section" data-v2-only>
    ${renderSectionHeader('Этап 3 · реконструкция', 'Реконструкция V2', 'Что изменилось, как закрывались требования V1 и что осталось в материалах.')}
    <div class="stat-grid">
      <div class="stat"><span class="stat__label">Статус</span><span class="stat__value">${esc(stageStatusLabel(status))}<small>${esc(status)}</small></span></div>
      <div class="stat"><span class="stat__label">Длительность</span><span class="stat__value">${formatDuration(duration)}<small>вне 780 секунд повторного суда</small></span></div>
      <div class="stat"><span class="stat__label">Правок по замечаниям</span><span class="stat__value">${esc(stage2?.reconstruction?.revisions ?? reconstruction.revisions ?? 0)}<small>после замечаний пользователя</small></span></div>
      <div class="stat"><span class="stat__label">Утверждение</span><span class="stat__value">${lastApproval ? esc(APPROVAL_LABELS[lastApproval.decision] || lastApproval.decision) : 'нет записи'}${lastApproval ? `<small>${esc(lastApproval.decision)}${lastApproval.emulated ? ' · согласие эмулировано' : ''}</small>` : ''}</span></div>
    </div>
    <details class="acc acc--secondary">
      <summary><span class="acc__title">Запрос пользователя на реконструкцию</span><span class="acc__meta">дословно</span><span class="acc__chevron" aria-hidden="true"></span></summary>
      <div class="acc__body">${request}</div>
    </details>
    <h3>Что изменилось</h3>
    ${changes}
    <h3>Судьба требований и дефектов V1</h3>
    ${reconciliation}
    <h3>Утверждённая концепция V2</h3>
    ${concept}
    ${audit}
    ${draft}
    ${alternatives}
    ${unresolved}
  </section>`
}

/* ------------------------------------------------------------------ */
/* Comparison                                                          */
/* ------------------------------------------------------------------ */

function renderComparisonCounts(model) {
  const order = ['доказано', 'опровергнуто', 'неопределено', 'не доказано']
  const all = [...new Set([
    ...Object.keys(model.verdict1.counts),
    ...Object.keys(model.verdict2.counts),
  ])]
  const statuses = [...order.filter((status) => all.includes(status)), ...all.filter((status) => !order.includes(status))]
  if (statuses.length === 0) return renderNotice('Таблицы тезисов не найдены; сравнение по статусам недоступно.', 'warning')
  return `<div class="table-wrap"><table>
    <thead><tr><th scope="col">Статус тезиса</th><th scope="col">V1</th><th scope="col">V2</th></tr></thead>
    <tbody>${statuses.map((status) => `<tr><td>${statusChip(status, status)}</td><td>${model.verdict1.counts[status] ?? 0}</td><td>${model.verdict2.counts[status] ?? 0}</td></tr>`).join('')}</tbody>
  </table></div>`
}

function renderComparisonSection(model) {
  if (!model.hasComparison) {
    if (!model.hasV2) return ''
    return `<section id="comparison" class="section" data-v2-only>
      ${renderSectionHeader('Этап 3 · сравнение', 'Сравнение V1 и V2', 'Сравнение опирается на статусы вердиктов; это отчёт, а не третье мнение.')}
      ${renderNotice('Файл comparison.md отсутствует. Сравнение V1/V2 в отчёт не включено; материалы V2 показаны в соответствующих разделах.', 'danger')}
    </section>`
  }
  const comparison = model.comparison
  const sections = comparison.sections ?? {}
  if (comparison.fallback) {
    return `<section id="comparison" class="section" data-v2-only>
      ${renderSectionHeader('Этап 3 · сравнение', 'Сравнение V1 и V2', 'Сравнение опирается на статусы вердиктов; это отчёт, а не третье мнение.')}
      ${renderNotice('Структура comparison.md не распознана. Ниже приведён файл в порядке сохранения; обязательные разделы не выделены.', 'warning')}
      <div class="prose">${markdown(comparison.raw, model, 3)}</div>
    </section>`
  }
  const cards = [1, 2].map((hearing) => {
    const display = hearing === 1 ? model.display1 : model.display2
    return `<article class="compare-card">
      <div class="compare-card__head"><h3>${hearing === 1 ? 'V1' : 'V2'}</h3>${verdictBadge(display)}</div>
      <p class="muted small">Решение, условия и полная таблица тезисов — в разделе «Вердикт».</p>
      <button type="button" class="icon-btn" data-goto-version="${hearing}" data-goto="#verdict">Открыть вердикт ${hearing === 1 ? 'V1' : 'V2'}</button>
    </article>`
  }).join('')

  const block = (key, title, extraClass = '') => {
    const content = sections[key]?.content
    return `<div class="callout ${extraClass}">
      <h3>${esc(title)}</h3>
      ${content ? `<div class="prose">${markdown(content, model, 3)}</div>` : renderNotice(`Раздел «${esc(title)}» не найден в comparison.md.`, 'warning')}
    </div>`
  }

  return `<section id="comparison" class="section" data-v2-only>
    ${renderSectionHeader('Этап 3 · сравнение', 'Сравнение V1 и V2', 'Сравнение опирается на статусы вердиктов; это отчёт, а не третье мнение.')}
    <div class="compare-grid">${cards}</div>
    <h3>Статусы тезисов</h3>
    ${renderComparisonCounts(model)}
    ${block('improved', 'Что улучшилось')}
    ${block('retained', 'Какие проблемы сохранились')}
    ${block('appeared', 'Какие проблемы появились')}
    ${block('preference', 'Какой вариант предпочтительнее', 'callout--recommendation')}
    <p class="muted small">Полный текст вердикта V2 приведён в разделе «Вердикт» и в файле verdict-v2.md.
      <button type="button" class="icon-btn" data-goto-version="2" data-goto="#verdict">Открыть вердикт V2</button>
    </p>
  </section>`
}

/* ------------------------------------------------------------------ */
/* Procedure and sources                                               */
/* ------------------------------------------------------------------ */

function renderHearing(hearing) {
  if (!hearing) return ''
  const phaseRows = hearing.phases.map((phase) => {
    const status = phase.status === 'completed'
      ? '<span class="chip chip--closed">завершена</span>'
      : (phase.status === 'timeout' ? '<span class="chip chip--open">таймаут</span>' : `<span class="chip">${esc(phase.status || '—')}</span>`)
    const deadline = phase.deadlineRemaining === null
      ? '—'
      : (phase.deadlineRemaining >= 0 ? `${phase.deadlineRemaining} с до дедлайна` : `превышение ${Math.abs(phase.deadlineRemaining)} с`)
    return `<tr>
      <td>${esc(PHASE_LABELS[phase.phase] || phase.phase)}</td>
      <td>${formatDuration(phase.duration)}</td>
      <td>${phase.limit ? `${phase.limit} с` : '—'}</td>
      <td>${status}</td>
      <td class="${phase.withinLimit === false ? 'cell-fail' : ''}">${esc(deadline)}</td>
    </tr>`
  }).join('')

  return `<div class="hearing-block">
    <h3>${esc(hearing.label)} <span class="muted small">${hearing.startedAt ? `старт ${esc(String(hearing.startedAt).replace('T', ' ').replace(/\.\d+Z$/, 'Z'))}` : ''}</span></h3>
    <div class="table-wrap"><table class="phases-table">
      <thead><tr><th scope="col">Фаза</th><th scope="col">Длительность</th><th scope="col">Лимит</th><th scope="col">Статус</th><th scope="col">Дедлайн</th></tr></thead>
      <tbody>${phaseRows}</tbody>
    </table></div>
    <p class="muted small">Итого: ${formatDuration(hearing.total)}${hearing.totalLimit ? ` из ${hearing.totalLimit} с` : ''}${hearing.rounds !== null && hearing.rounds !== undefined ? ` · раундов дебатов: ${hearing.rounds}` : ''}.</p>
  </div>`
}

function renderChecks(verification) {
  if (!verification || verification.checks.length === 0) return ''
  return `<details class="acc acc--secondary">
    <summary><span class="acc__title">Все проверки регламента</span><span class="acc__meta">${verification.total}</span><span class="acc__chevron" aria-hidden="true"></span></summary>
    <div class="acc__body">
      <div class="table-wrap"><table class="checks-table">
        <thead><tr><th scope="col">Проверка</th><th scope="col">Результат</th><th scope="col">Детали</th></tr></thead>
        <tbody>${verification.checks.map((check) => `<tr class="${check.ok ? '' : 'is-failed'}"><td>${esc(check.name)}</td><td class="${check.ok ? 'cell-ok' : 'cell-fail'}">${check.ok ? 'ok' : 'нарушение'}</td><td>${esc(check.detail || '')}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>
  </details>`
}

function renderVerificationCard(label, verification) {
  if (!verification) {
    return `<div class="verify-card"><h4>${esc(label)}</h4><p class="muted">Проверка не зафиксирована в log.json.</p></div>`
  }
  return `<div class="verify-card">
    <h4>${esc(label)}</h4>
    <div class="verify-card__value">${verification.ok ? 'Пройдена' : 'Есть нарушения'}<small>${verification.passed} из ${verification.total}</small></div>
    ${verification.failed.length > 0
      ? `<p>Нарушения: ${verification.failed.map((check) => esc(check.name)).join(', ')}</p>`
      : '<p>Нарушений не зафиксировано.</p>'}
  </div>`
}

function renderWarnings(warnings) {
  if (warnings.length === 0) return ''
  const sorted = [...warnings].sort((a, b) => (a.severity === b.severity ? 0 : (a.severity === 'warning' ? -1 : 1)))
  return `<ul class="warnings">${sorted.map((warning) => `<li data-severity="${escapeAttr(warning.severity)}"><span class="warn-mark" aria-hidden="true">${warning.severity === 'warning' ? '!' : 'i'}</span><span>${esc(warning.message)}</span></li>`).join('')}</ul>`
}

function renderSourcesTable(model) {
  const visibleSources = model.sourceFiles.filter((entry) => model.hasV2 || entry.stage !== 'V2')
  const rows = visibleSources.map((entry) => {
    const source = entry.source
    const exists = Boolean(source?.exists)
    const name = exists
      ? `<a href="${escapeAttr(encodeURI(entry.name))}" target="_blank" rel="noopener">${esc(entry.name)}</a>`
      : `<span class="file-ref file-ref--missing">${esc(entry.name)}</span>`
    return `<tr>
      <td>${name}</td>
      <td>${esc(entry.role)}</td>
      <td>${esc(entry.stage)}</td>
      <td>${exists ? formatBytes(source.bytes) : '—'}</td>
      <td>${exists && source.sha256 ? `<span class="nowrap">${esc(source.sha256.slice(0, 12))}</span>` : '—'}</td>
      <td>${exists ? '<span class="chip chip--closed">есть</span>' : '<span class="chip chip--open">нет файла</span>'}</td>
    </tr>`
  }).join('')

  return `<div class="table-wrap"><table class="sources-table">
    <thead><tr><th scope="col">Файл</th><th scope="col">Роль</th><th scope="col">Этап</th><th scope="col">Размер</th><th scope="col">SHA-256</th><th scope="col">Статус</th></tr></thead>
    <tbody>${rows}
      <tr>
        <td><span class="file-ref">${esc(model.generator.outputName)}</span></td>
        <td>Этот HTML-отчёт; создаётся из перечисленных файлов</td>
        <td>Этап 3</td>
        <td>—</td>
        <td>—</td>
        <td><span class="chip chip--closed">создан</span></td>
      </tr>
    </tbody>
  </table></div>`
}

function renderStage2Timeline(model) {
  const stage2 = model.stage2
  if (!stage2) return '<p class="muted">Этап 2 в log.json не зафиксирован.</p>'

  const items = []
  const checkpoint = stage2.checkpoint
  if (checkpoint) {
    items.push(`<li><strong>Контрольная точка:</strong> ${esc(CHECKPOINT_LABELS[checkpoint.decision] || checkpoint.decision || 'решение не записано')}${checkpoint.emulated ? ' (согласие эмулировано)' : ''}${checkpoint.decidedAt ? ` · ${esc(model.formatDateTime(checkpoint.decidedAt))}` : ''}</li>`)
  }
  const reconstruction = stage2.reconstruction
  if (reconstruction) {
    items.push(`<li><strong>Реконструкция:</strong> ${esc(stageStatusLabel(reconstruction.status))}${reconstruction.status ? ` (${esc(reconstruction.status)})` : ''} · ${formatDuration(secondsBetween(reconstruction.startedAt, reconstruction.endedAt))}${reconstruction.revisions ? ` · редакций: ${reconstruction.revisions}` : ''}</li>`)
  }
  const approval = stage2.approval
  if (approval?.decisions?.length) {
    for (const decision of approval.decisions) {
      items.push(`<li><strong>Утверждение V2:</strong> ${esc(APPROVAL_LABELS[decision.decision] || decision.decision)}${decision.emulated ? ' (эмулировано)' : ''}${decision.at ? ` · ${esc(model.formatDateTime(decision.at))}` : ''}${decision.note ? `<details class="acc acc--secondary"><summary><span class="acc__title">Примечание к решению</span><span class="acc__chevron" aria-hidden="true"></span></summary><div class="acc__body"><div class="prose">${markdown(decision.note, model, 3)}</div></div></details>` : ''}</li>`)
    }
  }
  if (stage2.status) items.push(`<li><strong>Статус этапа 2:</strong> ${esc(stage2.status)}${stage2.timedOut ? ' · таймаут' : ''}</li>`)

  return items.length > 0 ? `<ul class="timeline">${items.join('')}</ul>` : '<p class="muted">События этапа 2 не записаны.</p>'
}

function renderProcedureSection(model) {
  const procedure = model.procedure
  const stage2 = model.stage2
  const generator = model.generator

  const verificationCards = [
    renderVerificationCard('Проверка V1', procedure.verification1),
    procedure.verification2 && model.hasV2 ? renderVerificationCard('Проверка V2', procedure.verification2) : '',
  ].filter(Boolean).join('')

  return `<section id="procedure" class="section">
    ${renderSectionHeader('Служебный раздел', 'Материалы и регламент', 'Процедура, тайминги, проверки и файлы, из которых собран отчёт.')}
    ${renderWarnings(model.warnings)}
    <h3>Ход разбирательства</h3>
    ${procedure.hearings.map(renderHearing).join('') || '<p class="muted">Тайминги в log.json не зафиксированы.</p>'}
    <h3>Проверка регламента</h3>
    <div class="verify-grid">${verificationCards}</div>
    ${renderChecks(procedure.verification1)}
    ${procedure.verification2 && model.hasV2 ? renderChecks(procedure.verification2) : ''}
    ${stage2 ? `<h3>Этап 2: контрольная точка, реконструкция, утверждение</h3>${renderStage2Timeline(model)}` : ''}
    <h3>Файлы дела</h3>
    ${renderSourcesTable(model)}
    <h3>Как сформирован отчёт</h3>
    <div class="generator-note">
      <p><strong>Генератор:</strong> ${esc(generator.name)} ${esc(generator.version)} · <strong>данные дела по состоянию на:</strong> ${esc(generator.generatedAtDisplay || 'время не зафиксировано')} · <strong>дайджест источников:</strong> <code>${esc(generator.sourceDigestShort)}</code>.</p>
      <p><strong>Команда:</strong> <code>${esc(generator.command)}</code>. Отчёт создан из уже сохранённых Markdown/JSON-артефактов; LLM не используется для повторного написания вердикта, аргументов или доказательств.</p>
      <p><strong>Сохранение формулировок:</strong> статусы, решения и основания Судьи выводятся из ${model.hasV2 ? 'verdict.md/verdict-v2.md' : 'verdict.md'}; позиции сторон, раунды и реестры доказательств — из ${model.hasV2 ? 'transcript.md/transcript-v2.md' : 'transcript.md'}; ${model.hasV2 ? 'условия, реконструкция и сравнение — из соответствующих файлов.' : 'материалы V2 отсутствуют, поэтому разделы реконструкции и сравнения не создавались.'} Недостающие материалы помечены явно и не заменены реконструкцией.</p>
      <p><strong>Автономность:</strong> все стили, скрипты и данные встроены в этот файл. Отчёт открывается локально по <code>file://</code> без сервера и без подключения к интернету; внешние ресурсы не загружаются. Ссылки на исходные <code>.md</code>/<code>.json</code> ведут на файлы в этой же папке.</p>
      <p><strong>Навигация:</strong> переключение V1/V2, раскрывающиеся блоки и фильтры таблиц и доказательств работают без сети. При отключённом JavaScript остаются доступны все разделы и нативные раскрывающиеся блоки.</p>
    </div>
  </section>`
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function renderTopbar(model) {
  const versionSwitch = model.hasV2
    ? `<div class="segmented" role="group" aria-label="Версия разбирательства">
        <button type="button" data-version-btn="1" aria-pressed="true">V1</button>
        <button type="button" data-version-btn="2" aria-pressed="false">V2</button>
      </div>`
    : '<span class="pill">V1 · без реконструкции</span>'

  return `<header class="topbar">
    <div class="topbar__main">
      <a class="brand" href="#overview" aria-label="AI Tribunal — к началу отчёта">
        <span class="brand__mark" aria-hidden="true">§</span>
        <span class="brand__text">AI Tribunal<small>Отчёт разбирательства</small></span>
      </a>
      <div class="topbar__case">
        <span class="topbar__case-id">${esc(model.case.id)}</span>
        <span class="topbar__case-title">${esc(model.case.title)}</span>
      </div>
    </div>
    <div class="topbar__controls">
      ${versionSwitch}
      <button type="button" class="icon-btn" id="expand-toggle" aria-pressed="false">Развернуть</button>
      <button type="button" class="icon-btn" id="nav-toggle" aria-expanded="false" aria-controls="sidebar">Разделы</button>
    </div>
  </header>`
}

function renderSidebar(model) {
  const items = [
    { href: '#overview', title: 'Суть вердикта' },
    { href: '#verdict', title: 'Вердикт' },
    { href: '#arguments', title: 'Аргументы сторон' },
    { href: '#evidence', title: 'Доказательства' },
    ...(model.hasReconstruction || model.hasV2 ? [{ href: '#reconstruction', title: 'Реконструкция V2' }] : []),
    ...(model.hasComparison || model.hasV2 ? [{ href: '#comparison', title: 'Сравнение V1/V2' }] : []),
    { href: '#procedure', title: 'Материалы и регламент' },
  ]
  const links = items.map((item, index) => `<a class="nav-link" href="${item.href}"><span class="nav-link__num">${String(index + 1).padStart(2, '0')}</span><span>${esc(item.title)}</span></a>`).join('')

  return `<nav id="sidebar" class="sidebar" aria-label="Разделы отчёта">
    <div class="sidebar__inner">
      <p class="sidebar__label">Содержание</p>
      ${links}
    </div>
  </nav>`
}

function renderFooter(model) {
  return `<footer>
    <span>AI Tribunal · этап 3 · отчёт сформирован из материалов дела</span>
    <span>Данные дела по состоянию на ${esc(model.generator.generatedAtDisplay || 'время не зафиксировано')} · ${esc(model.generator.name)} ${esc(model.generator.version)}</span>
  </footer>`
}

function trimGeneratedWhitespace(document) {
  return document
    .split(/(<pre\b[\s\S]*?<\/pre>)/i)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/[ \t]+$/gm, '')))
    .join('')
}

export function renderReportHtml(model) {
  const description = [
    model.case.title,
    model.display1?.text ? `Вердикт V1: ${model.display1.text}.` : '',
    model.hasV2 && model.display2?.text ? `Вердикт V2: ${model.display2.text}.` : '',
    'Интерактивный отчёт AI Tribunal.',
  ].filter(Boolean).join(' ')

  const body = `<body data-version="1" data-has-v2="${model.hasV2 ? 'true' : 'false'}">
<a class="skip-link" href="#main">Перейти к содержанию</a>
${renderTopbar(model)}
<noscript><style>#main [data-hearing] { display: block !important; }</style><div class="notice notice--warning" style="margin:12px"><span class="notice__icon" aria-hidden="true">i</span><p>JavaScript отключён: переключение V1/V2 и фильтры недоступны. Все разделы и нативные раскрывающиеся блоки работают.</p></div></noscript>
<div class="layout">
  ${renderSidebar(model)}
  <main id="main">
    ${renderHero(model)}
    <section id="verdict" class="section">
      ${renderSectionHeader('Разбирательство', 'Вердикт', 'Обоснование, условия, проверенные тезисы и границы.')}
      ${renderVerdictChapter(model, 1)}
      ${model.hasV2 ? renderVerdictChapter(model, 2) : ''}
    </section>
    <section id="arguments" class="section">
      ${renderSectionHeader('Состязательный процесс', 'Аргументы сторон', 'Позиции, ответы в дебатах и решения Судьи по спорным утверждениям.')}
      ${renderArgumentsChapter(model, 1)}
      ${model.hasV2 ? renderArgumentsChapter(model, 2) : ''}
    </section>
    <section id="evidence" class="section">
      ${renderSectionHeader('Доказательная база', 'Доказательства', 'Реестры сторон, источники, ограничения и отметки о неподтверждённых утверждениях.')}
      <p class="evidence-legend">Тип M — материал дела, W — внешний источник, C — расчёт, A — допущение. Отметка «неподтверждённые» ставится по типу A, низкой надёжности или прямым оговоркам источника.</p>
      ${renderEvidenceChapter(model, 1)}
      ${model.hasV2 ? renderEvidenceChapter(model, 2) : ''}
      ${renderEvidenceContext(model)}
    </section>
    ${renderReconstructionSection(model)}
    ${renderComparisonSection(model)}
    ${renderProcedureSection(model)}
    ${renderFooter(model)}
  </main>
</div>
<button type="button" id="to-top" hidden aria-label="Вернуться наверх">↑</button>
<script>${REPORT_JS}</script>
</body>`

  return trimGeneratedWhitespace(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>${esc(model.case.title)} — вердикт AI Tribunal</title>
<meta name="description" content="${escapeAttr(description)}">
<meta name="generator" content="${escapeAttr(`${model.generator.name} ${model.generator.version}`)}">
<style>${REPORT_CSS}</style>
</head>
${body}
</html>
`)
}
