import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { selectBundles } from '../../tools/ci/select-test-bundles.mjs';
import { definition } from '../../tools/ci/build-workflow-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const map = JSON.parse(readFileSync(path.join(root, 'tools/ci/test-impact-bundles.json'), 'utf8'));
const ids = (selection) => selection.selectedBundles.map((bundle) => bundle.id);
const allBundleIds = map.bundles.map((bundle) => bundle.id);

test('public menu source selects the public navigation contract bundle', () => {
  const selection = selectBundles(['app/landing/header-menu.js'], map);
  assert.deepEqual(ids(selection), ['public-navigation']);
  assert.equal(selection.fallback.enabled, false);
  assert(selection.selectedBundles[0].execution.some((entry) => entry.commands.includes('node tests/ci/public-navigation-semantic-browser.mjs')));
});

test('shared video fullscreen source selects only its two-page browser contract', () => {
  const selection = selectBundles(['app/core/public-video-fullscreen.js'], map);
  assert.deepEqual(ids(selection), ['public-video-player']);
  assert.equal(selection.fallback.enabled, false);
  assert.deepEqual(selection.unknownPaths, []);
  const execution = selection.selectedBundles[0].execution[0];
  assert.equal(execution.workflow, '.github/workflows/mobile-browser.yml');
  assert(execution.commands.includes('node tests/home-hero-phone-geometry-browser.cjs /tmp/mobile-browser-review'));
});

