# BMC-02 — Agent visual review v0.1

Status: **PASS_WITH_NOTE** in research mode  
Human review: **pending**  
Default promotion: **not authorized**

## Evidence

Reviewed from cross-case run `35475546474`:

- neutral stone return;
- green stone return;
- all four Module 02 / Module 03 visibility combinations;
- BMC-01 regression in the same runtime registry.

Artifact digest:

`sha256:50c4d235b43af226b5a7b21d812581f3849d80288a9415a6d98eac08b47086bf`.

## What the second case proves

BMC-02 is materially different from BMC-01.

BMC-01 needed:
- inferred hidden carcass geometry;
- separate recessed plinth geometry;
- two appearance donors;
- two material policies.

BMC-02 needs only:
- the exact bounded 80-pixel termination support;
- one stone material slot;
- target-state visibility.

That difference is useful because the shared runtime abstraction still holds:
**neutral appearance + semantic alpha mask + declarative material policy +
declarative visibility rule**.

## Visual result

The return remains confined to:

- 80 pixels;
- bounds `[727,569,736,589]`;
- all pixels left of the measured cabinet edge `x=736`.

It does not read as a full-height cabinet side.

At scene scale the neutral return is subtle, which is expected next to the
existing light stone and stove edge.

Changing to the green stone package makes the same small return clearly visible
and confirms that it behaves as stone rather than a static RGB patch.

Changing the MDF/front finish afterward does not alter the return.

## Note

Under strong magnification the exact historical 80-pixel mask has a stepped
edge.

That is not currently grounds for generation.

If human review rejects the edge quality, the next candidate should be a
**deterministic supersampled/antialiased coverage experiment that preserves the
same bounded geometry**, before any appearance generation is considered.

## Decision

Keep `?reconstruction=bmc02`.

Advance the case to agent-reviewed research evidence, not default runtime.
