#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function git(args, encoding = 'utf8', repoRoot = root) {
  return execFileSync('git', args, { cwd: repoRoot, encoding, maxBuffer: 32 * 1024 * 1024 });
}

function scalar(value) {
  const clean = value.trim().replace(/\s+#.*$/, '');
  if (!clean) return '';
  if (clean.startsWith('[') && clean.endsWith(']')) {
    return clean.slice(1, -1).split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
    return clean.slice(1, -1);
  }
  return clean;
}

function collectSequence(lines, start, keyIndent) {
  const values = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent <= keyIndent) break;
    if (indent > keyIndent && /^\s+-\s+/.test(line)) values.push(scalar(line.trim().slice(2)));
  }
  return values.flatMap((value) => Array.isArray(value) ? value : [value]);
}

export function parseEvents(source) {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const start = lines.findIndex((line) => /^on:\s*/.test(line));
  if (start < 0) return { events: [], warnings: ['No top-level on: key found'] };
  const inline = lines[start].replace(/^on:\s*/, '').trim();
  if (inline && inline !== '{}' && inline !== '|') {
    const value = scalar(inline);
    if (Array.isArray(value)) return { events: value.map((name) => ({ name, branches: null, branchIgnores: null, paths: null, pathIgnores: null, types: null })), warnings: [] };
    return { events: [{ name: value, branches: null, branchIgnores: null, paths: null, pathIgnores: null, types: null }], warnings: [] };
  }

  const events = [];
  const warnings = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) break;
    if (indent !== 2) continue;
    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const event = { name: match[1], branches: null, branchIgnores: null, paths: null, pathIgnores: null, types: null };
    const eventInline = match[2].trim();
    if (eventInline.startsWith('[')) {
      event.types = scalar(eventInline);
      events.push(event);
      continue;
    }
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nested = lines[cursor];
      if (!nested.trim() || nested.trimStart().startsWith('#')) continue;
      const nestedIndent = nested.length - nested.trimStart().length;
      if (nestedIndent <= 2) break;
      const filter = nested.match(/^\s{4}(branches|branches-ignore|paths|paths-ignore|types):\s*(.*)$/);
      if (!filter) continue;
      const property = ({ branches: 'branches', 'branches-ignore': 'branchIgnores', paths: 'paths', 'paths-ignore': 'pathIgnores', types: 'types' })[filter[1]];
      const list = filter[2].trim() ? scalar(filter[2]) : collectSequence(lines, cursor, 4);
      event[property] = Array.isArray(list) ? list : [list].filter(Boolean);
    }
    events.push(event);
  }
  if (!events.length) warnings.push('No event entries parsed beneath on:');
  return { events, warnings };
}

function parseSteps(lines) {
  const steps = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^      -\s/.test(lines[index])) continue;
    const block = [lines[index]];
    let end = index + 1;
    while (end < lines.length && !/^      -\s/.test(lines[end]) && !/^    [A-Za-z0-9_-]+:\s*$/.test(lines[end])) {
      block.push(lines[end]);
      end += 1;
    }
    const get = (key) => {
      const match = block.join('\n').match(new RegExp(`^\\s{6}(?:-\\s+)?${key}:\\s*(.*)$`, 'm'));
      return match ? scalar(match[1]) : null;
    };
    const step = { name: get('name'), uses: get('uses'), if: get('if'), workingDirectory: get('working-directory'), run: null };
    const runIndex = block.findIndex((line) => /^\s{6}-?\s*run:\s*/.test(line) || /^\s{8}run:\s*/.test(line));
    if (runIndex >= 0) {
      const runLine = block[runIndex].replace(/^\s{6}-?\s*run:\s*|^\s{8}run:\s*/, '');
      if (runLine && !['|', '|-', '|+', '>', '>-', '>+'].includes(runLine.trim())) step.run = scalar(runLine);
      else {
        const commands = [];
        for (let cursor = runIndex + 1; cursor < block.length; cursor += 1) {
          const line = block[cursor];
          if (line.trim() && (line.length - line.trimStart().length) < 10) break;
          commands.push(line.replace(/^\s{10}/, ''));
        }
        const folded = ['>', '>-', '>+'].includes(runLine.trim());
        step.run = folded ? commands.join(' ').replace(/\s+/g, ' ').trim() : commands.join('\n').trimEnd();
      }
    }
    if (step.name || step.uses || step.run || step.if) steps.push(step);
    index = end - 1;
  }
  return steps;
}

