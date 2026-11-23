#!/usr/bin/env node
/**
 * Standalone CLI for the stage-3 HTML report.
 *
 *   node scripts/verdict-report.mjs --case "cases/<id>" [--quiet]
 *
 * The same generator is available through the tribunal CLI as
 * `node scripts/tribunal.mjs report-html --case "cases/<id>"`, which is what the
 * Secretary uses. This entry point is useful for old cases and for checking a
 * directory without a valid log.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateVerdictReport } from './report/index.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_PATH = path.join(ROOT, 'config', 'tribunal.config.json')

function fail(message) {
  console.error(`verdict-report: ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const out = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) fail(`unexpected argument: ${token}`)
    const key = token.slice(2)
    const next = argv[index + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else {
      out[key] = next
      index += 1
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log('Usage: node scripts/verdict-report.mjs --case "cases/<id>" [--quiet]')
  process.exit(0)
}
if (typeof args.case !== 'string' || args.case.trim() === '') fail('--case <dir> is required')

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
const casesRoot = path.resolve(ROOT, config.paths?.cases ?? 'cases')
const caseDir = path.resolve(ROOT, args.case)
if (caseDir !== casesRoot && !caseDir.startsWith(`${casesRoot}${path.sep}`)) {
  fail(`case directory must live under ${casesRoot}: ${caseDir}`)
}
if (!fs.existsSync(caseDir) || !fs.statSync(caseDir).isDirectory()) {
  fail(`case directory does not exist: ${caseDir}`)
}

try {
  const result = generateVerdictReport({ caseDir, config })
  const output = {
    ...result,
    file: path.relative(ROOT, result.file).split(path.sep).join('/'),
    warningCount: result.warnings.length,
    warningMessages: result.warnings.map((warning) => warning.message),
  }
  if (!args.quiet) console.log(JSON.stringify(output, null, 2))
  else console.log(`verdict-report: ${output.file} (${output.bytes} bytes, ${output.warningCount} warnings)`)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
