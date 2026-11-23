import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deriveHighlights } from '../scripts/report/model.mjs'
import { parseCase, parseComparison, parseTranscript, parseVerdict } from '../scripts/report/parse.mjs'
import { renderMarkdown, safeHref } from '../scripts/report/text.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'tribunal.mjs')
const GENERATOR = path.join(ROOT, 'scripts', 'verdict-report.mjs')
const PREFIX = `.stage3-test-${process.pid}`

const CASES = {
  v1: `cases/${PREFIX}-v1`,
  v2: `cases/${PREFIX}-v2`,
  empty: `cases/${PREFIX}-empty`,
  timeout: `cases/${PREFIX}-timeout`,
  nolog: `cases/${PREFIX}-nolog`,
}

function dirOf(relative) {
  return path.join(ROOT, relative)
}

function run(...args) {
  const output = execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return JSON.parse(output)
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${text.trim()}\n`, 'utf8')
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function writeStage1(caseDir) {
  write(path.join(caseDir, 'case.md'), `
# Дело «Stage 3 fixture»

## 1. Исходная идея и контекст
Тестовая идея для проверки HTML-отчёта. Пользователь предлагает пилот на 12 недель.

## 2. Уточнённые факты
- Компания — продуктовый разработчик ПО.
- Пилот добровольный.

## 3. Явные предположения
- П1. Зарплата сохраняется.
- П2. Режим обратим.

## 4. Границы рассмотрения
Входит пилот; не входит юридическая экспертиза.

## 5. Критерий успеха
Не падает выпуск; не растёт текучесть.

## 6. Доступные материалы и источники
- Данные компании не предоставлены.

## 7. Открытые вопросы
- Как измеряется выпуск.
`)

  write(path.join(caseDir, 'transcript.md'), `
# Стенограмма дела «Stage 3 fixture»

## Позиция обвинения

# Позиция обвинения

## 1. Суть обвинения
Критерии успеха не операционализированы. <script>window.__pwned=1</script> Идея не проверяема без базовой линии.

## 2. Обвинения

### C1. Критерии не операционализированы
- **Обвинение:** базовая линия отсутствует.
- **Доказательства:** E1, E2.

### C2. Идея не нужна
- **Обвинение:** есть более простые альтернативы.
- **Доказательства:** E1.

## 3. Реестр доказательств

| ID | Тип | Источник / данные | Что подтверждает | Надёжность | Ограничения |
|----|-----|-------------------|------------------|------------|-------------|
| E1 | M | \`case.md\` §5 | Критерии заданы качественно | высокая | Нет порогов |
| E2 | A | \`materials.md\` п. 3 | Базовая линия отсутствует | низкая | Не проверено; допущение |

## 4. Чего не хватает для доказательства

- Базовая линия и числовые пороги.

## 5. Границы обвинения

- Не оцениваю идею вне данного контекста.

## Позиция защиты

# Позиция защиты

## 1. Сильнейшая версия идеи
Пилот с базовой линией и обратимым режимом. <img src=x onerror=alert(1)>

## 2. Защитные тезисы

### D1. Пилот обратим
- **Тезис:** режим можно вернуть.

### D2. Риск ограничен
- **Тезис:** стоимость пилота известна. [подробнее](javascript:alert(1)) [внешний источник](https://example.com/report)

## 3. Реестр доказательств

| ID | Тип | Источник / данные | Что подтверждает | Надёжность | Ограничения |
|----|-----|-------------------|------------------|------------|-------------|
| E1 | C | 12 × 40 × 20% | Оценка человеко-часов | средняя | Натуральные единицы |

## Раунд 1 — обвинение

# Ответ обвинения — раунд 1

### D1 — принимаю частично
Обратимость не подтверждена процедурно.

## Раунд 1 — защита

# Ответ защиты — раунд 1

### C1 — принимаю
Согласен, что пороги нужно зафиксировать до старта.
`)

  write(path.join(caseDir, 'verdict.md'), `
# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
**Решение:** <script>window.__pwned=2</script> Проводить пилот только после фиксации метрик и процедуры возврата.

## 1. Почему такой итог

Идея допустима после операционализации метрик. В материалах есть <iframe src="https://evil.example"></iframe> и ссылка [плохая](javascript:alert(1)).

## 2. Условия

**U1. Метрики.** Зафиксировать базовую линию и пороги <img src=x onerror=alert(2)>.

**U2. Откат.** Описать процедуру остановки и возврата.

## 3. Что проверено

| ID | Тезис | Статус | Основание |
|----|-------|--------|-----------|
| C1 | Критерии не операционализированы | доказано | материалы дела |
| C2 | Идея не нужна | опровергнуто | альтернативы не доказаны |
| D1 | Пилот обратим | доказано | процедура возврата |
| D2 | Риск ограничен | неопределено | нет денежной оценки |

## 4. Границы

Внешние источники не проверялись. **Статус:** ОДОБРИТЬ С УСЛОВИЯМИ.
`)

  write(path.join(caseDir, 'report.md'), `
# Отчёт по делу «Stage 3 fixture»

## 5. Вердикт

# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ

Тестовый отчёт для проверки этапа 3.
`)
}