test('home source markup keeps navigation and video contracts together', () => {
  const selection = selectBundles(['app/index.html'], map);
  assert.deepEqual(ids(selection), ['public-navigation', 'public-video-player']);
  assert.equal(selection.fallback.enabled, false);
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
  assert.deepEqual(ids(selection), allBundleIds);
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

test('V5 normal-save maps to both its concurrency and configuration-boundary contracts', () => {
  const selection = selectBundles(['app/tools/test-v5-normal-save.js'], map);
  assert.deepEqual(ids(selection), ['v5-normal-save-concurrency', 'buyer-configuration-boundary']);
  assert.equal(selection.fallback.enabled, false);
  assert.deepEqual(selection.unknownPaths, []);
  assert(selection.selectedBundles.some((bundle) => bundle.execution.some((entry) =>
    entry.workflow === '.github/workflows/buyer-configuration-boundary.yml' &&
    entry.commands.includes('node app/tools/test-v5-normal-save.js')
  )));
});

test('published configuration handler and endpoint safety select the configuration boundary', () => {
  const selection = selectBundles([
    'netlify/functions/configuration.mjs',
    'app/tools/test-v5-endpoint-safety.js'
  ], map);
  assert.deepEqual(ids(selection), ['buyer-configuration-boundary']);
  assert.equal(selection.fallback.enabled, false);
  assert.deepEqual(selection.unknownPaths, []);
  assert(selection.selectedBundles[0].execution[0].commands.includes('node app/tools/test-published-configuration.js'));
  assert(selection.selectedBundles[0].execution[0].commands.includes('node app/tools/test-v5-endpoint-safety.js'));
});

test('Buyer endpoint access and DTO tests select the configuration boundary', () => {
  const selection = selectBundles([
    'netlify/access/private-endpoint.mjs',
    'tests/buyer-configuration-endpoint.test.mjs',
    'app/tools/test-published-buyer-projection.js'
  ], map);
  assert.deepEqual(ids(selection), ['buyer-configuration-boundary']);
  assert.equal(selection.fallback.enabled, false);
  assert.deepEqual(selection.unknownPaths, []);
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
  assert.deepEqual(ids(selection), allBundleIds);
  assert.deepEqual(selection.unknownPaths, ['app/unknown/new-contract.js']);
  assert(selection.fallback.reasons.includes('unclassified-path'));
});

test('empty or mixed known/unknown diffs do not narrow validation', () => {
  const empty = selectBundles([], map);
  const mixed = selectBundles(['app/landing/header-menu.js', 'architecture/new-contract.md'], map);
  assert.equal(empty.fallback.enabled, true);
  assert.deepEqual(ids(empty), allBundleIds);
  assert.equal(mixed.fallback.enabled, true);
  assert.deepEqual(ids(mixed), allBundleIds);
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


test('impact-map commands resolve to workflow triggers, jobs, and executable steps', () => {
  for (const bundle of map.bundles) {
    for (const execution of bundle.execution) {
      const workflowSource = readFileSync(path.join(root, execution.workflow), 'utf8');
      const parsed = definition(workflowSource, execution.workflow, 'current-workflow-blob');
      const declaredEvents = new Set(parsed.events.map(({ name }) => name));
      for (const event of ['pull_request', 'push', 'workflow_dispatch', 'schedule']) {
        if (execution.scope.includes(event)) {
          assert(declaredEvents.has(event),
            bundle.id + ' claims ' + event + ' scope absent from ' + execution.workflow);
        }
      }

      for (const expectedCommand of execution.commands) {
        const routes = parsed.commands.filter(({ command }) => command.includes(expectedCommand));
        assert(routes.length > 0,
          bundle.id + ' maps a command that is not an executable run step in ' + execution.workflow + ': ' + expectedCommand);
        assert(routes.some((route) => route.jobId && Object.hasOwn(route, 'jobIf')
          && Object.hasOwn(route, 'if') && typeof route.sha256 === 'string' && route.sha256.length === 64),
        bundle.id + ' command route must retain its job, conditions, and command digest: ' + expectedCommand);
      }
      assert(execution.assertion,
        bundle.id + ' executable routes must remain connected to a named assertion');
    }
  }
});

const assertionCrosswalk = JSON.parse(readFileSync(
  path.join(root, 'tools/ci/tst-002-buyer-boundary-crosswalk.json'), 'utf8'
));

test('Buyer assertion crosswalk resolves each assurance to its source and reachable CI route', () => {
  assert.equal(assertionCrosswalk.schema, 'M2DAssertionContractCrosswalk/1');
  assert.equal(assertionCrosswalk.workItem, 'TST-002');
  assert.equal(assertionCrosswalk.status, 'partial');
  assert(assertionCrosswalk.scopeLimit.includes('does not claim full TST-002 coverage'));
  assert.equal(assertionCrosswalk.sourcePin.developmentSha, '17f345aea52eb18ce487b990cd6cb51cc4cf83e0');

  const execution = assertionCrosswalk.execution;
  const bundle = map.bundles.find((candidate) => candidate.id === assertionCrosswalk.slice);
  assert(bundle, 'the crosswalk slice must resolve to an impact bundle');
  assert(bundle.contract.includes('DOM-013'));
  assert(bundle.execution.some((entry) =>
    entry.workflow === execution.workflow && entry.commands.includes(execution.command)
  ), 'the impact bundle must identify the same executable route');

  const workflowSource = readFileSync(path.join(root, execution.workflow), 'utf8');
  const parsedWorkflow = definition(workflowSource, execution.workflow, 'current-workflow-blob');
  const triggerEvents = new Map(parsedWorkflow.events.map((event) => [event.name, event]));
  for (const eventName of execution.events) {
    const event = triggerEvents.get(eventName);
    assert(event, execution.workflow + ' must declare ' + eventName);
    assert.deepEqual(event.branches, execution.branches,
      execution.workflow + ' branch filter must match the crosswalk');
    assert(event.paths.includes(execution.pathFilter),
      execution.workflow + ' ' + eventName + ' paths must reach ' + execution.path);
  }

  const route = parsedWorkflow.commands.find((candidate) =>
    candidate.jobId === execution.job && candidate.command.includes(execution.command)
  );
  assert(route, 'the named job must execute the exact test command');
  assert.equal(route.jobIf, null, 'the mapped job must not be conditionally skipped');
  assert.equal(route.if, null, 'the mapped test step must not be conditionally skipped');
  assert.equal(route.sha256.length, 64);

  const ids = new Set();
  for (const assertion of assertionCrosswalk.assertions) {
    assert(!ids.has(assertion.assertionId), 'assertion IDs must be unique: ' + assertion.assertionId);
    ids.add(assertion.assertionId);
    assert(assertion.source.file && assertion.source.test);
    assert(assertion.contract.length && assertion.risk && assertion.consumer);
    assert(assertion.state && assertion.fixture && assertion.owner);
    assert(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'].includes(assertion.evidence.level));
    assert.equal(assertion.evidence.level, 'E2');
    assert.equal(assertion.trigger.workflow, execution.workflow);
    assert.equal(assertion.trigger.job, execution.job);
    assert.equal(assertion.trigger.command, execution.command);
    assert.deepEqual(assertion.trigger.events, execution.events);
    assert.deepEqual(assertion.trigger.branches, execution.branches);
    assert.equal(assertion.trigger.path, execution.pathFilter);

    const sourcePath = path.join(root, assertion.source.file);
    assert(existsSync(sourcePath), assertion.assertionId + ' source file must exist');
    const source = readFileSync(sourcePath, 'utf8');
    assert(source.includes('test("' + assertion.source.test + '"'),
      assertion.assertionId + ' must resolve to its named runtime test');
    for (const anchor of assertion.source.anchors) {
      assert(source.includes(anchor), assertion.assertionId + ' source assertion anchor is missing: ' + anchor);
    }
  }
  assert.equal(ids.size, 6, 'this reviewed slice currently maps six assertion groups');
});

const maskAssertionCrosswalk = JSON.parse(readFileSync(
  path.join(root, 'tools/ci/tst-004-mask-assertion-crosswalk.json'), 'utf8'
));

test('TST-004 mask assertions resolve to exact sources and the reachable asset gate', () => {
  assert.equal(maskAssertionCrosswalk.schema, 'M2DAssertionContractCrosswalk/1');
  assert.equal(maskAssertionCrosswalk.workItem, 'TST-004');
  assert.equal(maskAssertionCrosswalk.status, 'partial');
  assert(maskAssertionCrosswalk.scopeLimit.includes('does not complete TST-004'));

  const execution = maskAssertionCrosswalk.execution;
  const bundle = map.bundles.find((candidate) => candidate.id === maskAssertionCrosswalk.slice);
  assert(bundle, 'the mask slice must resolve to an impact bundle');
  assert(bundle.contract.includes('approved asset pixel/mask contracts'));
  assert.equal(bundle.execution[0].scope, execution.scope);

  const workflowSource = readFileSync(path.join(root, execution.workflow), 'utf8');
  const parsedWorkflow = definition(workflowSource, execution.workflow, 'current-workflow-blob');
  const triggerEvents = new Map(parsedWorkflow.events.map((event) => [event.name, event]));
  for (const [eventName, expected] of Object.entries(execution.routes)) {
    const event = triggerEvents.get(eventName);
    assert(event, execution.workflow + ' must declare ' + eventName);
    assert.deepEqual(event.branches, expected.branches,
      execution.workflow + ' ' + eventName + ' branch filter must match the crosswalk');
    if (expected.pathIncludes === null) {
      assert.equal(event.paths, null,
        execution.workflow + ' ' + eventName + ' must remain unfiltered by paths');
    } else {
      for (const pathFilter of expected.pathIncludes) {
        assert(event.paths.includes(pathFilter),
          execution.workflow + ' ' + eventName + ' must watch ' + pathFilter);
      }
    }
  }

  const route = parsedWorkflow.commands.find((candidate) =>
    candidate.jobId === execution.job && candidate.step === execution.step
  );
  assert(route, 'the named job must execute the mask validation step');
  assert.equal(route.jobIf, execution.jobCondition, 'the mapped job condition must be recorded');
  assert.equal(route.if, execution.stepCondition, 'the mapped step condition must be recorded');
  for (const command of execution.commands) {
    assert(route.command.includes(command), 'mask gate command is missing: ' + command);
  }
  assert(route.command.includes('if [ "$MASK_RC" -ne 0 ] || [ "$PIXEL_RC" -ne 0 ]; then'));

  const ids = new Set();
  for (const assertion of maskAssertionCrosswalk.assertions) {
    assert(!ids.has(assertion.assertionId), 'assertion IDs must be unique: ' + assertion.assertionId);
    ids.add(assertion.assertionId);
    assert(assertion.contract.length && assertion.risk && assertion.consumer.length);
    assert(assertion.state && assertion.fixture && assertion.owner);
    assert.equal(assertion.trigger.workflow, execution.workflow);
    assert.equal(assertion.trigger.job, execution.job);
    assert.equal(assertion.trigger.step, execution.step);
    assert.deepEqual(assertion.trigger.events, Object.keys(execution.routes));

    const sourcePath = path.join(root, assertion.source.file);
    assert(existsSync(sourcePath), assertion.assertionId + ' source file must exist');
    const source = readFileSync(sourcePath, 'utf8');
    if (assertion.source.test) {
      assert(source.includes('def ' + assertion.source.test + '('),
        assertion.assertionId + ' must resolve to its named Python test');
    }
    for (const anchor of assertion.source.anchors) {
      assert(source.includes(anchor), assertion.assertionId + ' source anchor is missing: ' + anchor);
    }
  }
  assert.equal(ids.size, 3, 'this reviewed slice maps three mask assertion groups');
  assert.equal(maskAssertionCrosswalk.runtimeEvidence.conclusion, 'success');
  assert.equal(maskAssertionCrosswalk.runtimeEvidence.job, execution.job);
});

const publicNavigationCrosswalk = JSON.parse(readFileSync(
  path.join(root, 'tools/ci/tst-004-public-navigation-crosswalk.json'), 'utf8'
));

test('TST-004 public navigation assertions resolve to exact reachable workflow routes', () => {
  assert.equal(publicNavigationCrosswalk.schema, 'M2DAssertionContractCrosswalk/1');
  assert.equal(publicNavigationCrosswalk.workItem, 'TST-004');
  assert.equal(publicNavigationCrosswalk.status, 'partial');
  assert(publicNavigationCrosswalk.scopeLimit.includes('does not map every setup/static command'));

  const bundle = map.bundles.find((candidate) => candidate.id === publicNavigationCrosswalk.slice);
  assert(bundle, 'the public navigation slice must resolve to an impact bundle');
  assert.deepEqual(publicNavigationCrosswalk.executions.map((entry) => entry.workflow),
    bundle.execution.map((entry) => entry.workflow),
    'crosswalk routes must match the existing impact bundle routes');
  assert.equal(publicNavigationCrosswalk.executions.length, 2);
  assert.equal(publicNavigationCrosswalk.scenarioModel.count, 124);
  assert(publicNavigationCrosswalk.scenarioModel.statement.includes('Viewer depth-2 20-case contract is separate'));

  const routesById = new Map();
  for (const execution of publicNavigationCrosswalk.executions) {
    assert(!routesById.has(execution.id), 'execution IDs must be unique');
    routesById.set(execution.id, execution);
    const bundleExecution = bundle.execution.find((entry) => entry.workflow === execution.workflow);
    assert(bundleExecution, 'each execution must exist in the impact bundle');
    assert(bundleExecution.commands.includes(execution.command),
      execution.workflow + ' impact entry must map the same browser command');

    const source = readFileSync(path.join(root, execution.workflow), 'utf8');
    const parsed = definition(source, execution.workflow, 'current-workflow-blob');
    const eventMap = new Map(parsed.events.map((event) => [event.name, event]));
    for (const [eventName, expected] of Object.entries(execution.routes)) {
      const event = eventMap.get(eventName);
      assert(event, execution.workflow + ' must declare ' + eventName);
      assert.deepEqual(event.branches, expected.branches,
        execution.workflow + ' ' + eventName + ' branch filter must match the crosswalk');
      assert.deepEqual(event.types, expected.types,
        execution.workflow + ' ' + eventName + ' activity types must match the crosswalk');
      if (expected.pathIncludes === null) {
        assert.equal(event.paths, null,
          execution.workflow + ' ' + eventName + ' must remain unfiltered by paths');
      } else {
        assert.deepEqual(event.paths, expected.pathIncludes,
          execution.workflow + ' ' + eventName + ' path filters must match exactly');
      }
    }

    const route = parsed.commands.find((candidate) =>
      candidate.jobId === execution.job && candidate.step === execution.step
    );
    assert(route, 'the named workflow step must exist');
    assert(route.command.includes(execution.command),
      execution.workflow + ' must execute the mapped browser command');
    assert.equal(route.jobIf, execution.jobCondition, 'the mapped job condition must be recorded');
    assert.equal(route.if, execution.stepCondition, 'the mapped step condition must be recorded');
  }

  const development = routesById.get('development-public-navigation');
  const production = routesById.get('main-nav005-public-header');
  assert.deepEqual(development.routes.pull_request.branches, ['development']);
  assert.deepEqual(production.routes.pull_request.branches, ['main']);
  assert.deepEqual(development.routes.push.branches, ['development']);
  assert(development.routes.pull_request.pathIncludes.includes('tests/ci/public-navigation-semantic-browser.mjs'),
    'the development PR route must watch the shared browser test');
  assert(production.routes.pull_request.pathIncludes.includes('tests/ci/public-navigation-semantic-browser.mjs'),
    'the main PR route must watch the shared browser test');

  const browserSource = readFileSync(path.join(root, 'tests/ci/public-navigation-semantic-browser.mjs'), 'utf8');
  const assertionIds = new Set();
  for (const assertion of publicNavigationCrosswalk.assertions) {
    assert(!assertionIds.has(assertion.assertionId), 'assertion IDs must be unique');
    assertionIds.add(assertion.assertionId);
    assert(assertion.contract.length && assertion.risk && assertion.consumer.length);
    assert(assertion.state && assertion.fixture && assertion.owner);
    assert(assertion.executionIds.length > 0);
    for (const executionId of assertion.executionIds) {
      assert(routesById.has(executionId), assertion.assertionId + ' must resolve to a declared workflow route');
    }
    for (const anchor of assertion.source.anchors) {
      assert(browserSource.includes(anchor), assertion.assertionId + ' source assertion anchor is missing: ' + anchor);
    }
  }
  assert.equal(assertionIds.size, 5, 'this slice maps five meaningful assertion groups');

  const viewer = publicNavigationCrosswalk.adjacentIndependentGate;
  assert.equal(viewer.scenarioCount, 20);
  assert.notEqual(viewer.workflow, development.workflow,
    'the depth-2 Viewer gate remains independent of the shared 124-case route');
  assert.notEqual(viewer.workflow, production.workflow,
    'the depth-2 Viewer gate remains independent of the production-bound shared route');
});