export function parseJobs(source) {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const start = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (start < 0) return { jobs: [], warnings: ['No top-level jobs: key found'] };
  const jobs = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) continue;
    if (lines[index].length - lines[index].trimStart().length === 0) break;
    const match = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (!match) continue;
    const block = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.trim() && line.length - line.trimStart().length === 0) break;
      if (/^  [A-Za-z0-9_-]+:\s*$/.test(line)) break;
      block.push(line);
      cursor += 1;
    }
    const joined = block.join('\n');
    const field = (name) => {
      const found = joined.match(new RegExp(`^\\s{4}${name}:\\s*(.*)$`, 'm'));
      return found ? scalar(found[1]) : null;
    };
    const container = joined.match(/^\s{6}image:\s*(.*)$/m)?.[1] ?? null;
    const serviceStart = block.findIndex((line) => /^\s{4}services:\s*$/.test(line));
    const services = [];
    if (serviceStart >= 0) {
      for (let serviceIndex = serviceStart + 1; serviceIndex < block.length; serviceIndex += 1) {
        const line = block[serviceIndex];
        if (line.trim() && line.length - line.trimStart().length <= 4) break;
        const service = line.match(/^\s{6}([A-Za-z0-9_-]+):\s*$/);
        if (service) services.push(service[1]);
      }
    }
    jobs.push({ id: match[1], name: field('name'), if: field('if'), runsOn: field('runs-on'), container: container ? scalar(container) : null, services, steps: parseSteps(block) });
    index = cursor - 1;
  }
  return { jobs, warnings: jobs.length ? [] : ['No job entries parsed beneath jobs:'] };
}

function fileInventoryFromGit(sha, repoRoot = root) {
  return git(['ls-tree', '-r', '--name-only', sha, '--', '.github/workflows'], 'utf8', repoRoot).trim().split(/\r?\n/).filter((p) => /\.ya?ml$/i.test(p)).sort();
}

function readGitFile(sha, file, repoRoot = root) {
  return git(['show', `${sha}:${file}`], 'utf8', repoRoot);
}

function blob(sha, file, repoRoot = root) {
  return git(['rev-parse', `${sha}:${file}`], 'utf8', repoRoot).trim();
}

function stripShellComment(line) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '#' && (index === 0 || /\s/.test(line[index - 1]))) return line.slice(0, index);
  }
  return line;
}