function writeStage2(caseDir) {
  write(path.join(caseDir, 'reconstruction.md'), `
# Реконструкция идеи V2

## 0. Запрос пользователя на реконструкцию

Сохранить оплату и горизонт; не увеличивать бюджет.

## 1. Черновик V2 (архитектор)

# Реконструкция идеи V2

## 1. Что меняется и почему

| # | Изменение | Дефект / условие V1 | Обоснование и механизм | Как проверяется | Риск изменения |
|---|-----------|---------------------|------------------------|-----------------|----------------|
| R1 | Зафиксировать базовую линию | V1:C1 | Ввести 8 недель замеров | Отчёт по метрикам | Задержка старта |

## 2. Сохранённые сильные стороны V1

Сохранена полная оплата на период пилота.

## 3. Рассмотренные альтернативы

### A1. Пилот на двух командах

- **Суть:** начать с двух команд.
- **Почему выбрана:** меньше риск.

## 4. Итоговая концепция V2

Черновая концепция: пилот на двух командах по 32 часа.

## 5. Нерешённое и допущения

Юрисдикция не уточнена.

## 2. Независимая рецензия (аудитор)

# Рецензия реконструкции V2

## 1. Итог

Черновик покрывает C1, но требует фиксации процедуры отката.

## 2. Покрытие V1

- C1 — закрыто частично.

## 3. Итоговая редакция V2 (архитектор)

# Реконструкция идеи V2

## 1. Что меняется и почему

| # | Изменение | Дефект / условие V1 | Обоснование и механизм | Как проверяется | Риск изменения |
|---|-----------|---------------------|------------------------|-----------------|----------------|
| R1 | Зафиксировать базовую линию | V1:C1 | Ввести 8 недель замеров | Отчёт по метрикам | Задержка старта |

## 2. Сохранённые сильные стороны V1

Сохранена полная оплата на период пилота.

## 3. Рассмотренные альтернативы

### A1. Пилот на двух командах

- **Суть:** начать с двух команд.
- **Почему выбрана:** меньше риск.

## 4. Итоговая концепция V2

Пилот на двух командах по 32 часа в неделю. До старта — базовая линия, пороги и процедура отката; через 8 недель — решение по заранее объявленному правилу.

## 5. Нерешённое и допущения

Юрисдикция не уточнена; возврат к пятидневке предполагается обратимым.
`)

  write(path.join(caseDir, 'idea-v2.md'), `
# Идея V2 — Stage 3 fixture

Пилот на двух командах по 32 часа в неделю с сохранением оплаты. До старта фиксируются базовая линия, пороги и процедура отката.
`)

  write(path.join(caseDir, 'transcript-v2.md'), `
# Стенограмма повторного суда «Stage 3 fixture»

## Позиция обвинения V2

# Позиция обвинения V2

## 1. Проверка V1
Дефект C1 закрыт частично; появился новый риск малой выборки.

## 3. Реестр доказательств

| ID | Тип | Источник / данные | Что подтверждает | Надёжность | Ограничения |
|----|-----|-------------------|------------------|------------|-------------|
| E1 | M | \`idea-v2.md\` | Базовая линия описана | высокая | Нет численных значений |

## Позиция защиты V2

# Позиция защиты V2

## 1. Сильнейшая версия V2
Пилот на двух командах сохраняет обратимость и позволяет измерить эффект.

## Раунд 1 — обвинение V2

# Ответ обвинения — раунд 1 V2

### D1 — принимаю
Ограничение по выборке признаю.

## Раунд 1 — защита V2

# Ответ защиты — раунд 1 V2

### C1 — оспариваю частично
Базовая линия уже описана в V2.
`)

  write(path.join(caseDir, 'verdict-v2.md'), `
# Вердикт повторного суда V2

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
**Решение:** Запускать V2 после закрытия условий U1–U2.

## 1. Почему такой итог

V2 исправила часть дефектов V1 и сохранила сильные стороны. Новый риск — малая выборка. <script>window.__pwned=3</script>

## 2. Условия

**U1. Таблица исходов.** До дня 1 зафиксировать успех, провал и неопределённую полосу.

**U2. Классификация часов.** До дня 1 зафиксировать правило отнесения часов.

## 3. Сверка с V1

| ID V1 | Что требовалось | Что сделано в V2 | Статус |
|-------|-----------------|------------------|--------|
| U1 | Один вариант нормы | Норма задана постадийно | закрыто |
| U2 | База и владелец | База 12 месяцев, владелец CTO | частично |
| C1 | База и пороги | Процедура замера описана | частично |
| C7 | Контрольная группа | Принято как ограничение | не закрыто |

## 4. Что проверено по V2

| ID | Тезис | Статус | Основание |
|----|-------|--------|-----------|
| C10 | Правила исхода в полосе 80–124% нет | доказано | текст V2 |
| N1 | Коллинеарность стадии 2 и времени не устранена | доказано | idea-v2 |
| N2 | Судьба ячеек k = 1 зависит от численности | неопределено | reconstruction §5 |
| S1 | Сильные стороны V1 сохранены | доказано | idea-v2 |

## 5. Границы

Юридическая допустимость не проверялась.
`)

  write(path.join(caseDir, 'comparison.md'), `
# Сравнение V1 и V2 — дело «Stage 3 fixture»

- **V1:** ОДОБРИТЬ С УСЛОВИЯМИ · **V2:** ОДОБРИТЬ С УСЛОВИЯМИ · **Повторный суд:** 10 с из 780

## 1. Что улучшилось

Базовая линия и пороги описаны в V2; U1 закрыто.

## 2. Какие проблемы сохранились

Контрольная группа отсутствует; C1 закрыт частично.

## 3. Какие проблемы появились

Новый риск малой выборки N1; правила исхода в полосе не заданы C10.

## 4. Какой вариант предпочтительнее

V2 предпочтительнее при выполнении U1–U2; иначе остаётся V1.

## 5. Вердикт V2

# Вердикт повторного суда V2

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ

## 6. Регламент повторного суда

Проверка пройдена.
`)
}

