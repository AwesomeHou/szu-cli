#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { evaluateTrace } from './l0-evaluator.mjs';
import { readTraceFile } from './trace.mjs';

function getOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const tracePath = getOption('--trace');
const oraclePath = getOption('--oracle');
const outputPath = getOption('--output');

if (!tracePath || !oraclePath) {
  process.stderr.write('Usage: node evals/harness/evaluate-l0.mjs --trace <trace.jsonl> --oracle <oracle.json> [--output <result.json>]\n');
  process.exitCode = 2;
} else {
  const [events, oracle] = await Promise.all([
    readTraceFile(tracePath),
    readFile(oraclePath, 'utf8').then(JSON.parse)
  ]);
  const caseId = getOption('--case-id') ?? oracle.caseId ?? 'unknown';
  const result = evaluateTrace({ caseId, oracle, events });
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, output, 'utf8');
  process.stdout.write(output);
  process.exitCode = result.passed ? 0 : 1;
}
