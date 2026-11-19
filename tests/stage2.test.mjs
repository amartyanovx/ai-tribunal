import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'tribunal.mjs')
const CASE_REL = `cases/.stage2-test-${process.pid}`
const CASE_DIR = path.join(ROOT, CASE_REL)
const CASE = path.join(CASE_DIR, 'case.md')
const TRANSCRIPT = path.join(CASE_DIR, 'transcript.md')
const VERDICT = path.join(CASE_DIR, 'verdict.md')
const REPORT = path.join(CASE_DIR, 'report.md')

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
  fs.writeFileSync(file, `${text.trim()}\n`, 'utf8')
}

function writeMinimalStage1() {
  write(CASE, `
# Дело «Stage 2 selftest»

## 1. Исходная идея и контекст
Тестовая идея для проверки этапа 2: перевести небольшую команду на четырёхдневную неделю.
Компания — продуктовый разработчик ПО, 40 инженеров, распределённые команды, есть поддержка.
`)
  write(TRANSCRIPT, `
# Стенограмма дела «Stage 2 selftest»

## Позиция обвинения
Тестовое обвинение: критерии успеха не операционализированы, базовая линия отсутствует.

## Позиция защиты
Тестовая защита: идея проверяема, если до старта зафиксировать метрики, пороги и процедуру отката.
`)
  write(VERDICT, `
# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
**Решение:** Провести пилот после выполнения условий U1–U2.

## 1. Почему такой итог
Тестовый вердикт этапа 1. Идея допустима после операционализации метрик и процедуры отката.

## 2. Условия
- **U1. Метрики.** Зафиксировать базовую линию и пороги.
- **U2. Откат.** Описать процедуру остановки.

## 3. Что проверено

| ID | Тезис | Статус | Основание |
|----|-------|--------|-----------|
| C1 | Критерии не операционализированы | доказано | материалы дела |

## 4. Границы
Тестовый прогон, внешние источники не использовались.
`)
  write(REPORT, `
# Отчёт по делу «Stage 2 selftest»

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ

## 5. Вердикт

# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
Тестовый вердикт этапа 1.
`)
}

function writeMinimalStage2() {
  write(path.join(CASE_DIR, 'reconstruction.md'), `
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
- **Критерии сравнения:** обратимость, измеримость.
- **Почему выбрана:** меньше риск.

### A2. Вся компания сразу
- **Суть:** перевести всех.
- **Почему не выбрана:** нет базы для сравнения.

## 4. Итоговая концепция V2
Пилот на двух командах по 32 часа в неделю с сохранением оплаты. До старта — базовая линия,
пороги и процедура отката; через 8 недель — решение по заранее объявленному правилу.

## 5. Нерешённое и допущения
Юрисдикции не уточнены; допущение — возврат к пятидневке обратим.
`)
  write(path.join(CASE_DIR, 'idea-v2.md'), `
# Идея V2 — Stage 2 selftest

Пилот на двух командах по 32 часа в неделю с сохранением оплаты на 12 недель.
До старта фиксируются базовая линия, пороги и процедура отката.
`)
  write(path.join(CASE_DIR, 'transcript-v2.md'), `
# Стенограмма повторного суда «Stage 2 selftest»

## Позиция обвинения V2
Проверка показала: дефект C1 закрыт, но появился новый риск — малая выборка.

## Позиция защиты V2
Пилот на двух командах позволяет измерить эффект и сохраняет обратимость.
`)
  write(path.join(CASE_DIR, 'verdict-v2.md'), `
# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
**Решение:** Разрешить пилот после закрытия условия U1.

## 1. Почему такой итог
Повторный суд подтвердил закрытие дефекта C1 и обнаружил риск малой выборки.

## 2. Условия
- **U1. Выборка.** Добавить третью команду сравнения.

## 3. Сверка с V1
| ID V1 | Что было в V1 | Что сделано в V2 | Статус |
|-------|---------------|------------------|--------|
| C1 | Нет метрик | Базовая линия и пороги | закрыто |
| U2 | Нет отката | Процедура отката | закрыто |

## 4. Что проверено по V2
| ID | Тезис | Статус | Основание |
|----|-------|--------|-----------|
| C1-V2 | Базовая линия закрывает дефект | доказано | реконструкция |

## 5. Границы
Тестовый прогон.
`)
  write(path.join(CASE_DIR, 'comparison.md'), `
# Сравнение V1 и V2 — дело «Stage 2 selftest»

**V1:** ОДОБРИТЬ С УСЛОВИЯМИ · **V2:** ОДОБРИТЬ С УСЛОВИЯМИ

## 1. Что улучшилось
Дефект C1 закрыт: в V2 есть базовая линия и пороги, чего не было в V1.

## 2. Какие проблемы сохранились
Требование полной оплаты сохранено; риск малой выборки остаётся.

## 3. Какие проблемы появились
Появился новый риск: пилот на двух командах даёт малую выборку.

## 4. Какой вариант предпочтительнее
V2 предпочтительнее: он закрывает C1, а новый риск ограничен условием U1.

## 5. Вердикт V2
**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
`)
}