function runFirstHearing(relative) {
  const init = run('init', '--slug', 'stage3-fixture', '--title', 'Stage 3 fixture <script>window.__pwned=9</script>', '--case-dir', relative)
  assert.equal(init.ok, true)
  const caseDir = dirOf(relative)
  writeStage1(caseDir)

  run('begin', '--case', relative, '--phase', 'preparation')
  run('end', '--case', relative, '--phase', 'preparation')
  run('begin', '--case', relative, '--phase', 'debate')
  run('round', '--case', relative, '--round', '1')
  run('end', '--case', relative, '--phase', 'debate')
  run('begin', '--case', relative, '--phase', 'verdict')
  run('end', '--case', relative, '--phase', 'verdict')

  const verify = run('verify', '--case', relative)
  assert.equal(verify.ok, true, `stage-1 verify failed: ${JSON.stringify(verify.checks.filter((check) => !check.ok))}`)
  const finalized = run('finalize', '--case', relative)
  assert.equal(finalized.status, 'completed')
}

function generate(relative) {
  const result = run('report-html', '--case', relative)
  assert.equal(result.ok, true)
  const file = path.join(dirOf(relative), 'verdict.html')
  assert.ok(fs.existsSync(file), 'verdict.html must exist')
  return { result, file, html: read(file) }
}

