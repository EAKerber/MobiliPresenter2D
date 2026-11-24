#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function git(args, encoding = 'utf8') {
  return execFileSync('git', args, { cwd: root, encoding, maxBuffer: 32 * 1024 * 1024 });
}

function scalar(value) {
  const clean = value.trim().replace(/\s+#.*$/, '');
  if (!clean) return '';
  if (clean.startsWith('[') && clean.endsWith(']')) {
    return clean.slice(1, -1).split(',').map((part) => part.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  return clean.replace(/^['"]|['"]$/g, '');
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
        step.run = commands.join('\n').trimEnd();
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

function fileInventoryFromGit(sha) {
  return git(['ls-tree', '-r', '--name-only', sha, '--', '.github/workflows']).trim().split(/\r?\n/).filter((p) => /\.ya?ml$/i.test(p)).sort();
}

function fileInventoryFromWorktree() {
  const directory = path.join(root, '.github/workflows');
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name)).map((entry) => `.github/workflows/${entry.name}`).sort();
}

function readGitFile(sha, file) {
  return git(['show', `${sha}:${file}`]);
}

function blob(sha, file) {
  return git(['rev-parse', `${sha}:${file}`]).trim();
}

export function definition(source, file, blobSha) {
  const eventResult = parseEvents(source);
  const jobResult = parseJobs(source);
  const name = source.match(/^name:\s*(.*)$/m)?.[1]?.trim() ?? path.basename(file, path.extname(file));
  const actions = [...new Set(jobResult.jobs.flatMap((job) => job.steps.map((step) => step.uses).filter(Boolean)))];
  const commands = jobResult.jobs.flatMap((job) => job.steps.filter((step) => step.run).map((step) => ({
    job: job.name ?? job.id,
    step: step.name,
    sha256: createHash('sha256').update(step.run).digest('hex'),
    command: step.run,
    if: step.if
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
  const commandsText = commands.map((item) => item.command).join('\n');
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
    classification,
    mutationSignals,
    externalIndicators: [...new Set(externalIndicators)],
    artifactActions,
    parseWarnings: [...eventResult.warnings, ...jobResult.warnings]
  };
}

function parseArgs(argv) {
  const options = { mainSha: null, developmentPin: null, expectedDevelopmentTree: null, output: null, openPrs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--main-sha') options.mainSha = argv[++index];
    else if (argv[index] === '--development-pin') options.developmentPin = argv[++index];
    else if (argv[index] === '--development-tree') options.expectedDevelopmentTree = argv[++index];
    else if (argv[index] === '--output') options.output = path.resolve(argv[++index]);
    else if (argv[index] === '--open-prs-json') options.openPrs = JSON.parse(argv[++index]);
    else if (argv[index] === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.help && (!options.mainSha || !options.developmentPin || !options.expectedDevelopmentTree)) throw new Error('--main-sha, --development-pin, and --development-tree are required.');
  return options;
}

export function countDispatchOnlyWorkflows(workflows, definitionBySha) {
  return workflows.filter((workflow) => {
    if (!workflow.developmentDefinition) return false;
    const definition = definitionBySha.get(workflow.developmentDefinition);
    return definition?.events.length === 1 && definition.events[0].name === 'workflow_dispatch';
  }).length;
}

export function buildInventory({ mainSha, developmentPin, expectedDevelopmentTree, openPrs = [] }) {
  const mainTree = git(['rev-parse', `${mainSha}^{tree}`]).trim();
  const checkoutSha = git(['rev-parse', 'HEAD']).trim();
  const checkoutTree = git(['rev-parse', 'HEAD^{tree}']).trim();
  if (checkoutTree !== expectedDevelopmentTree) throw new Error(`Development worktree tree mismatch: expected ${expectedDevelopmentTree}, found ${checkoutTree}`);
  const mainFiles = fileInventoryFromGit(mainSha);
  const developmentFiles = fileInventoryFromWorktree();
  const mainSet = new Set(mainFiles);
  const devSet = new Set(developmentFiles);
  const paths = [...new Set([...mainFiles, ...developmentFiles])].sort();
  const definitions = new Map();
  const addDefinition = (sha, file, source) => {
    const blobSha = blob(sha, file);
    if (!definitions.has(blobSha)) definitions.set(blobSha, definition(source, file, blobSha));
    return blobSha;
  };
  const workflows = paths.map((file) => {
    const mainDefinition = mainSet.has(file) ? addDefinition(mainSha, file, readGitFile(mainSha, file)) : null;
    const developmentDefinition = devSet.has(file) ? addDefinition(checkoutSha, file, readFileSync(path.join(root, file), 'utf8')) : null;
    return {
      path: file,
      presence: [mainDefinition ? 'main' : null, developmentDefinition ? 'development' : null].filter(Boolean),
      mainDefinition,
      developmentDefinition
    };
  });
  const definitionBySha = new Map([...definitions].map(([sha, value]) => [sha, value]));
  const devCounts = {};
  for (const workflow of workflows) {
    if (!workflow.developmentDefinition) continue;
    for (const event of definitionBySha.get(workflow.developmentDefinition).events) devCounts[event.name] = (devCounts[event.name] ?? 0) + 1;
  }
  const warnings = [...definitions.values()].flatMap((value) => value.parseWarnings.map((warning) => `${value.path}: ${warning}`));
  const withWriteSignals = workflows.filter((workflow) => [workflow.mainDefinition, workflow.developmentDefinition]
    .filter(Boolean)
    .some((sha) => definitionBySha.get(sha).mutationSignals.length > 0))
    .map((workflow) => workflow.path);
  return {
    schema: 'M2DTSTWorkflowInventory/1',
    plan: 'MobiliPresenter2D Plano Diretor v0.9',
    workItem: 'TST-001',
    status: warnings.length ? 'generated-with-parse-warnings' : 'generated; command assertion validation remains separate',
    source: {
      mainSha,
      mainTree,
      developmentPin,
      developmentTree: checkoutTree,
      worktreeHead: checkoutSha,
      worktreeTreeVerifiedAgainstDevelopmentPin: true,
      openPullRequestsReadback: openPrs
    },
    summary: {
      mainWorkflowCount: mainFiles.length,
      developmentWorkflowCount: developmentFiles.length,
      sharedCount: mainFiles.filter((file) => devSet.has(file)).length,
      mainOnly: mainFiles.filter((file) => !devSet.has(file)),
      developmentOnly: developmentFiles.filter((file) => !mainSet.has(file)),
      developmentEventCounts: devCounts,
      developmentDispatchOnlyCount: countDispatchOnlyWorkflows(workflows, definitionBySha),
      workflowDefinitions: workflows.length,
      workflowsWithWriteSignals: [...new Set(withWriteSignals)],
      parseWarningCount: warnings.length
    },
    workflows,
    definitions: [...definitions.values()],
    parseWarnings: warnings,
    caveats: [
      'The YAML reader extracts the trigger/job/step fields used by the current repository; it is not a general YAML validator.',
      'Command text and SHA-256 identify the exact declared run-step source; they do not prove every assertion in a command is reachable.',
      'Write-capable classification is a signal for review, not a security proof. Inspect permissions and external side effects before calling a workflow validation-only.',
      'Open PR list is a live GitHub readback supplied to this snapshot; Draft PR workflow candidates are recorded only when present in that readback.'
    ]
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: build-workflow-inventory.mjs --main-sha SHA --development-pin SHA --development-tree TREE [--open-prs-json JSON] [--output FILE]\n');
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

