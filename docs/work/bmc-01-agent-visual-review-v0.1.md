# BMC-01 — Agent visual review v0.1

Status: **PASS_WITH_NOTE** in research mode  
Human review: **pending**  
Default promotion: **not authorized by this review**

## Evidence reviewed

Three browser-gated evidence sets were inspected:

- app-local material gate — run `35474387309`;
- four-case visibility matrix — run `35474563155`;
- historical vs reconstructed comparison — run `35474687787`.

The reviewed states include:

- base-light MDF;
- dark MDF;
- dark MDF with green stone skirting;
- historical base-light;
- historical dark MDF.

## Findings

At normal scene scale the deterministic reconstruction does not show a gross
detached face, scene-wide contamination or ROI leakage.

The historical comparison exposes a real product defect: the old
`module-02-right-exposed-face` remains visually static across finish changes.
The research renderer fixes that class of defect because the side is a material
slot rather than a fixed RGB overlay.

The reconstructed dark side reads coherently as a narrow projected right face.
The base-light state is much subtler because both wall and material are light,
but the local edge/shadow remains visible enough to preserve separation.

The separate plinth depth is also visually meaningful. It creates the expected
recess instead of inheriting the full 530 mm carcass depth.

The **carcass/plinth junction is still the most sensitive visual location**.
At magnified scale there is a small stepped transition because the two physical
depths differ. That is not currently evidence of a geometry defect; it is the
specific point that should receive human review before default promotion.

## Generative decision

No generative residual is justified yet.

The deterministic path already supplies:

- bounded geometry;
- antialiased coverage;
- material-responsive carcass;
- independently material-responsive plinth;
- correct visibility behavior;
- zero pixels outside the authorized ROI.

Introducing image generation now would add appearance entropy before a human has
identified a concrete residual defect.

## Decision

Keep `?reconstruction=bmc01`.

The candidate may advance from machine-valid to agent-reviewed, but not to
default runtime.

Next gate:

1. human review of historical vs reconstructed normal-scale view;
2. human review of the magnified right-side / carcass-plinth junction;
3. if accepted, test default delegation on a non-main integration branch;
4. if rejected, classify the exact residual before choosing deterministic or
   generative correction.