function assertNoInjection(html) {
  assert.ok(!html.includes('<script>window.__pwned'), 'injected script must not become markup')
  assert.ok(!html.includes('<script>window.__pwned=9'), 'injected log title must not become markup')
  assert.ok(html.includes('&lt;script&gt;window.__pwned=9&lt;/script&gt;'), 'log title must be shown as escaped text')
  assert.ok(!html.includes('<img src=x'), 'injected image must not become markup')
  assert.ok(!html.includes('<iframe src='), 'injected iframe must not become markup')
  assert.ok(!html.includes('javascript:'), 'javascript: link must be removed')
  assert.ok(!html.includes('data:text/html'), 'data: link must be removed')
  assert.ok(html.includes('&lt;script&gt;window.__pwned=1&lt;/script&gt;'), 'script must be shown as escaped text')
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'image must be shown as escaped text')
  assert.ok(html.includes('&lt;iframe src=&quot;https://evil.example&quot;&gt;&lt;/iframe&gt;'), 'iframe must be shown as escaped text')
  assert.ok(!/<link\s[^>]*href=/i.test(html), 'no external stylesheet')
  assert.ok(!/<img\s[^>]*src=/i.test(html), 'no image resource')
  assert.ok(!/<script\s[^>]*src=/i.test(html), 'no external script')
  assert.ok(!/<iframe\s/i.test(html), 'no iframe element')
  assert.ok(html.includes("default-src 'none'"), 'CSP must forbid network loads by default')
}

function assertV1Only(html) {
  assert.ok(html.includes('data-has-v2="false"'), 'V1-only report must mark the absence of V2')
  assert.ok(!html.includes('data-version-btn="2"'), 'no V2 switch without reconstruction')
  assert.ok(!html.includes('id="reconstruction"'), 'reconstruction section must be hidden')
  assert.ok(!html.includes('id="comparison"'), 'comparison section must be hidden')
  assert.ok(!html.includes('Проверка V2'), 'V2 verification card must be hidden')
  assert.ok(!html.includes('verdict-v2.md'), 'V2 source files must be hidden')
  assert.ok(!html.includes('Утверждённая концепция V2'), 'no V2 concept without reconstruction')
  assert.ok(html.includes('id="verdict"'), 'verdict section must exist')
  assert.ok(html.includes('id="arguments"'), 'arguments section must exist')
  assert.ok(html.includes('id="evidence"'), 'evidence section must exist')
}

function assertNavigation(html) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1])
  const missing = [...new Set(anchors)].filter((anchor) => !ids.has(anchor))
  assert.deepEqual(missing, [], `internal anchors must resolve: ${missing.join(', ')}`)
  for (const required of ['nav-toggle', 'expand-toggle', 'to-top', 'sidebar']) {
    assert.ok(ids.has(required), `navigation control #${required} must exist`)
  }
  assert.ok(!ids.has('theme-toggle'), 'theme switch must not exist')
  assert.ok(!ids.has('print-button'), 'print button must not exist')
  assert.ok(!html.includes('tribunal-theme'), 'theme preference code must not exist')
  assert.ok(!html.includes('@media print'), 'print styles must not exist')
  assert.ok(html.includes('color-scheme: dark'), 'report must use the single dark palette')
  assert.ok(!html.includes('hero__summary'), 'hero must not repeat the full verdict rationale')
  assert.ok(!html.includes('recon-digest'), 'reconstruction must not duplicate the reconciliation table')
  assert.ok(!html.includes('id-grid'), 'arguments must not duplicate verdict status chips')
  assert.ok((html.match(/<details /g) ?? []).length > 0, 'report must contain collapsible blocks')
  assert.ok((html.match(/<summary>/g) ?? []).length > 0, 'collapsible blocks must have summaries')
}

