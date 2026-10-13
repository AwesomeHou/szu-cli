import { readFile } from 'node:fs/promises';

function parseJsonLine(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseCommandOutput(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const candidates = [value.trim(), ...value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse()];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Shell wrappers may add a line around the JSON envelope.
    }
  }
  return null;
}

function tokenizeCommand(command) {
  if (Array.isArray(command)) return command.map(String);
  if (typeof command !== 'string') return [];

  return command.match(/"(?:[^"\\]|\\.)*"|'[^']*'|\S+/g)?.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  }) ?? [];
}

function extractPowerShellScript(command) {
  if (typeof command !== 'string') return null;
  const match = command.match(/(?:^|\s)-Command\s+([\s\S]+)$/i);
  if (!match) return null;

  const script = match[1].trim();
  if ((script.startsWith("'") && script.endsWith("'")) || (script.startsWith('"') && script.endsWith('"'))) {
    return script.slice(1, -1);
  }
  return script;
}

export function splitShellCommands(command) {
  const script = extractPowerShellScript(command);
  if (!script) return [command];

  const segments = [];
  let start = 0;
  let quote = null;
  for (let index = 0; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (char === quote && script[index - 1] !== '`') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === ';' || (char === '&' && script[index + 1] === '&')) {
      const segment = script.slice(start, index).trim();
      if (segment) segments.push(segment);
      if (char === '&') index += 1;
      start = index + 1;
    }
  }

  const last = script.slice(start).trim();
  if (last) segments.push(last);
  return segments.length ? segments : [command];
}

function commandMetaName(argv) {
  if (!Array.isArray(argv) || !/^szu-cli(?:\.(?:cmd|exe))?$/i.test(argv[0] ?? '')) return null;
  if (argv[1] === '--version') return null;
  if (!argv[1]) return null;
  return `${argv[1]}${argv[2] && !argv[2].startsWith('-') ? ` ${argv[2]}` : ''}`;
}

function extractJsonObjects(value) {
  const objects = [];
  if (typeof value !== 'string') return objects;

  let start = -1;
  let depth = 0;
  let quote = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"' && depth > 0) {
      quote = true;
      continue;
    }
    if (char === '{' || char === '[') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char !== '}' && char !== ']') continue;
    if (depth === 0) continue;
    depth -= 1;
    if (depth !== 0) continue;

    const text = value.slice(start, index + 1);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') objects.push({ text, value: parsed });
    } catch {
      // Ignore non-JSON brace-delimited text and continue scanning.
    }
    start = -1;
  }
  return objects;
}

function splitCompoundOutput(segments, output) {
  if (segments.length <= 1) return [output];
  const commands = segments.map((command, index) => ({ command, argv: extractCommandArgv(command), index }));
  const szuCommands = commands.filter(({ argv }) => Array.isArray(argv) && /^szu-cli(?:\.(?:cmd|exe))?$/i.test(argv[0] ?? ''));
  if (szuCommands.length === 0) return [output, ...segments.slice(1).map(() => '')];

  const jsonObjects = extractJsonObjects(output);
  const assigned = new Map();
  const usedObjects = new Set();
  for (const { argv, index } of szuCommands) {
    const expected = commandMetaName(argv);
    if (!expected) continue;
    const match = jsonObjects.find((object, index) => !usedObjects.has(index) && object.value?.meta?.command === expected);
    if (match) {
      const objectIndex = jsonObjects.indexOf(match);
      usedObjects.add(objectIndex);
      assigned.set(index, match.text);
    }
  }

  for (const { argv, index } of szuCommands) {
    if (assigned.has(index) || argv[1] === '--version') continue;
    const objectIndex = jsonObjects.findIndex((_, candidateIndex) => !usedObjects.has(candidateIndex));
    if (objectIndex >= 0) {
      usedObjects.add(objectIndex);
      assigned.set(index, jsonObjects[objectIndex].text);
    }
  }

  const residual = jsonObjects.reduce((text, object) => text.replace(object.text, ''), output);
  const plainLines = residual.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let plainIndex = 0;
  return commands.map(({ argv, index }) => {
    if (assigned.has(index)) return assigned.get(index);
    if (Array.isArray(argv) && /^szu-cli(?:\.(?:cmd|exe))?$/i.test(argv[0] ?? '') && argv[1] === '--version') {
      return plainLines[plainIndex++] ?? '';
    }
    if (!Array.isArray(argv)) return plainLines[plainIndex++] ?? '';
    return szuCommands.length === 1 ? output : '';
  });
}

function commandSegments(command) {
  return splitShellCommands(command).map((segment) => ({
    command: segment,
    argv: extractCommandArgv(segment)
  }));
}

