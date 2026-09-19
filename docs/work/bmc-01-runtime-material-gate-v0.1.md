# BMC-01 — Runtime material gate v0.1

Status: PASS in research mode / no default-runtime promotion  
Branch: `research/reconstruction-architecture-v0.1`

## What is now running

The reconstructed Module 02 right side is available inside the published
`app/` tree and is activated only with:

`?reconstruction=bmc01`

Without that query flag the current runtime continues to use the historical
`module-02-right-exposed-face` entity.

The research renderer delegates that historical RGB overlay and renders two
independent slots:

- carcass side -> current global MDF/front finish;
- recessed plinth side -> MDF/front finish by default;
- recessed plinth side -> selected stone material when `stone-skirting` is enabled.

The published assets are deterministic materializations of the antialiased
research candidate:

`app/assets/kitchen/reconstruction/bmc01/`

They contain separate neutral-RGB and alpha-ownership files for carcass and
plinth plus a provenance manifest.

## Regression gate

The app-local materialization run completed successfully.

Python:
- 95 tests;
- status: OK.

Current app deterministic validators:
- scene/core gate: PASS;
- six material luminance records: exact configured/measured match;
- asset validation: 34 assets, 0 pixel differences, 0 errors;
- R5A pixel-perfect gate: PASS;
- golden pixel difference count: 0.

Static-build smoke also confirmed the reconstruction scripts and all four
runtime reconstruction images are copied into `app/dist`.

## Browser material gate

The browser contract runs against the same publish root used by Netlify
(`app/`), not against repository-parent paths.

Visibility matrix:

| case | module 02 | module 03 | reconstruction alpha |
| --- | --- | --- | ---: |
| both visible | on | on | 0 |
| module 02 hidden | off | on | 0 |
| both hidden | off | off | 0 |
| module 03 hidden | on | off | 2406 |

All cases changed zero reconstruction pixels outside the authorized ROI.

Material samples at canonical point near `[745,590]` / `[745,860]`:

- base light carcass: `[252,251,248]`;
- base light plinth: `[227,226,224]`;
- Carvão carcass: `[48,49,47]`;
- Carvão plinth: `[44,45,43]`;
- selecting Verde profundo without stone skirting leaves the plinth at the
  Carvão value;
- enabling stone skirting changes only the plinth sample to
  `[27,38,32]`;
- carcass remains `[48,49,47]`.

Browser page errors: none.

Review screenshots are emitted for:
- base light;
- dark front finish;
- green stone skirting;
- final hidden state.

## Visual interpretation

At normal scene scale no gross overlap or ROI leakage is visible.

At a magnified crop the new narrow side reads coherently with the dark front
finish and remains visibly separate from the wall. The lower
carcass-to-plinth transition is still the most sensitive visual junction and
should be the main final human-review focus before any default promotion.

## Promotion boundary

This gate proves runtime mechanics, visibility confinement and material
responsiveness. It does **not** by itself approve the reconstruction
aesthetically.

Before replacing the historical entity by default:

1. compare the historical and reconstructed `module-03-hidden` views side by
   side at normal scale and magnified seam scale;
2. review base-light, one dark MDF and stone-skirting states;
3. accept or adjust the lower carcass/plinth junction;
4. only then remove the query-only requirement on a non-main integration branch;
5. rerun the same regression and browser gates before any merge toward main.
