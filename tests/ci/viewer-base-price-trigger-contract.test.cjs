const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const workflow = readFileSync(join(__dirname, '..', '..', '.github', 'workflows', 'viewer-base-price-contract-gate.yml'), 'utf8');
const lines = workflow.split('\n');

function sectionAt(header) {
  const start = lines.indexOf(header);
  assert.notEqual(start, -1, `missing workflow section: ${header}`);
  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.startsWith('  ') && !line.startsWith('   ')) break;
    end += 1;
  }
  return lines.slice(start, end);
}

function branchFilters(eventName) {
  const line = sectionAt(`  ${eventName}:`).find((item) => item.startsWith('    branches:'));
  assert(line, `${eventName} must declare target branches`);
  const open = line.indexOf('[');
  const close = line.indexOf(']', open + 1);
  assert(open >= 0 && close > open, `${eventName} branches must use an explicit list`);
  return line.slice(open + 1, close).split(',').map((value) => value.trim());
}

function pathFilters(eventName) {
  const paths = sectionAt(`  ${eventName}:`)
    .filter((line) => line.startsWith('      - '))
    .map((line) => {
      const value = line.slice(8).trim();
      return value.startsWith("'") || value.startsWith('"') ? value.slice(1, -1) : value;
    });
  assert(paths.length > 0, `${eventName} must remain path-filtered`);
  return paths;
}

test('development Viewer price gate watches every contract input and executes the trigger check', () => {
  assert.deepEqual(new Set(branchFilters('pull_request')), new Set(['main', 'development']));
  assert.deepEqual(new Set(branchFilters('push')), new Set(['development', 'main']));
  const requiredPaths = [
    'app/admin/**', 'app/admin.html',
    'app/core/administration-v5.js', 'app/core/public-module-projection.js',
    'app/core/pricing-contract.js', 'app/core/flow-model.js',
    'app/data/hierarchy-defaults.js', 'app/data/configurator-settings.js',
    'app/data/presentation-policy-defaults.js', 'app/data/catalog-data.js',
    'app/data/mock-price-book.js', 'app/data/scene-data.js',
    'app/tools/test-administration-v5.js', 'app/tools/test-v5-normal-save.js',
    'app/tools/test-v5-endpoint-safety.js', 'app/tools/test-public-modules-endpoint.js',
    'app/viewer/**', 'netlify/functions/public-modules.mjs',
    'tests/viewer-base-price*', 'tests/viewer-price-v5-save.test.cjs',
    'tests/public-module-projection.test.cjs',
    'tests/ci/viewer-price-wire-contract.test.cjs',
    'tests/ci/viewer-base-price-trigger-contract.test.cjs',
    'package.json', 'package-lock.json', 'scripts/compile-primary-pages.mjs',
    '.github/workflows/viewer-base-price-contract-gate.yml'
  ];
  for (const event of ['pull_request', 'push']) {
    const paths = pathFilters(event);
    for (const requiredPath of requiredPaths) {
      assert(paths.includes(requiredPath), `${event} must watch ${requiredPath}`);
    }
  }
  const job = sectionAt('  price-contract:');
  assert(!job.some((line) => line.startsWith('    if:')), 'price-contract must not have a job-level skip condition');
  assert(workflow.includes('node --test tests/ci/viewer-base-price-trigger-contract.test.cjs'));
  assert(workflow.includes('node --test tests/ci/viewer-price-wire-contract.test.cjs tests/public-module-projection.test.cjs'));
  assert(workflow.includes('npm run build'));
  assert(workflow.includes('node tests/viewer-base-price-browser-gate.mjs'));
});
