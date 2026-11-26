const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', '..');
const workflowPath = join(root, '.github', 'workflows', 'viewer-base-price-contract-gate.yml');
const workflow = readFileSync(workflowPath, 'utf8');
const lines = workflow.split(/\r?\n/);

function sectionAt(header) {
  const start = lines.indexOf(header);
  assert.notEqual(start, -1, `missing workflow section: ${header}`);

  let end = start + 1;
  while (end < lines.length && !/^  [^\s#]/.test(lines[end]) && !/^[^\s#]/.test(lines[end])) end += 1;
  return lines.slice(start, end);
}

function pathFilters(eventName) {
  const section = sectionAt(`  ${eventName}:`);
  const branchesLine = section.find((line) => /^    branches:/.test(line));
  assert(branchesLine, `${eventName} route must declare branches`);
  const branches = branchesLine.match(/\[(.*)\]/)?.[1].split(',').map((item) => item.trim());
  assert.deepEqual(branches, ['main'], `${eventName} route must target main only`);

  const paths = section
    .filter((line) => /^      - /.test(line))
    .map((line) => line.trim().slice(2).replace(/^(['"])(.*)\1$/, '$2'));
  assert(paths.length > 0, `${eventName} route must stay path-filtered`);
  return paths;
}

test('main Viewer price gate reaches its mapped inputs and runs without job-level skips', () => {
  const requiredPaths = [
    'app/admin/**',
    'app/admin.html',
    'app/core/administration-v5.js',
    'app/core/public-module-projection.js',
    'app/core/pricing-contract.js',
    'app/core/flow-model.js',
    'app/data/hierarchy-defaults.js',
    'app/data/configurator-settings.js',
    'app/data/presentation-policy-defaults.js',
    'app/data/catalog-data.js',
    'app/data/mock-price-book.js',
    'app/data/scene-data.js',
    'app/tools/test-administration-v5.js',
    'app/tools/test-v5-normal-save.js',
    'app/tools/test-v5-endpoint-safety.js',
    'app/tools/test-public-modules-endpoint.js',
    'app/viewer/**',
    'netlify/functions/public-modules.mjs',
    'tests/viewer-base-price*',
    'tests/viewer-price-v5-save.test.cjs',
    'tests/ci/viewer-price-wire-contract.test.cjs',
    'tests/ci/viewer-base-price-trigger-contract.test.cjs',
    'package.json',
    'package-lock.json',
    'scripts/compile-primary-pages.mjs',
    '.github/workflows/viewer-base-price-contract-gate.yml'
  ];

  for (const event of ['pull_request', 'push']) {
    const paths = pathFilters(event);
    for (const requiredPath of requiredPaths) {
      assert(paths.includes(requiredPath), `${event} route must watch ${requiredPath}`);
    }
  }

  const job = sectionAt('  price-contract:');
  assert(!job.some((line) => /^    if:/.test(line)), 'price-contract must not have a job-level skip condition');
  assert(workflow.includes('runs-on: ubuntu-24.04'), 'price-contract must use the supported Ubuntu runner');
  assert(workflow.includes('image: mcr.microsoft.com/playwright:v1.56.0-noble'),
    'price-contract must use the Playwright image with matching preinstalled browsers');
  assert(!workflow.includes('npx playwright install --with-deps chromium webkit'),
    'price-contract must not download Playwright browsers on the host runner');
  for (const command of [
    'node --test tests/viewer-base-price-publication.test.cjs tests/viewer-price-v5-save.test.cjs',
    'node --test tests/ci/viewer-base-price-trigger-contract.test.cjs',
    'node --test tests/ci/viewer-price-wire-contract.test.cjs',
    'node app/tools/test-administration-v5.js',
    'node app/tools/test-v5-normal-save.js',
    'node app/tools/test-v5-endpoint-safety.js',
    'node app/tools/test-public-modules-endpoint.js',
    'node tests/viewer-base-price-browser-gate.mjs'
  ]) {
    assert(workflow.includes(command), `price-contract must execute ${command}`);
  }
});
