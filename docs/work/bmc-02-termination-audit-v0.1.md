# BMC-02 — Module 03 left stone termination audit v0.1

Status: research / no runtime promotion

## Purpose

Use a second reconstruction class to test whether the abstractions learned from
BMC-01 actually transfer.

BMC-02 is deliberately small:

- target state: Module 02 hidden;
- host: Module 03 / Stone 03;
- historical residual: only the small rounded/chamfered left stone return;
- exact historical candidate: 80 changed pixels;
- candidate bounds: `[727,569,736,589]`;
- authorized ROI: `[720,510,755,600]`;
- measured cabinet/front left edge: `x=736`.

The benchmark punishes over-generation. A full-height side panel is explicitly
forbidden.

## Audit question

The current runtime has since gained:

- a dedicated `stone-03-pia-exposed-left.png` variant;
- semantic Stone 03 top/front-edge masks;
- material-responsive stone rendering.

Therefore the first question is not "how do we regenerate the old 80 pixels?"

It is:

**are those 80 historical residual pixels already owned and material-covered by
the current implementation?**

If yes, the historical candidate is superseded.

If no, its geometry may still be useful evidence, but a static RGB overlay
would be the wrong runtime representation because the termination is stone and
must follow the selected stone material.

## Method

`tools/research_bmc02_termination_ownership.py` compares the exact historical
candidate alpha support against:

- current Stone 03 exposed-left alpha;
- current conditional Stone 03 bridge alpha;
- Module 03 alpha;
- approved Stone 03 components;
- current Stone 03 exposed top/front-edge semantic masks;
- bridge top/front-edge masks.

It also checks how much of the residual lies left of the measured cabinet edge
`x=736`.

This is the same architecture rule that corrected BMC-01:

`physical/semantic role -> current ownership -> material coverage -> only then authoring`.