function expectedNegativeHttpMethodProbe(line) {
  const clean = stripShellComment(line);
  const method = clean.match(/\bcurl\b[^;\n]*?(?:-X\s*|--request\s+)(POST|PUT|PATCH|DELETE)\b/i)?.[1]?.toUpperCase() ?? null;
  const asserted = /(?:^|\s)test\s+["']?\$\(/i.test(clean)
    && /(?:=|==)\s*["']?405["']?\s*$/.test(clean);
  return method && asserted ? { method, expectedStatus: 405, commandLine: clean.trim() } : null;
}

function operationalCommandLines(commands) {
  return commands.flatMap(({ command }) => command.split(/\r?\n/))
    .map(stripShellComment)
    .filter((line) => line.trim())
    .filter((line) => !/^\s*(?:echo|printf)\b/i.test(line) || /(?:&&|\|\||;|\|)/.test(line))
    .filter((line) => !expectedNegativeHttpMethodProbe(line));
}

export function definition(source, file, blobSha) {
  const eventResult = parseEvents(source);
  const jobResult = parseJobs(source);
  const name = source.match(/^name:\s*(.*)$/m)?.[1]?.trim() ?? path.basename(file, path.extname(file));
  const actions = [...new Set(jobResult.jobs.flatMap((job) => job.steps.map((step) => step.uses).filter(Boolean)))];
  const commands = jobResult.jobs.flatMap((job) => job.steps.filter((step) => step.run).map((step) => ({
    job: job.name ?? job.id,
    jobId: job.id,
    jobIf: job.if,
    step: step.name,
    sha256: createHash('sha256').update(step.run).digest('hex'),
    command: step.run,
    if: step.if
  })));
  const negativeHttpMethodProbes = commands.flatMap((command) => command.command.split(/\r?\n/)
    .map(expectedNegativeHttpMethodProbe)
    .filter(Boolean)
    .map((probe) => ({
      job: command.job,
      jobId: command.jobId,
      jobIf: command.jobIf,
      step: command.step,
      stepIf: command.if,
      ...probe
    })));
  const jobSummaries = jobResult.jobs.map((job) => ({
    id: job.id,
    name: job.name,
    if: job.if,
    runsOn: job.runsOn,
    container: job.container,
    services: job.services,
    stepCount: job.steps.length,
    actions: [...new Set(job.steps.map((step) => step.uses).filter(Boolean))]
  }));
  const permissionLines = source.split(/\r?\n/).filter((line) => /^\s+[A-Za-z0-9_-]+:\s*(?:write|read|none)\s*$/.test(line) && /write\s*$/.test(line));
  const commandsText = operationalCommandLines(commands).join('\n');
  const mutationSignals = [];
  if (permissionLines.length) mutationSignals.push('write permission declared');
  if (/\bgit\s+push\b|\bgh\s+pr\s+merge\b|\bgh\s+api\b[^\n]*(?:POST|PATCH|PUT|DELETE)|\bcurl\b[^\n]*-X\s*(?:POST|PATCH|PUT|DELETE)|\bnetlify\s+deploy\b|\bsupabase\s+db\s+push\b/i.test(commandsText)) mutationSignals.push('write/deploy command in run step');
  if (/\bdelete\b|\bretire\b|\bmerge\b/i.test(commandsText) && /branch|ref|pull request|deployment|supabase|netlify/i.test(commandsText)) mutationSignals.push('possible operational command; manual review required');
  const hasSchedule = eventResult.events.some((event) => event.name === 'schedule');
  const automated = eventResult.events.some((event) => ['push', 'pull_request', 'pull_request_target', 'merge_group', 'workflow_run', 'schedule'].includes(event.name));
  const classification = mutationSignals.length ? 'operational-or-write-capable' : automated ? 'automated-validation-or-reporting' : 'manual-or-event-driven';
  const externalIndicators = [];
  if (/\bcurl\b|https?:\/\//i.test(commandsText)) externalIndicators.push('network/http access');
  if (/playwright|chromium|webkit/i.test(commandsText + actions.join('\n'))) externalIndicators.push('browser dependency');
  if (/netlify/i.test(commandsText + actions.join('\n'))) externalIndicators.push('Netlify dependency');
  if (/supabase/i.test(commandsText + actions.join('\n'))) externalIndicators.push('Supabase dependency');
  if (/npm\s+install|npm\s+ci|pip\s+install|setup-node|setup-python/i.test(commandsText + actions.join('\n'))) externalIndicators.push('package installation');
  const artifactActions = actions.filter((action) => /upload-artifact|download-artifact/.test(action));
  return {
    path: file,
    blobSha,
    name,
    events: eventResult.events,
    jobs: jobSummaries,
    actions,
    commandCount: commands.length,
    commands,
    negativeHttpMethodProbes,
    classification,
    mutationSignals,
    externalIndicators: [...new Set(externalIndicators)],
    artifactActions,
    parseWarnings: [...eventResult.warnings, ...jobResult.warnings]
  };
}

function parseArgs(argv) {
  const options = {
    mainSha: null, developmentSha: null, expectedDevelopmentTree: null,
    candidateHeadSha: null, expectedCandidateTree: null,
    candidatePrNumber: null, candidateIsDraft: null,
    output: null, openPrs: [], repoRoot: root
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--main-sha') options.mainSha = argv[++index];
    else if (argv[index] === '--development-sha') options.developmentSha = argv[++index];
    else if (argv[index] === '--development-tree') options.expectedDevelopmentTree = argv[++index];
    else if (argv[index] === '--candidate-head-sha') options.candidateHeadSha = argv[++index] || null;
    else if (argv[index] === '--candidate-tree') options.expectedCandidateTree = argv[++index] || null;
    else if (argv[index] === '--candidate-pr-number') options.candidatePrNumber = argv[++index] ? Number(argv[index]) : null;
    else if (argv[index] === '--candidate-is-draft') options.candidateIsDraft = argv[++index] === 'true';
    else if (argv[index] === '--output') options.output = path.resolve(argv[++index]);
    else if (argv[index] === '--open-prs-json') options.openPrs = JSON.parse(argv[++index]);
    else if (argv[index] === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.help && (!options.mainSha || !options.developmentSha || !options.expectedDevelopmentTree))
    throw new Error('--main-sha, --development-sha, and --development-tree are required.');
  if (options.candidateHeadSha && !options.expectedCandidateTree)
    throw new Error('--candidate-tree is required when --candidate-head-sha is provided.');
  return options;
}

export function countDispatchOnlyWorkflows(workflows, definitionBySha) {
  return workflows.filter((workflow) => {
    if (!workflow.developmentDefinition) return false;
    const definition = definitionBySha.get(workflow.developmentDefinition);
    return definition?.events.length === 1 && definition.events[0].name === 'workflow_dispatch';
  }).length;
}

export function candidateWorkflowChanges(developmentRecords, candidateRecords) {
  const developmentByPath = new Map(developmentRecords.map(({path, blobSha}) => [path, blobSha]));
  const candidateByPath = new Map(candidateRecords.map(({path, blobSha}) => [path, blobSha]));
  const paths = [...new Set([...developmentByPath.keys(), ...candidateByPath.keys()])].sort();
  return paths.map((path) => {
    const developmentDefinition = developmentByPath.get(path) ?? null;
    const candidateDefinition = candidateByPath.get(path) ?? null;
    const change = developmentDefinition === null ? 'added'
      : candidateDefinition === null ? 'removed'
      : developmentDefinition === candidateDefinition ? 'unchanged' : 'modified';
    return {path, change, developmentDefinition, candidateDefinition};
  }).filter(({change}) => change !== 'unchanged');
}

export function buildInventory({
  mainSha, developmentSha, expectedDevelopmentTree,
  candidateHeadSha = null, expectedCandidateTree = null,
  candidatePrNumber = null, candidateIsDraft = null, openPrs = [], repoRoot = root
}) {
  const mainTree = git(['rev-parse', `${mainSha}^{tree}`], 'utf8', repoRoot).trim();
  const resolvedDevelopmentSha = git(['rev-parse', developmentSha], 'utf8', repoRoot).trim();
  const developmentTree = git(['rev-parse', `${resolvedDevelopmentSha}^{tree}`], 'utf8', repoRoot).trim();
  if (developmentTree !== expectedDevelopmentTree)
    throw new Error(`Development tree mismatch: expected ${expectedDevelopmentTree}, found ${developmentTree}`);
  const resolvedCandidateSha = candidateHeadSha
    ? git(['rev-parse', candidateHeadSha], 'utf8', repoRoot).trim() : null;
  const candidateTree = resolvedCandidateSha
    ? git(['rev-parse', `${resolvedCandidateSha}^{tree}`], 'utf8', repoRoot).trim() : null;
  if (resolvedCandidateSha && candidateTree !== expectedCandidateTree)
    throw new Error(`PR candidate tree mismatch: expected ${expectedCandidateTree}, found ${candidateTree}`);

  const mainFiles = fileInventoryFromGit(mainSha, repoRoot);
  const developmentFiles = fileInventoryFromGit(resolvedDevelopmentSha, repoRoot);
  const candidateFiles = resolvedCandidateSha ? fileInventoryFromGit(resolvedCandidateSha, repoRoot) : [];
  const mainSet = new Set(mainFiles);
  const developmentSet = new Set(developmentFiles);
  const paths = [...new Set([...mainFiles, ...developmentFiles])].sort();
  const definitions = new Map();
  const addDefinition = (sha, file) => {
    const blobSha = blob(sha, file, repoRoot);
    if (!definitions.has(blobSha)) definitions.set(blobSha, definition(readGitFile(sha, file, repoRoot), file, blobSha));
    return blobSha;
  };
  const workflows = paths.map((file) => {
    const mainDefinition = mainSet.has(file) ? addDefinition(mainSha, file) : null;
    const developmentDefinition = developmentSet.has(file) ? addDefinition(resolvedDevelopmentSha, file) : null;
    return {
      path: file,
      presence: [mainDefinition ? 'main' : null, developmentDefinition ? 'development' : null].filter(Boolean),
      mainDefinition,
      developmentDefinition
    };
  });
  const candidateChanges = resolvedCandidateSha
    ? candidateWorkflowChanges(
      developmentFiles.map((file) => ({path: file, blobSha: blob(resolvedDevelopmentSha, file, repoRoot)})),
      candidateFiles.map((file) => ({path: file, blobSha: blob(resolvedCandidateSha, file, repoRoot)}))
    ).map((change) => ({
      ...change,
      developmentDefinition: change.developmentDefinition
        ? addDefinition(resolvedDevelopmentSha, change.path) : null,
      candidateDefinition: change.candidateDefinition
        ? addDefinition(resolvedCandidateSha, change.path) : null
    }))
    : [];
  const definitionBySha = new Map([...definitions].map(([sha, value]) => [sha, value]));
  const developmentEventCounts = {};
  for (const workflow of workflows) {
    if (!workflow.developmentDefinition) continue;
    for (const event of definitionBySha.get(workflow.developmentDefinition).events)
      developmentEventCounts[event.name] = (developmentEventCounts[event.name] ?? 0) + 1;
  }
  const warnings = [...definitions.values()].flatMap((value) =>
    value.parseWarnings.map((warning) => `${value.path}: ${warning}`));
  const withWriteSignals = workflows.filter((workflow) =>
    [workflow.mainDefinition, workflow.developmentDefinition].filter(Boolean)
      .some((sha) => definitionBySha.get(sha).mutationSignals.length > 0))
    .map((workflow) => workflow.path);
  const candidateWithWriteSignals = candidateChanges.filter((change) =>
    change.candidateDefinition && definitionBySha.get(change.candidateDefinition).mutationSignals.length > 0)
    .map((change) => change.path);
  return {
    schema: 'M2DTSTWorkflowInventory/2',
    plan: 'MobiliPresenter2D Plano Diretor v0.9',
    workItem: 'TST-001',
    status: warnings.length ? 'generated-with-parse-warnings' : 'generated; command assertion validation remains separate',
    source: {
      mainSha,
      mainTree,
      developmentSha: resolvedDevelopmentSha,
      developmentTree,
      candidateHeadSha: resolvedCandidateSha,
      candidateTree,
      candidatePrNumber,
      candidateIsDraft,
      openPullRequestsReadback: openPrs
    },
    summary: {
      mainWorkflowCount: mainFiles.length,
      developmentWorkflowCount: developmentFiles.length,
      sharedCount: mainFiles.filter((file) => developmentSet.has(file)).length,
      mainOnly: mainFiles.filter((file) => !developmentSet.has(file)),
      developmentOnly: developmentFiles.filter((file) => !mainSet.has(file)),
      developmentEventCounts,
      developmentDispatchOnlyCount: countDispatchOnlyWorkflows(workflows, definitionBySha),
      workflowDefinitions: workflows.length,
      candidateWorkflowChangeCount: candidateChanges.length,
      workflowsWithWriteSignals: [...new Set(withWriteSignals)],
      candidateWorkflowsWithWriteSignals: [...new Set(candidateWithWriteSignals)],
      uniqueDefinitionCount: definitions.size,
      parseWarningCount: warnings.length
    },
    workflows,
    prHeadCandidate: resolvedCandidateSha ? {
      prNumber: candidatePrNumber,
      isDraft: candidateIsDraft,
      headSha: resolvedCandidateSha,
      tree: candidateTree,
      workflows: candidateChanges
    } : null,
    definitions: [...definitions.values()],
    parseWarnings: warnings,
    caveats: [
      'The YAML reader extracts the trigger/job/step fields used by the current repository; it is not a general YAML validator.',
      'Command text and SHA-256 identify the exact declared run-step source; they do not prove every assertion in a command is reachable.',
      'Write-capable classification is a signal for review, not a security proof. Inspect permissions and external side effects before calling a workflow validation-only.',
      'The stable development inventory is read from the exact development SHA; PR-head workflow changes are reported in a separate candidate layer.'
    ]
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: build-workflow-inventory.mjs --main-sha SHA --development-sha SHA --development-tree TREE [--candidate-head-sha SHA --candidate-tree TREE] [--open-prs-json JSON] [--output FILE]\n');
    return;
  }
  const inventory = buildInventory(options);
  const json = `${JSON.stringify(inventory, null, 2)}\n`;
  if (options.output) {
    writeFileSync(options.output, json, 'utf8');
  }
  process.stdout.write(json);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