export function extractCommandArgv(command) {
  const tokens = tokenizeCommand(command);
  const index = tokens.findIndex((token) => /(?:^|[\\/])szu-cli(?:\.(?:cmd|exe))?$/i.test(token));
  if (index >= 0) {
    const argv = tokens.slice(index).map((token) => token.replace(/^['"]|['"]$/g, ''));
    argv[0] = 'szu-cli';
    return argv;
  }

  for (const token of tokens) {
    const nestedTokens = tokenizeCommand(token);
    const nestedIndex = nestedTokens.findIndex((value) => /(?:^|[\\/])szu-cli(?:\.(?:cmd|exe))?$/i.test(value));
    if (nestedIndex >= 0) {
      const argv = nestedTokens.slice(nestedIndex);
      argv[0] = 'szu-cli';
      return argv;
    }
  }

  return null;
}

export function normalizeCodexOutput({ rawText, caseId, startedAt, endedAt, exitCode, finalAnswer = '' }) {
  const events = [{
    seq: 1,
    type: 'run.start',
    caseId,
    startedAt
  }];
  const pendingCommands = new Map();
  let sequence = events.length + 1;

  for (const line of rawText.split(/\r?\n/).filter((value) => value.trim())) {
    const raw = parseJsonLine(line);
    if (!raw) {
      events.push({ seq: sequence++, type: 'codex.raw.unparsed', text: line });
      continue;
    }

    const item = raw.item;
    if (raw.type === 'item.started' && item?.type === 'command_execution') {
      const command = item.command ?? '';
      const segments = commandSegments(command);
      const pending = [];
      for (const [segmentIndex, segment] of segments.entries()) {
        const event = {
          seq: sequence++,
          type: 'tool.call',
          tool: 'shell',
          command: segment.command,
          argv: segment.argv,
          itemId: item.id,
          segmentIndex,
          ...(segments.length > 1 ? { parentCommand: command } : {}),
          sourceEventType: raw.type
        };
        pending.push(event);
        events.push(event);
      }
      pendingCommands.set(item.id, { command, segments, events: pending });
      continue;
    }

    if (raw.type === 'item.completed' && item?.type === 'command_execution') {
      const pending = pendingCommands.get(item.id);
      const command = item.command ?? pending?.command ?? '';
      const output = item.aggregated_output ?? item.output ?? item.stdout ?? '';
      const segments = pending?.segments ?? commandSegments(command);
      const outputs = splitCompoundOutput(segments.map((segment) => segment.command), output);
      for (const [segmentIndex, segment] of segments.entries()) {
        const segmentOutput = outputs[segmentIndex] ?? '';
        const stdoutJson = parseCommandOutput(segmentOutput);
        const inferredExitCode = stdoutJson && typeof stdoutJson.ok === 'boolean'
          ? (stdoutJson.ok ? 0 : 1)
          : item.exit_code ?? item.exitCode ?? null;
        events.push({
          seq: sequence++,
          type: 'tool.result',
          tool: 'shell',
          command: segment.command,
          argv: segment.argv,
          exitCode: inferredExitCode,
          stdout: segmentOutput,
          stdoutJson,
          stderr: item.stderr ?? '',
          itemId: item.id,
          segmentIndex,
          ...(segments.length > 1 ? { parentCommand: command } : {}),
          sourceEventType: raw.type
        });
      }
      continue;
    }

    if (raw.type === 'item.completed' && item?.type === 'agent_message') {
      events.push({
        seq: sequence++,
        type: 'assistant.final',
        text: item.text ?? '',
        itemId: item.id,
        sourceEventType: raw.type
      });
      continue;
    }

    if (raw.type === 'item.started' && item?.type === 'mcp_tool_call') {
      events.push({
        seq: sequence++,
        type: 'tool.call',
        tool: 'mcp',
        name: item.name ?? item.tool ?? '',
        server: item.server ?? '',
        arguments: item.arguments ?? item.input ?? null,
        itemId: item.id,
        sourceEventType: raw.type
      });
      continue;
    }

    if (raw.type === 'item.completed' && item?.type === 'mcp_tool_call') {
      events.push({
        seq: sequence++,
        type: 'tool.result',
        tool: 'mcp',
        name: item.name ?? item.tool ?? '',
        server: item.server ?? '',
        result: item.result ?? item.output ?? null,
        itemId: item.id,
        sourceEventType: raw.type
      });
      continue;
    }

    events.push({
      seq: sequence++,
      type: 'codex.event',
      sourceEventType: raw.type,
      raw
    });
  }

  if (finalAnswer && !events.some((event) => event.type === 'assistant.final' && event.text === finalAnswer)) {
    events.push({
      seq: sequence++,
      type: 'assistant.final',
      text: finalAnswer,
      sourceEventType: 'output-last-message'
    });
  }

  events.push({
    seq: sequence,
    type: 'run.end',
    caseId,
    endedAt,
    exitCode
  });

  return events;
}

export async function readTraceFile(path) {
  const text = await readFile(path, 'utf8');
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}