function assertGeneratorIsOffline() {
  const reportDir = path.join(ROOT, 'scripts', 'report')
  const files = fs.readdirSync(reportDir).filter((name) => name.endsWith('.mjs'))
  for (const name of files) {
    const source = read(path.join(reportDir, name))
    assert.ok(!/from\s+['"](?:node:)?(?:http|https|net|dgram|dns)['"]/.test(source), `${name} must not import network modules`)
    assert.ok(!/\bfetch\s*\(/.test(source), `${name} must not call fetch`)
    assert.ok(!/child_process|execFile|spawn\s*\(/.test(source), `${name} must not spawn processes`)
    assert.ok(!/from\s+['"][^'"]*(?:openai|anthropic|deepseek|llm)[^'"]*['"]/i.test(source), `${name} must not import an LLM client`)
  }
}

function unitTests() {
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('data:text/html,<script>alert(1)</script>'), null)
  assert.equal(safeHref('vbscript:msgbox(1)'), null)
  assert.equal(safeHref('../secret.md'), null)
  assert.equal(safeHref('/etc/passwd'), null)
  assert.equal(safeHref('\\\\server\\share'), null)
  assert.equal(safeHref('https://example.com/report'), 'https://example.com/report')
  assert.equal(safeHref('#verdict'), '#verdict')
  assert.equal(safeHref('case.md'), 'case.md')

  const html = renderMarkdown('<script>alert(1)</script> [bad](javascript:alert(1)) [ok](https://example.com)')
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('javascript:'))
  assert.ok(html.includes('href="https://example.com"'))
  assert.ok(renderMarkdown('[q](https://example.com/?a=1&b=2)').includes('href="https://example.com/?a=1&amp;b=2"'))

  const verdictText = read(path.join(dirOf(CASES.v1), 'verdict.md'))
  const verdict = parseVerdict(verdictText)
  assert.equal(verdict.available, true)
  assert.equal(verdict.statusRaw, 'ОДОБРИТЬ С УСЛОВИЯМИ')
  assert.equal(verdict.conditions.length, 2)
  assert.deepEqual(verdict.conditions.map((item) => item.id), ['U1', 'U2'])
  assert.equal(verdict.theses.length, 4)
  assert.deepEqual(verdict.theses.map((item) => item.status), ['доказано', 'опровергнуто', 'доказано', 'неопределено'])
  const highlights = deriveHighlights(verdict.theses)
  assert.deepEqual(highlights.merits.map((item) => item.id), ['C2', 'D1'])
  assert.deepEqual(highlights.defects.map((item) => item.id), ['C1'])
  assert.deepEqual(highlights.uncertain.map((item) => item.id), ['D2'])

  const transcriptText = read(path.join(dirOf(CASES.v1), 'transcript.md'))
  const transcript = parseTranscript(transcriptText)
  assert.equal(transcript.positions.prosecution.title, 'Позиция обвинения')
  assert.equal(transcript.positions.defense.title, 'Позиция защиты')
  assert.equal(transcript.rounds.length, 1)
  assert.deepEqual(transcript.rounds[0].prosecution.key, 'round-1-prosecution')
  assert.deepEqual(transcript.evidence.prosecution.map((item) => item.types[0]), ['M', 'A'])
  assert.deepEqual(transcript.evidence.defense.map((item) => item.types[0]), ['C'])
  assert.ok(transcript.evidence.prosecution[1].unverified, 'type A evidence must be marked unverified')
  assert.ok(transcript.gaps.prosecution.includes('Базовая линия'))

  const caseDoc = parseCase(read(path.join(dirOf(CASES.v1), 'case.md')))
  assert.equal(caseDoc.title, 'Stage 3 fixture')
  assert.deepEqual(caseDoc.assumptions.map((item) => item.id), ['П1', 'П2'])

  const comparison = parseComparison(`
# Сравнение V1 и V2

## 1. Что улучшилось
A

## 2. Какие проблемы сохранились
B

## 3. Какие проблемы появились
C

## 4. Какой вариант предпочтительнее
D

## 5. Вердикт V2

# Вердикт повторного суда V2

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
`)
  assert.equal(comparison.available, true)
  assert.equal(comparison.hasRequiredSections, true)
  assert.equal(comparison.sections.preference.content, 'D')
  assert.ok(comparison.sections.verdict2, 'the V2 verdict section must be separated from the comparison')
  assert.ok(!comparison.sections.preference.content.includes('Вердикт повторного суда V2'))
}

try {
  for (const relative of Object.values(CASES)) fs.rmSync(dirOf(relative), { recursive: true, force: true })

  // --- V1 only: injection safety, hiding V2, determinism --------------------
  runFirstHearing(CASES.v1)
  const first = generate(CASES.v1)
  assert.ok(first.html.includes('Stage 3 fixture'))
  assert.ok(first.html.includes('ОДОБРИТЬ С УСЛОВИЯМИ'))
  assert.ok(first.html.includes('Решение Судьи'))
  assert.ok(first.html.includes('Ключевые достоинства'))
  assert.ok(first.html.includes('Критические недостатки'))
  assert.ok(first.html.includes('Рекомендации'))
  assert.ok(first.html.includes('U1'))
  assert.ok(first.html.includes('C1'))
  assert.ok(first.html.includes('E1'))
  assert.ok(first.html.includes('П1'))
  assertV1Only(first.html)
  assertNoInjection(first.html)
  assertNavigation(first.html)
  assert.ok(first.html.includes('https://example.com/report'), 'safe external source links stay clickable')
  assert.equal(first.result.sections.verdict1, true)
  assert.equal(first.result.sections.verdict2, false)
  assert.ok(first.result.warnings.some((warning) => warning.code === 'no-v2'))

  const second = generate(CASES.v1)
  assert.equal(second.html, first.html, 'generation must be deterministic for unchanged artifacts')

  // --- V1 + V2: report is updated after the retrial -----------------------
  runFirstHearing(CASES.v2)
  const v1Report = generate(CASES.v2)
  assertV1Only(v1Report.html)

  run('checkpoint', '--case', CASES.v2, '--decision', 'offer')
  run(
    'checkpoint', '--case', CASES.v2,
    '--decision', 'reconstruct',
    '--goals', 'Сохранить оплату и горизонт',
    '--constraints', 'Не увеличивать бюджет',
    '--emulated',
  )
  run('reconstruct', '--case', CASES.v2, '--begin')
  writeStage2(dirOf(CASES.v2))
  run('reconstruct', '--case', CASES.v2, '--end', '--status', 'completed')
  run('approval', '--case', CASES.v2, '--decision', 'approved', '--emulated')

  run('begin', '--case', CASES.v2, '--phase', 'preparation', '--hearing', '2')
  run('end', '--case', CASES.v2, '--phase', 'preparation', '--hearing', '2')
  run('begin', '--case', CASES.v2, '--phase', 'debate', '--hearing', '2')
  run('round', '--case', CASES.v2, '--round', '1', '--hearing', '2')
  run('end', '--case', CASES.v2, '--phase', 'debate', '--hearing', '2')
  run('begin', '--case', CASES.v2, '--phase', 'verdict', '--hearing', '2')
  run('end', '--case', CASES.v2, '--phase', 'verdict', '--hearing', '2')
  for (const [role, agent] of [['prosecutor', 'prosecutor-v2'], ['defense', 'defense-v2'], ['judge', 'judge-v2']]) {
    run('event', '--case', CASES.v2, '--type', 'agent_started', '--role', role, '--agent', agent, '--detail', '{"hearing":2}')
  }

  const retrialVerify = run('verify', '--case', CASES.v2, '--hearing', '2')
  assert.equal(retrialVerify.ok, true, `stage-2 verify failed: ${JSON.stringify(retrialVerify.checks.filter((check) => !check.ok))}`)
  const retrialFinalize = run('finalize', '--case', CASES.v2, '--hearing', '2')
  assert.equal(retrialFinalize.status, 'completed_stage2')

  const v2Report = generate(CASES.v2)
  assert.ok(v2Report.html.includes('data-has-v2="true"'))
  assert.ok(v2Report.html.includes('data-version-btn="2"'))
  assertNavigation(v2Report.html)
  assert.ok(v2Report.html.includes('id="reconstruction"'))
  assert.ok(v2Report.html.includes('id="comparison"'))
  assert.ok(v2Report.html.includes('Сравнение V1 и V2'))
  assert.ok(v2Report.html.includes('Утверждённая концепция V2'))
  assert.ok(v2Report.html.includes('Пилот на двух командах по 32 часа'))
  assert.ok(v2Report.html.includes('Сверка с V1'))
  assert.ok(v2Report.html.includes('закрыто'))
  assert.ok(v2Report.html.includes('частично'))
  assert.ok(v2Report.html.includes('не закрыто'))
  assert.ok(v2Report.html.includes('Что улучшилось'))
  assert.ok(v2Report.html.includes('Какой вариант предпочтительнее'))
  assert.ok(v2Report.html.includes('V2 предпочтительнее'))
  assert.ok(v2Report.html.includes('N1'))
  assert.ok(v2Report.html.includes('S1'))
  assert.ok(!v2Report.html.includes('window.__pwned=3</script>'))
  assert.equal(v2Report.result.sections.reconstruction, true)
  assert.equal(v2Report.result.sections.comparison, true)
  assert.equal(v2Report.result.sections.verdict2, true)

  // --- Incomplete / timed-out case ---------------------------------------
  run('init', '--slug', 'stage3-empty', '--title', 'Stage 3 empty', '--case-dir', CASES.empty)
  write(path.join(dirOf(CASES.empty), 'case.md'), `
# Дело «Stage 3 empty»

## 1. Исходная идея и контекст
Идея без материалов.
`)
  run('begin', '--case', CASES.empty, '--phase', 'preparation')
  run(
    'end', '--case', CASES.empty,
    '--phase', 'preparation',
    '--status', 'timeout',
    '--missing', 'Позиция прокурора; Позиция адвоката',
  )
  const emptyVerify = run('verify', '--case', CASES.empty)
  assert.equal(emptyVerify.ok, false)
  const emptyFinalize = run('finalize', '--case', CASES.empty)
  assert.equal(emptyFinalize.status, 'timed_out')
  const emptyReport = generate(CASES.empty)
  assert.ok(emptyReport.html.includes('НЕДОСТАТОЧНО ДАННЫХ'))
  assert.ok(emptyReport.html.includes('Вердикт V1 не получен'))
  assert.ok(emptyReport.html.includes('Позиция прокурора; Позиция адвоката'))
  assert.ok(emptyReport.html.includes('таймаут'))
  assert.ok(emptyReport.result.warnings.some((warning) => warning.code === 'verdict-missing'))
  assert.ok(emptyReport.result.warnings.some((warning) => warning.code === 'timed-out'))
  assert.ok(emptyReport.result.warnings.some((warning) => warning.code === 'missing-materials'))

  // --- Directory without log.json: standalone generator still works ------
  const noLogDir = dirOf(CASES.nolog)
  fs.mkdirSync(noLogDir, { recursive: true })
  write(path.join(noLogDir, 'verdict.md'), `
# Вердикт

**Статус:** НЕДОСТАТОЧНО ДАННЫХ
**Решение:** Вердикт не получен.

## 1. Почему такой итог

Материалы неполные.

## 2. Условия

Условия не сформулированы.

## 3. Что проверено

| ID | Тезис | Статус | Основание |
|----|-------|--------|-----------|
| C1 | Данных нет | неопределено | материалов нет |

## 4. Границы

Только материалы дела.
`)
  const noLogOutput = execFileSync(process.execPath, [GENERATOR, '--case', CASES.nolog], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  })
  const noLogResult = JSON.parse(noLogOutput)
  assert.equal(noLogResult.ok, true)
  assert.ok(noLogResult.warnings.some((warning) => warning.code === 'log-missing'))
  assert.ok(read(path.join(noLogDir, 'verdict.html')).includes('log.json отсутствует'))

  unitTests()
  assertGeneratorIsOffline()
  console.log('stage3 test OK')
} finally {
  for (const relative of Object.values(CASES)) fs.rmSync(dirOf(relative), { recursive: true, force: true })
}
