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


test('manual inventory dispatch captures open PRs instead of recording an empty list', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/development-test-impact-plan.yml'), 'utf8');
  const dispatch = workflow.slice(workflow.indexOf('  inventory:'), workflow.indexOf('  inventory_on_push:'));
  assert(dispatch.includes('GH_TOKEN: ${{ github.token }}'));
  assert(dispatch.includes('gh pr list --state open --limit 1000 --json number,url,headRefName,headRefOid,baseRefName,baseRefOid'));
  assert(dispatch.includes('--open-prs-json "$(cat artifacts/open-prs.json)"'));
  assert(!dispatch.includes("--open-prs-json '[]'"));
});

test('inventory jobs emit the exact JSON artifact to readable logs', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/development-test-impact-plan.yml'), 'utf8');
  const occurrences = (text, literal) => text.split(literal).length - 1;
  assert.equal(occurrences(workflow, 'BEGIN_TST001_INVENTORY_JSON'), 2);
  assert.equal(occurrences(workflow, 'cat artifacts/tst-001-workflow-inventory.json'), 2);
  assert.equal(occurrences(workflow, 'END_TST001_INVENTORY_JSON'), 2);
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
    'python -m unittest tests.test_candidate_asset_gates tests.test_candidate_asset_sets tests.test_candidate_delta_authoring tests.test_candidate_authoring_provenance tests.test_perspective_editorial_gate tests.test_gap_parallelism_gate tests.test_gap_pixel_gate tests.test_faucet_edge');
});
