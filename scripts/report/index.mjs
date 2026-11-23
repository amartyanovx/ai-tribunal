/**
 * Generator entry point: build the model, render the HTML and write
 * `<case>/verdict.html`. The write is atomic (temporary file + rename) so a
 * failed generation never leaves a half-written report.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { buildReportModel } from './model.mjs'
import { renderReportHtml } from './template.mjs'

export function generateVerdictReport({ caseDir, config }) {
  const resolved = path.resolve(caseDir)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`case directory does not exist: ${resolved}`)
  }

  const model = buildReportModel({ caseDir: resolved, config })
  const html = renderReportHtml(model)
  const outputName = path.basename(model.generator.outputName)
  if (!/^[\w.-]+\.html$/i.test(outputName)) {
    throw new Error(`invalid report artifact name: ${model.generator.outputName}`)
  }

  const file = path.join(resolved, outputName)
  const temporary = `${file}.tmp`
  try {
    fs.writeFileSync(temporary, html, 'utf8')
    fs.renameSync(temporary, file)
  } catch (error) {
    try { fs.rmSync(temporary, { force: true }) } catch { /* best effort */ }
    throw error
  }

  return {
    ok: true,
    caseDir: resolved,
    file,
    fileRelative: path.basename(resolved) + '/' + outputName,
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256: crypto.createHash('sha256').update(html).digest('hex'),
    generatedAt: model.generator.generatedAt,
    generatorVersion: model.generator.version,
    sourceDigest: model.generator.sourceDigest,
    hasV2: model.hasV2,
    hasReconstruction: model.hasReconstruction,
    hasComparison: model.hasComparison,
    sections: {
      verdict1: model.verdict1.available,
      verdict2: model.verdict2.available,
      arguments1: model.transcript1.available,
      arguments2: model.transcript2.available,
      evidence1: model.transcript1.evidence.prosecution.length + model.transcript1.evidence.defense.length,
      evidence2: model.transcript2.evidence.prosecution.length + model.transcript2.evidence.defense.length,
      reconstruction: model.hasReconstruction,
      comparison: model.hasComparison,
    },
    warnings: model.warnings,
  }
}
