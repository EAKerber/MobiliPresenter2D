import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { countDispatchOnlyWorkflows, definition } from '../../tools/ci/build-workflow-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('inventory preserves exact run commands and derives operational signals from them', () => {
  const source = `name: Bounded branch operation
on:
  workflow_dispatch:
permissions:
  contents: write
jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - name: Publish branch update
        run: git push origin HEAD
`;
  const workflow = definition(source, '.github/workflows/bounded.yml', 'blob-sha');
  assert.equal(workflow.commandCount, 1);
  assert.equal(workflow.commands[0].command, 'git push origin HEAD');
  assert.equal(workflow.commands[0].sha256.length, 64);
  assert(workflow.mutationSignals.includes('write permission declared'));
  assert(workflow.mutationSignals.includes('write/deploy command in run step'));
  assert.equal(workflow.classification, 'operational-or-write-capable');
});

test('dispatch-only count uses each workflow development definition pin', () => {
  const definitionBySha = new Map([
    ['manual', { events: [{ name: 'workflow_dispatch' }] }],
    ['push', { events: [{ name: 'push' }, { name: 'workflow_dispatch' }] }],
    ['pull', { events: [{ name: 'pull_request' }] }]
  ]);
  const workflows = [
    { path: 'manual.yml', developmentDefinition: 'manual' },
    { path: 'push.yml', developmentDefinition: 'push' },
    { path: 'pull.yml', developmentDefinition: 'pull' },
    { path: 'main-only.yml', developmentDefinition: null }
  ];
  assert.equal(countDispatchOnlyWorkflows(workflows, definitionBySha), 1);
});


test('TST-001 inventory reads exact development push and pull request heads', () => {
  const source = readFileSync(path.join(root, '.github/workflows/development-test-impact-plan.yml'), 'utf8');
  const workflow = definition(source, '.github/workflows/development-test-impact-plan.yml', 'blob-sha');
  const push = workflow.events.find(({ name }) => name === 'push');
  const pullRequest = workflow.events.find(({ name }) => name === 'pull_request');
  assert(push);
  assert(pullRequest);
  assert.deepEqual(push.branches, ['development']);
  assert.deepEqual(pullRequest.branches, ['development']);
  assert(push.paths.includes('.github/workflows/**'));
  assert(push.paths.includes('tools/ci/build-workflow-inventory.mjs'));
  assert.equal(workflow.events.some(({ name }) => name === 'workflow_dispatch'), false,
    'the development-only workflow must not advertise the inaccessible default-branch dispatch path');

  const inventory = workflow.jobs.find(({ id }) => id === 'inventory');
  assert(inventory);
  assert.equal(inventory.if, "github.event_name == 'push' || github.event_name == 'pull_request'");
  const capture = workflow.commands.find(({ jobId, step }) =>
    jobId === 'inventory' && step === 'Capture exact inventory refs and open PRs');
  assert(capture);
  assert.match(capture.command, /expected_development_sha="\$GITHUB_SHA"/);
  assert.match(capture.command, /test "\$development_sha" = "\$expected_development_sha"/);
  assert.match(capture.command, /GITHUB_EVENT_NAME.*pull_request/);
  assert.match(capture.command, /github\.event\.pull_request\.head\.sha/);
  assert.match(capture.command, /gh pr list --state open --limit 1000/);
  const generate = workflow.commands.find(({ jobId, step }) =>
    jobId === 'inventory' && step === 'Generate SHA-pinned workflow inventory');
  assert(generate);
  assert.match(generate.command, /--main-sha/);
  assert.match(generate.command, /--development-pin/);
  assert.match(generate.command, /--development-tree/);
  assert.match(generate.command, /--open-prs-json/);
  assert(inventory.actions.includes('actions/upload-artifact@v4'));
});

test('the inventory job emits the exact JSON to readable logs and uniquely named artifacts', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/development-test-impact-plan.yml'), 'utf8');
  const occurrences = (text, literal) => text.split(literal).length - 1;
  assert.equal(occurrences(workflow, 'BEGIN_TST001_INVENTORY_JSON'), 1);
  assert.equal(occurrences(workflow, 'cat artifacts/tst-001-workflow-inventory.json'), 1);
  assert.equal(occurrences(workflow, 'END_TST001_INVENTORY_JSON'), 1);
  assert.match(workflow, /tst-001-workflow-inventory-\$\{\{ github\.event_name \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ steps\.refs\.outputs\.development_sha \}\}/);
});


test('glass browser test changes reach both push and pull request gates', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/mobile-browser.yml'), 'utf8');
  const push = workflow.slice(workflow.indexOf('  push:'), workflow.indexOf('  pull_request:'));
  const pullRequest = workflow.slice(workflow.indexOf('  pull_request:'), workflow.indexOf('  workflow_dispatch:'));
  assert(push.includes("'tests/exposed-sides-glass.cjs'"));
  assert(pullRequest.includes("'tests/exposed-sides-glass.cjs'"));
});


test('read-only output, comments, and identifiers do not become mutation signals', () => {
  const source = [
    'name: Read-only receipt',
    'on:',
    '  workflow_dispatch:',
    'permissions:',
    '  contents: read',
    'jobs:',
    '  inspect:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Print historical context',
    '        run: |',
    '          # Do not delete branch refs from this read-only report.',
    '          echo "branch deletion is only historical context"',
    '          node -e "const deleteBranchPlan = false;"',
  ].join('\n');
  const workflow = definition(source, '.github/workflows/read-only.yml', 'blob-sha');
  assert.deepEqual(workflow.mutationSignals, []);
  assert.equal(workflow.classification, 'manual-or-event-driven');
});

test('expected rejected HTTP write-method probes carry their assertion and execution conditions', () => {
  const source = readFileSync(path.join(root, '.github/workflows/public-routing-before-clerk.yml'), 'utf8');
  const workflow = definition(source, '.github/workflows/public-routing-before-clerk.yml', 'blob-sha');
  const probe = workflow.negativeHttpMethodProbes.find(({ method }) => method === 'PUT');
  assert(probe, 'the inventory should retain the expected negative PUT probe');
  assert.equal(probe.expectedStatus, 405);
  assert.equal(probe.jobId, 'browser');
  assert.equal(probe.jobIf, "github.event_name == 'pull_request' && github.event.pull_request.draft != true && github.base_ref == 'main'");
  assert.equal(probe.step, 'Public projection and negative endpoint checks');
  assert.match(probe.commandLine, /test .*curl.*-X PUT.*= 405/);
  assert.deepEqual(workflow.mutationSignals, [],
    'an HTTP method that is asserted to be rejected is not a mutation signal');
});


test('folded workflow run steps preserve their executable shell command', () => {
  const source = readFileSync(path.join(root, '.github/workflows/candidate-assets.yml'), 'utf8');
  const workflow = definition(source, '.github/workflows/candidate-assets.yml', 'blob-sha');
  const command = workflow.commands.find(({ step }) => step === 'Unit-test current candidate contracts');
  assert(command);
  assert.equal(command.command,
    'python -m unittest tests/test_candidate_asset_gates.py tests/test_candidate_asset_sets.py tests/test_candidate_delta_authoring.py tests/test_candidate_authoring_provenance.py tests/test_perspective_editorial_gate.py tests/test_gap_parallelism_gate.py tests/test_gap_pixel_gate.py tests/test_faucet_edge.py');
});
