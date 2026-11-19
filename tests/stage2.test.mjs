import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = path.join(ROOT, 'scripts', 'tribunal.mjs')
const MAIN_REL = `cases/.stage2-test-${process.pid}-main`
const NEG_REL = `cases/.stage2-test-${process.pid}-negative`
const STOP_REL = `cases/.stage2-test-${process.pid}-stop`
const TIMEOUT_REL = `cases/.stage2-test-${process.pid}-timeout`
const ALL_REL = [MAIN_REL, NEG_REL, STOP_REL, TIMEOUT_REL]

function dirOf(rel) {
  return path.join(ROOT, rel)
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

function runFailure(...args) {
  try {
    run(...args)
    return null
  } catch (error) {
    return error
  }
}

function assertFailure(label, ...args) {
  const error = runFailure(...args)
  assert.ok(error, `${label} must be rejected`)
  return error
}

function write(file, text) {
  fs.writeFileSync(file, `${text.trim()}\n`, 'utf8')
}

function writeMinimalStage1(caseDir) {
  write(path.join(caseDir, 'case.md'), `
# Дело «Stage 2 selftest»

## 1. Исходная идея и контекст
Тестовая идея для проверки этапа 2: перевести небольшую команду на четырёхдневную неделю.
Компания — продуктовый разработчик ПО, 40 инженеров, распределённые команды, есть поддержка.
`)
  write(path.join(caseDir, 'transcript.md'), `
# Стенограмма дела «Stage 2 selftest»

## Позиция обвинения
Тестовое обвинение: критерии успеха не операционализированы, базовая линия отсутствует.

## Позиция защиты
Тестовая защита: идея проверяема, если до старта зафиксировать метрики, пороги и процедуру отката.
`)
  write(path.join(caseDir, 'verdict.md'), `
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
  write(path.join(caseDir, 'report.md'), `
# Отчёт по делу «Stage 2 selftest»

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ

## 5. Вердикт

# Вердикт

**Статус:** ОДОБРИТЬ С УСЛОВИЯМИ
Тестовый вердикт этапа 1.
`)
}

function writeMinimalStage2(caseDir) {
  write(path.join(caseDir, 'reconstruction.md'), `
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
  write(path.join(caseDir, 'idea-v2.md'), `
# Идея V2 — Stage 2 selftest

Пилот на двух командах по 32 часа в неделю с сохранением оплаты на 12 недель.
До старта фиксируются базовая линия, пороги и процедура отката.
`)
  write(path.join(caseDir, 'transcript-v2.md'), `
# Стенограмма повторного суда «Stage 2 selftest»

## Позиция обвинения V2
Проверка показала: дефект C1 закрыт, но появился новый риск — малая выборка.

## Позиция защиты V2
Пилот на двух командах позволяет измерить эффект и сохраняет обратимость.
`)
  write(path.join(caseDir, 'verdict-v2.md'), `
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
  write(path.join(caseDir, 'comparison.md'), `
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

function runFirstHearing(caseRel) {
  const init = run('init', '--slug', 'stage2-selftest', '--title', 'Stage 2 selftest', '--case-dir', caseRel)
  assert.equal(init.ok, true)
  const caseDir = dirOf(caseRel)
  writeMinimalStage1(caseDir)

  run('begin', '--case', caseRel, '--phase', 'preparation')
  run('end', '--case', caseRel, '--phase', 'preparation')
  run('begin', '--case', caseRel, '--phase', 'debate')
  run('round', '--case', caseRel, '--round', '1')
  run('end', '--case', caseRel, '--phase', 'debate')
  run('begin', '--case', caseRel, '--phase', 'verdict')
  run('end', '--case', caseRel, '--phase', 'verdict')

  const firstVerify = run('verify', '--case', caseRel)
  assert.equal(firstVerify.ok, true, 'stage-1 verification must pass on the fixture')
  const finalized = run('finalize', '--case', caseRel)
  assert.equal(finalized.status, 'completed')
}

function beginReconstruction(caseRel) {
  run('checkpoint', '--case', caseRel, '--decision', 'offer')
  run(
    'checkpoint',
    '--case', caseRel,
    '--decision', 'reconstruct',
    '--goals', 'Сохранить оплату и шестимесячный горизонт',
    '--constraints', 'Не увеличивать бюджет',
    '--emulated',
  )
  run('reconstruct', '--case', caseRel, '--begin')
  writeMinimalStage2(dirOf(caseRel))
}

function agentStarted(caseRel, role, agent, hearing = 2) {
  run(
    'event',
    '--case', caseRel,
    '--type', 'agent_started',
    '--role', role,
    '--agent', agent,
    '--detail', JSON.stringify({ hearing }),
  )
}

function runRetrial(caseRel) {
  run('begin', '--case', caseRel, '--phase', 'preparation', '--hearing', '2')
  run('end', '--case', caseRel, '--phase', 'preparation', '--hearing', '2')
  run('begin', '--case', caseRel, '--phase', 'debate', '--hearing', '2')
  run('round', '--case', caseRel, '--round', '1', '--hearing', '2')
  run('end', '--case', caseRel, '--phase', 'debate', '--hearing', '2')
  run('begin', '--case', caseRel, '--phase', 'verdict', '--hearing', '2')
  run('end', '--case', caseRel, '--phase', 'verdict', '--hearing', '2')

  agentStarted(caseRel, 'prosecutor', 'prosecutor-v2')
  agentStarted(caseRel, 'defense', 'defense-v2')
  agentStarted(caseRel, 'judge', 'judge-v2')
}

try {
  for (const rel of ALL_REL) fs.rmSync(dirOf(rel), { recursive: true, force: true })

  // --- full positive path -------------------------------------------------
  runFirstHearing(MAIN_REL)
  run('checkpoint', '--case', MAIN_REL, '--decision', 'offer')
  run(
    'checkpoint',
    '--case', MAIN_REL,
    '--decision', 'reconstruct',
    '--goals', 'Сохранить оплату и шестимесячный горизонт',
    '--constraints', 'Не увеличивать бюджет',
    '--emulated',
  )

  run('reconstruct', '--case', MAIN_REL, '--begin')
  const earlyApproval = runFailure('approval', '--case', MAIN_REL, '--decision', 'approved')
  assert.ok(earlyApproval, 'approval before reconstruction ends must be rejected')

  writeMinimalStage2(dirOf(MAIN_REL))
  run('reconstruct', '--case', MAIN_REL, '--end')
  fs.rmSync(path.join(dirOf(MAIN_REL), 'idea-v2.md'))
  assertFailure('approval without idea-v2', 'approval', '--case', MAIN_REL, '--decision', 'approved')
  writeMinimalStage2(dirOf(MAIN_REL))
  run('approval', '--case', MAIN_REL, '--decision', 'approved', '--emulated')

  assertFailure('a repeated approval', 'approval', '--case', MAIN_REL, '--decision', 'approved')
  assertFailure('changes after approval', 'approval', '--case', MAIN_REL, '--decision', 'changes')
  assertFailure('reconstruction reopen after approval', 'reconstruct', '--case', MAIN_REL, '--begin')

  runRetrial(MAIN_REL)
  const retrialVerify = run('verify', '--case', MAIN_REL, '--hearing', '2')
  const failed = retrialVerify.checks.filter((check) => !check.ok)
  assert.equal(retrialVerify.ok, true, `stage-2 verification must pass, failed: ${JSON.stringify(failed)}`)
  assert.equal(retrialVerify.hearing, 2)

  const finalized = run('finalize', '--case', MAIN_REL, '--hearing', '2')
  assert.equal(finalized.status, 'completed_stage2')
  assert.equal(finalized.verificationOk, true)

  assertFailure('phase reopen after finalize', 'begin', '--case', MAIN_REL, '--phase', 'verdict', '--hearing', '2')
  assertFailure('approval after finalize', 'approval', '--case', MAIN_REL, '--decision', 'approved')

  const verdict = path.join(dirOf(MAIN_REL), 'verdict.md')
  fs.appendFileSync(verdict, '\n<!-- tampered V1 verdict -->\n', 'utf8')
  const tampered = run('verify', '--case', MAIN_REL, '--hearing', '2')
  assert.equal(tampered.ok, false, 'changing the V1 verdict must fail verification')
  const immutability = tampered.checks.find((check) => check.name === 'v1_immutable')
  assert.ok(immutability && immutability.ok === false, 'v1_immutable check must fail')

  // --- unsuccessful reconstruction cannot be approved ---------------------
  runFirstHearing(NEG_REL)
  beginReconstruction(NEG_REL)
  run('reconstruct', '--case', NEG_REL, '--end', '--status', 'failed')

  assertFailure('approval of a failed reconstruction', 'approval', '--case', NEG_REL, '--decision', 'approved')
  assertFailure('changes on a failed reconstruction', 'approval', '--case', NEG_REL, '--decision', 'changes')
  assertFailure('retrial after a failed reconstruction', 'begin', '--case', NEG_REL, '--phase', 'preparation', '--hearing', '2')

  // A failed attempt may be retried, but only a completed attempt may be approved.
  run('reconstruct', '--case', NEG_REL, '--begin')
  run('reconstruct', '--case', NEG_REL, '--end', '--status', 'completed')
  run('approval', '--case', NEG_REL, '--decision', 'approved', '--emulated')
  assertFailure('a repeated approval on the negative case', 'approval', '--case', NEG_REL, '--decision', 'approved')
  assertFailure('stop after approval', 'approval', '--case', NEG_REL, '--decision', 'stop')

  // --- stop is terminal ---------------------------------------------------
  runFirstHearing(STOP_REL)
  beginReconstruction(STOP_REL)
  run('reconstruct', '--case', STOP_REL, '--end', '--status', 'completed')
  run('approval', '--case', STOP_REL, '--decision', 'stop', '--emulated')

  assertFailure('approval after stop', 'approval', '--case', STOP_REL, '--decision', 'approved')
  assertFailure('changes after stop', 'approval', '--case', STOP_REL, '--decision', 'changes')
  assertFailure('second stop', 'approval', '--case', STOP_REL, '--decision', 'stop')
  assertFailure('retrial after stop', 'begin', '--case', STOP_REL, '--phase', 'preparation', '--hearing', '2')
  assertFailure('checkpoint after stop', 'checkpoint', '--case', STOP_REL, '--decision', 'offer')
  assertFailure('reconstruction after stop', 'reconstruct', '--case', STOP_REL, '--begin')

  // --- timeout records incomplete phases and missing materials ------------
  run('init', '--slug', 'stage2-selftest-timeout', '--title', 'Timeout selftest', '--case-dir', TIMEOUT_REL)
  run('begin', '--case', TIMEOUT_REL, '--phase', 'preparation')
  assertFailure(
    'timeout without a missing-materials list',
    'end', '--case', TIMEOUT_REL, '--phase', 'preparation', '--status', 'timeout',
  )
  const timedOut = run(
    'end',
    '--case', TIMEOUT_REL,
    '--phase', 'preparation',
    '--status', 'timeout',
    '--missing', 'Позиция прокурора; Позиция адвоката',
  )
  assert.deepEqual(timedOut.missing, ['Позиция прокурора', 'Позиция адвоката'])

  const timeoutStatus = run('status', '--case', TIMEOUT_REL)
  assert.deepEqual(timeoutStatus.missing, ['Позиция прокурора', 'Позиция адвоката'])
  assert.equal(timeoutStatus.timedOut, true)
  assert.equal(timeoutStatus.phases.preparation.status, 'timeout')

  const timeoutVerify = run('verify', '--case', TIMEOUT_REL)
  assert.equal(timeoutVerify.ok, false, 'a timed-out hearing must not verify as complete')
  const phaseTimeout = timeoutVerify.checks.find((check) => check.name === 'preparation_timed_out')
  assert.ok(phaseTimeout && phaseTimeout.ok === false, 'a timed-out phase must be reported as a violation')
  const missingCheck = timeoutVerify.checks.find((check) => check.name === 'timeout_missing_materials')
  assert.ok(missingCheck && missingCheck.ok === true, 'missing materials must be recorded explicitly')

  const timeoutFinalize = run('finalize', '--case', TIMEOUT_REL)
  assert.equal(timeoutFinalize.status, 'timed_out')
  assertFailure('phase reopen after a timed-out finalize', 'begin', '--case', TIMEOUT_REL, '--phase', 'debate')

  console.log('stage2 test OK')
} finally {
  for (const rel of ALL_REL) fs.rmSync(dirOf(rel), { recursive: true, force: true })
}
