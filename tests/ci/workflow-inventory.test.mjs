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
  assert.match(dispatch, /GH_TOKEN:\\s*\\$\\{\\{ github\\.token \\}\\}/);
  assert.match(dispatch, /gh pr list --state open --limit 1000 --json number,url,headRefName,headRefOid,baseRefName,baseRefOid/);
  assert.match(dispatch, /--open-prs-json "\\$\\(cat artifacts\\/open-prs\\.json\\)"/);
  assert.doesNotMatch(dispatch, /--open-prs-json '\\[\\]'/);
});
