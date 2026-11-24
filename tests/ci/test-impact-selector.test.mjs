import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { selectBundles } from '../../tools/ci/select-test-bundles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const map = JSON.parse(readFileSync(path.join(root, 'tools/ci/test-impact-bundles.json'), 'utf8'));
const ids = (selection) => selection.selectedBundles.map((bundle) => bundle.id);

test('public menu source selects the public navigation contract bundle', () => {
  const selection = selectBundles(['app/landing/header-menu.js'], map);
  assert.deepEqual(ids(selection), ['public-navigation']);
  assert.equal(selection.fallback.enabled, false);
  assert(selection.selectedBundles[0].execution.some((entry) => entry.commands.includes('node tests/ci/public-navigation-semantic-browser.mjs')));
});

test('mask source and mask regression tests select candidate asset assertions', () => {
  const selection = selectBundles(['app/assets/kitchen/masks/02.png', 'tests/test_mask_semantics.py'], map);
  assert.deepEqual(ids(selection), ['candidate-assets']);
  assert.equal(selection.fallback.enabled, false);
  assert(selection.selectedBundles[0].execution[0].commands.includes('python tests/validate-exposed-side-pixels.py'));
});

test('Viewer price source selects V5 publication, save, and cross-browser assertions', () => {
  const selection = selectBundles(['app/data/mock-price-book.js'], map);
  assert.deepEqual(ids(selection), ['viewer-pricing']);
  assert.equal(selection.fallback.enabled, false);
  assert(selection.selectedBundles[0].execution[0].assertion.includes('ETag'));
});

test('Viewer navigation changes retain both navigation and pricing contracts', () => {
  const selection = selectBundles(['app/viewer/index.html'], map);
  assert.deepEqual(ids(selection), ['public-navigation', 'viewer-pricing']);
  assert.equal(selection.fallback.enabled, false);
});

test('changes to workflow or selector infrastructure select every known bundle', () => {
  const selection = selectBundles(['.github/workflows/candidate-assets.yml'], map);
  assert.deepEqual(ids(selection), ['public-navigation', 'candidate-assets', 'viewer-pricing', 'v5-normal-save-concurrency']);
  assert.equal(selection.fallback.enabled, true);
  assert(selection.fallback.reasons.includes('test-selection-or-ci-infrastructure-changed'));
});

test('candidate asset tool triggers are limited to files that the gate consumes', () => {
  const bundle = map.bundles.find((entry) => entry.id === 'candidate-assets');
  const workflowPath = path.join(root, '.github/workflows/candidate-assets.yml');
  const workflow = readFileSync(workflowPath, 'utf8');
  const toolPaths = bundle.paths.filter((entry) => entry.startsWith('tools/'));
  assert(toolPaths.length > 0);
  for (const toolPath of toolPaths) assert(workflow.includes(`'${toolPath}'`), `candidate-assets.yml must watch ${toolPath}`);
  assert(!workflow.includes("'tools/**'"), 'the broad tools trigger would run asset checks for unrelated CI tooling');
});

test('V5 normal-save concurrency selects only its specific boundary bundle', () => {
  const selection = selectBundles(['app/tools/test-v5-normal-save.js'], map);
  assert.deepEqual(ids(selection), ['v5-normal-save-concurrency']);
  assert.equal(selection.fallback.enabled, false);
  assert.deepEqual(selection.unknownPaths, []);
  assert(selection.selectedBundles[0].execution.some((entry) =>
    entry.workflow === '.github/workflows/buyer-configuration-boundary.yml' &&
    entry.commands.includes('node app/tools/test-v5-normal-save.js')
  ));
});

test('V5 normal-save test is excluded from unrelated broad app gates', () => {
  const unrelated = [
    '.github/workflows/app-build-purity.yml',
    '.github/workflows/candidate-assets.yml',
    '.github/workflows/variant-fidelity.yml',
    '.github/workflows/mobile-browser.yml',
    '.github/workflows/stone-browser.yml',
    '.github/workflows/summary-pricing-browser.yml',
    '.github/workflows/arc13-inventory-integrity.yml'
  ];
  for (const workflowPath of unrelated) {
    const workflow = readFileSync(path.join(root, workflowPath), 'utf8');
    const exclusions = workflow.match(/- '!app\/tools\/test-v5-normal-save\.js'/g) ?? [];
    assert.equal(exclusions.length, 2, `${workflowPath} must exclude the test from both push and pull_request fan-out`);
  }
});

test('unclassified historical paths trigger the conservative fallback', () => {
  const selection = selectBundles(['app/unknown/new-contract.js'], map);
  assert.deepEqual(ids(selection), ['public-navigation', 'candidate-assets', 'viewer-pricing', 'v5-normal-save-concurrency']);
  assert.deepEqual(selection.unknownPaths, ['app/unknown/new-contract.js']);
  assert(selection.fallback.reasons.includes('unclassified-path'));
});

test('empty or mixed known/unknown diffs do not narrow validation', () => {
  const empty = selectBundles([], map);
  const mixed = selectBundles(['app/landing/header-menu.js', 'architecture/new-contract.md'], map);
  assert.equal(empty.fallback.enabled, true);
  assert.deepEqual(ids(empty), ['public-navigation', 'candidate-assets', 'viewer-pricing', 'v5-normal-save-concurrency']);
  assert.equal(mixed.fallback.enabled, true);
  assert.deepEqual(ids(mixed), ['public-navigation', 'candidate-assets', 'viewer-pricing', 'v5-normal-save-concurrency']);
});

test('each bundle names at least one workflow, executable command, assertion, path, and risk', () => {
  for (const bundle of map.bundles) {
    assert(bundle.paths.length > 0, `${bundle.id} needs path coverage`);
    assert(bundle.risks.length > 0, `${bundle.id} needs a risk`);
    assert(bundle.execution.length > 0, `${bundle.id} needs an execution path`);
    for (const entry of bundle.execution) {
      assert(entry.workflow && entry.scope, `${bundle.id} needs a workflow and scope`);
      assert(entry.commands.length > 0, `${bundle.id} needs executable commands`);
      assert(entry.assertion, `${bundle.id} needs a named assertion`);
      const workflowPath = path.join(root, entry.workflow);
      assert(existsSync(workflowPath), `${bundle.id} references a missing workflow: ${entry.workflow}`);
      const workflow = readFileSync(workflowPath, 'utf8');
      for (const command of entry.commands) {
        const referencedFiles = command.match(/(?:tests|app\/tools|tools)\/[\w./-]+/g) ?? [];
        for (const referencedFile of referencedFiles) {
          assert(workflow.includes(referencedFile), `${bundle.id} maps a command that is absent from ${entry.workflow}: ${referencedFile}`);
        }
      }
    }
  }
});