function agentStarted(role, agent) {
  run(
    'event',
    '--case', CASE_REL,
    '--type', 'agent_started',
    '--role', role,
    '--agent', agent,
    '--detail', JSON.stringify({ hearing: 2 }),
  )
}

try {
  fs.rmSync(CASE_DIR, { recursive: true, force: true })

  const init = run('init', '--slug', 'stage2-selftest', '--title', 'Stage 2 selftest', '--case-dir', CASE_REL)
  assert.equal(init.ok, true)
  writeMinimalStage1()

  run('begin', '--case', CASE_REL, '--phase', 'preparation')
  run('end', '--case', CASE_REL, '--phase', 'preparation')
  run('begin', '--case', CASE_REL, '--phase', 'debate')
  run('round', '--case', CASE_REL, '--round', '1')
  run('end', '--case', CASE_REL, '--phase', 'debate')
  run('begin', '--case', CASE_REL, '--phase', 'verdict')
  run('end', '--case', CASE_REL, '--phase', 'verdict')

  const firstVerify = run('verify', '--case', CASE_REL)
  assert.equal(firstVerify.ok, true, 'stage-1 verification must pass on the fixture')
  run('finalize', '--case', CASE_REL)

  run('checkpoint', '--case', CASE_REL, '--decision', 'offer')
  run(
    'checkpoint',
    '--case', CASE_REL,
    '--decision', 'reconstruct',
    '--goals', 'Сохранить оплату и шестимесячный горизонт',
    '--constraints', 'Не увеличивать бюджет',
    '--emulated',
  )

  run('reconstruct', '--case', CASE_REL, '--begin')
  const earlyApproval = (() => {
    try {
      run('approval', '--case', CASE_REL, '--decision', 'approved')
      return false
    } catch {
      return true
    }
  })()
  assert.equal(earlyApproval, true, 'approval before reconstruction ends must be rejected')

  writeMinimalStage2()
  run('reconstruct', '--case', CASE_REL, '--end')
  run('approval', '--case', CASE_REL, '--decision', 'approved', '--emulated')

  run('begin', '--case', CASE_REL, '--phase', 'preparation', '--hearing', '2')
  run('end', '--case', CASE_REL, '--phase', 'preparation', '--hearing', '2')
  run('begin', '--case', CASE_REL, '--phase', 'debate', '--hearing', '2')
  run('round', '--case', CASE_REL, '--round', '1', '--hearing', '2')
  run('end', '--case', CASE_REL, '--phase', 'debate', '--hearing', '2')
  run('begin', '--case', CASE_REL, '--phase', 'verdict', '--hearing', '2')
  run('end', '--case', CASE_REL, '--phase', 'verdict', '--hearing', '2')

  agentStarted('prosecutor', 'prosecutor-v2')
  agentStarted('defense', 'defense-v2')
  agentStarted('judge', 'judge-v2')

  const retrialVerify = run('verify', '--case', CASE_REL, '--hearing', '2')
  const failed = retrialVerify.checks.filter((check) => !check.ok)
  assert.equal(retrialVerify.ok, true, `stage-2 verification must pass, failed: ${JSON.stringify(failed)}`)
  assert.equal(retrialVerify.hearing, 2)

  const finalized = run('finalize', '--case', CASE_REL, '--hearing', '2')
  assert.equal(finalized.status, 'completed_stage2')
  assert.equal(finalized.verificationOk, true)

  fs.appendFileSync(VERDICT, '\n<!-- tampered V1 verdict -->\n', 'utf8')
  const tampered = run('verify', '--case', CASE_REL, '--hearing', '2')
  assert.equal(tampered.ok, false, 'changing the V1 verdict must fail verification')
  const immutability = tampered.checks.find((check) => check.name === 'v1_immutable')
  assert.ok(immutability && immutability.ok === false, 'v1_immutable check must fail')

  console.log('stage2 test OK')
} finally {
  fs.rmSync(CASE_DIR, { recursive: true, force: true })
}
