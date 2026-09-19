# BMC-02 — Runtime stone-slot gate v0.1

Status: PASS in research mode / no default-runtime promotion  
Branch: `research/reconstruction-architecture-v0.1`

## Ownership result

The exact historical termination candidate contains:

- 80 pixels;
- bounds `[727,569,736,589]`;
- all 80 pixels left of the measured cabinet edge `x=736`.

Current target-state ownership audit found **0/80** pixels in:

- Stone 03 exposed-left current asset;
- Stone 03 conditional bridge;
- Module 03 layer;
- approved Stone 03 overlay;
- exposed Stone 03 top/front-edge semantic masks;
- bridge top/front-edge semantic masks.

Classification:

`UNOWNED_MATERIAL_RESIDUAL`.

This is a small stone termination residual, not a cabinet side face.

## Shared runtime representation

BMC-02 uses the same runtime abstraction now proven by BMC-01:

`deterministic candidate -> neutral RGB + alpha ownership mask -> material policy -> query-gated renderer`.

BMC-02 contributes one slot:

- `termination`;
- material policy: `stone-upper`;
- neutral/mask assets under
  `app/assets/kitchen/reconstruction/bmc02/`.

The source shape remains the exact historical 80-pixel candidate.

## Cross-case gate

Workflow:
`35475546474`.

Results:

- Python suite: **101 tests, PASS**;
- current app deterministic gates: PASS;
- default golden difference count: `0`;
- BMC-01 rematerialization: byte-stable;
- BMC-01 browser regression: PASS;
- BMC-02 browser contract: PASS;
- static publish-root asset smoke: PASS;
- page errors: `0`.

BMC-02 visibility matrix:

| case | Module 02 | Module 03 | BMC-02 alpha |
| --- | --- | --- | ---: |
| both visible | on | on | 0 |
| Module 02 hidden | off | on | 80 |
| both hidden | off | off | 0 |
| Module 03 hidden | on | off | 0 |

All active pixels remain inside the authorized ROI
`[720,510,755,600]`.

## Material behavior

Canonical sampled termination pixel:

- neutral stone: `[233,225,222]`;
- green stone: `[36,51,43]`;
- after changing MDF/front finish: remains `[36,51,43]`.

Therefore:

- selected stone package controls the termination;
- MDF/front finish does not contaminate the stone-only slot;
- geometry/ownership stays fixed while material appearance changes.

## Cross-case abstraction result

BMC-01 and BMC-02 require different reconstruction semantics:

BMC-01:
- two geometric surfaces;
- two donors;
- two material policies;
- delegated legacy overlay.

BMC-02:
- one exact bounded support;
- one neutral source;
- one stone material policy;
- no delegated legacy overlay.

The same runtime renderer and slot representation handle both.

This is the first evidence that these are reusable abstractions rather than
BMC-01-specific implementation details:

- neutral RGB / alpha ownership separation;
- slot-based material rendering;
- declarative visibility requirements;
- per-operation entity delegation;
- query-gated research registry.

## Packet gate

BMC-02 packet:

`review-assets/research/bmc02-reconstruction-packet-v0.1.json`.

Workflow `35475751682` validated **both BMC-01 and BMC-02 packets**:

- BMC-01 packet: PASS;
- BMC-02 packet: PASS;
- Python suite: **101 tests, PASS**.

## Visual review

Agent review:
`PASS_WITH_NOTE`.

The exact 80-pixel boundary is visibly stepped only under strong magnification.

If human review rejects that edge quality, the next method should be
deterministic supersampled/antialiased coverage preserving the same bounded
support. Generation is not justified.

Human review remains pending.
