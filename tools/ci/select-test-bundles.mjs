#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultMapPath = path.join(here, 'test-impact-bundles.json');

function normalize(input) {
  return input.replaceAll('\\', '/').replace(/^\.\//, '');
}

function matches(pathName, pattern) {
  const candidate = normalize(pathName);
  const glob = normalize(pattern);
  if (!glob.includes('*')) return candidate === glob;
  if (glob.endsWith('/**')) {
    const prefix = glob.slice(0, -3);
    return candidate === prefix || candidate.startsWith(`${prefix}/`);
  }
  if (glob.endsWith('*')) return candidate.startsWith(glob.slice(0, -1));
  throw new Error(`Unsupported impact-map pattern: ${pattern}`);
}

export function selectBundles(changedPaths, map) {
  const normalizedPaths = [...new Set(changedPaths.map(normalize).filter(Boolean))].sort();
  const bundles = map.bundles;
  const matchedByPath = normalizedPaths.map((changedPath) => {
    const bundleIds = bundles.filter((bundle) => bundle.paths.some((pattern) => matches(changedPath, pattern))).map((bundle) => bundle.id);
    return { path: changedPath, bundles: bundleIds };
  });
  const unknownPaths = matchedByPath.filter((item) => item.bundles.length === 0).map((item) => item.path);
  const infrastructurePaths = normalizedPaths.filter((p) =>
    p.startsWith('.github/workflows/') || p.startsWith('tools/ci/') ||
    p === 'package.json' || p === 'package-lock.json' || p === 'pnpm-lock.yaml'
  );
  const fallbackReasons = [];
  if (normalizedPaths.length === 0) fallbackReasons.push('empty-diff');
  if (unknownPaths.length) fallbackReasons.push('unclassified-path');
  if (infrastructurePaths.length) fallbackReasons.push('test-selection-or-ci-infrastructure-changed');

  const fallback = fallbackReasons.length > 0;
  const selectedIds = fallback
    ? bundles.map((bundle) => bundle.id)
    : [...new Set(matchedByPath.flatMap((item) => item.bundles))];
  const selectedBundles = bundles.filter((bundle) => selectedIds.includes(bundle.id));

  return {
    schema: 'M2DTestImpactSelection/1',
    changedPaths: normalizedPaths,
    matches: matchedByPath,
    unknownPaths,
    fallback: fallback ? { enabled: true, reasons: fallbackReasons, policy: map.fallbackPolicy } : { enabled: false, reasons: [] },
    selectedBundles,
    advisoryOnly: true,
    safety: 'Existing path-triggered workflows remain authoritative; this selector never skips or cancels a check.'
  };
}

function parseArgs(argv) {
  const parsed = { paths: [], base: null, head: null, map: defaultMapPath };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base') parsed.base = argv[++i];
    else if (arg === '--head') parsed.head = argv[++i];
    else if (arg === '--map') parsed.map = path.resolve(argv[++i]);
    else if (arg === '--paths') {
      parsed.paths.push(...argv.slice(i + 1));
      break;
    }
    else if (arg === '--help') parsed.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (Boolean(parsed.base) !== Boolean(parsed.head)) throw new Error('Provide both --base and --head, or use --paths.');
  if (parsed.base && parsed.paths.length) throw new Error('Use either --base/--head or --paths, not both.');
  return parsed;
}

function asMarkdown(selection) {
  const lines = [
    '## Test impact selection (advisory)',
    '',
    'Existing path-triggered workflows remain authoritative. This report does not skip or cancel any check.',
    '',
    `Selected bundles: ${selection.selectedBundles.map((bundle) => `\`${bundle.id}\``).join(', ') || 'none'}`,
    ''
  ];
  for (const bundle of selection.selectedBundles) {
    lines.push(`### ${bundle.id}`, `Contracts: ${bundle.contract.join(', ')}`, `Consumers: ${bundle.consumer.join(', ')}`, `Risks: ${bundle.risks.join('; ')}`);
    for (const gate of bundle.execution) {
      lines.push(`- ${gate.workflow} (${gate.scope})`, `  - ${gate.assertion}`);
    }
    lines.push('');
  }
  if (selection.fallback.enabled) {
    lines.push(`Fallback enabled (${selection.fallback.reasons.join(', ')}). Unknown paths: ${selection.unknownPaths.join(', ') || 'none'}.`, '');
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: select-test-bundles.mjs (--base SHA --head SHA | --paths PATH...) [--map FILE]\n');
    return;
  }
  const map = JSON.parse(readFileSync(args.map, 'utf8'));
  if (map.schema !== 'M2DTestImpactMap/1' || !Array.isArray(map.bundles) || map.bundles.length === 0) throw new Error('Invalid or empty impact map.');
  const changedPaths = args.base
    ? execFileSync('git', ['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${args.base}...${args.head}`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
    : args.paths;
  const selection = selectBundles(changedPaths, map);
  const json = `${JSON.stringify(selection, null, 2)}\n`;
  process.stdout.write(json);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `bundle_ids=${selection.selectedBundles.map((bundle) => bundle.id).join(',')}\nfallback=${selection.fallback.enabled}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, asMarkdown(selection));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
