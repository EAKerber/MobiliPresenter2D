import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory, countDispatchOnlyWorkflows, definition } from '../../tools/ci/build-workflow-inventory.mjs';

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


test('TST-001 pins stable development separately from the PR candidate', () => {
  const source = readFileSync(path.join(root, '.github/workflows/development-test-impact-plan.yml'), 'utf8');
  const workflow = definition(source, '.github/workflows/development-test-impact-plan.yml', 'blob-sha');
  const push = workflow.events.find(({ name }) => name === 'push');
  const pullRequest = workflow.events.find(({ name }) => name === 'pull_request');
  assert(push);
  assert(pullRequest);
  assert.deepEqual(push.branches, ['development']);
  assert.deepEqual(pullRequest.branches, ['development']);
  assert.match(source, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
    'the checkout is the candidate tree, while the inventory separately reads the exact base SHA');
  assert(push.paths.includes('.github/workflows/**'));
  assert(push.paths.includes('tools/ci/build-workflow-inventory.mjs'));
  assert.equal(workflow.events.some(({ name }) => name === 'workflow_dispatch'), false,
    'the development-only workflow must not advertise an inaccessible default-branch dispatch path');

  const inventory = workflow.jobs.find(({ id }) => id === 'inventory');
  assert(inventory);
  assert.equal(inventory.if, "github.event_name == 'push' || github.event_name == 'pull_request'");
  const capture = workflow.commands.find(({ jobId, step }) =>
    jobId === 'inventory' && step === 'Capture exact inventory refs and open PRs');
  assert(capture);
  assert.match(capture.command, /development_sha="\$GITHUB_SHA"/,
    'push inventories pin the exact development event SHA');
  assert.match(capture.command, /development_sha="\$BASE_SHA"/,
    'PR inventories pin stable development to the event base SHA');
  assert.match(capture.command, /candidate_sha="\$HEAD_SHA"/,
    'PR-head definitions remain a separate candidate layer');
  assert.match(capture.command, /candidate_tree=/);
  assert.match(capture.command, /isDraft/);
  assert.match(capture.command, /gh pr list --state open --limit 1000/);
  const generate = workflow.commands.find(({ jobId, step }) =>
    jobId === 'inventory' && step === 'Generate SHA-pinned workflow inventory');
  assert(generate);
  assert.match(generate.command, /--main-sha/);
  assert.match(generate.command, /--development-sha/);
  assert.match(generate.command, /--development-tree/);
  assert.match(generate.command, /--candidate-head-sha/);
  assert.match(generate.command, /--candidate-tree/);
  assert.match(generate.command, /--open-prs-json/);
  assert(inventory.actions.includes('actions/upload-artifact@v4'));
});

test('TST-001 fixture keeps main, exact development, and candidate workflow definitions distinct', () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'tst001-ref-fixture-'));
  const git = (args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  const writeWorkflow = (name, content) => {
    const file = path.join(repoRoot, '.github', 'workflows', name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `name: ${name}
on:
  push:
    branches: [development]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Verify fixture
        run: echo ${content}
`);
  };
  try {
    git(['init', '-b', 'main']);
    git(['config', 'user.name', 'TST-001 fixture']);
    git(['config', 'user.email', 'tst001@example.invalid']);
    writeWorkflow('shared.yml', 'main');
    writeWorkflow('main-only.yml', 'main-only');
    git(['add', '.']);
    git(['commit', '-m', 'fixture main']);
    const mainSha = git(['rev-parse', 'HEAD']);

    git(['checkout', '-b', 'development']);
    writeWorkflow('shared.yml', 'development');
    rmSync(path.join(repoRoot, '.github', 'workflows', 'main-only.yml'));
    writeWorkflow('development-only.yml', 'development-only');
    git(['add', '-A']);
    git(['commit', '-m', 'fixture development']);
    const developmentSha = git(['rev-parse', 'HEAD']);
    const expectedDevelopmentTree = git(['rev-parse', 'HEAD^{tree}']);

    git(['checkout', '-b', 'candidate']);
    rmSync(path.join(repoRoot, '.github', 'workflows', 'development-only.yml'));
    writeWorkflow('shared.yml', 'candidate');
    writeWorkflow('candidate-only.yml', 'candidate-only');
    git(['add', '.']);
    git(['commit', '-m', 'fixture candidate']);
    const candidateHeadSha = git(['rev-parse', 'HEAD']);
    const expectedCandidateTree = git(['rev-parse', 'HEAD^{tree}']);

    const inventory = buildInventory({
      mainSha,
      developmentSha,
      expectedDevelopmentTree,
      candidateHeadSha,
      expectedCandidateTree,
      candidatePrNumber: 42,
      candidateIsDraft: true,
      openPrs: [{ number: 42, isDraft: true, headRefOid: candidateHeadSha }],
      repoRoot
    });
    assert.equal(inventory.source.developmentSha, developmentSha);
    assert.equal(inventory.source.candidateHeadSha, candidateHeadSha);
    assert.equal(inventory.source.candidateIsDraft, true);
    assert.equal(inventory.summary.mainWorkflowCount, 2);
    assert.equal(inventory.summary.developmentWorkflowCount, 2);
    assert.deepEqual(inventory.summary.mainOnly, ['.github/workflows/main-only.yml']);
    assert.deepEqual(inventory.summary.developmentOnly, ['.github/workflows/development-only.yml']);
    assert.deepEqual(inventory.prHeadCandidate.workflows.map(({ path: file, change }) => [file, change]), [
      ['.github/workflows/candidate-only.yml', 'added'],
      ['.github/workflows/development-only.yml', 'removed'],
      ['.github/workflows/shared.yml', 'modified']
    ]);
    assert.equal(inventory.prHeadCandidate.workflows.find(({ path: file }) =>
      file.endsWith('/shared.yml')).developmentDefinition !==
      inventory.prHeadCandidate.workflows.find(({ path: file }) =>
        file.endsWith('/shared.yml')).candidateDefinition, true);
    assert.throws(() => buildInventory({
      mainSha, developmentSha, expectedDevelopmentTree: 'incorrect-tree', repoRoot
    }), /Development tree mismatch/);
    const pushInventory = buildInventory({ mainSha, developmentSha, expectedDevelopmentTree, repoRoot });
    assert.equal(pushInventory.prHeadCandidate, null);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
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
