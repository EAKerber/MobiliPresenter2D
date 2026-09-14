# R5A — signed yaw refinement

After the v2 height correction, human review identified a remaining orientation mismatch. The correction is not a whole-object 2D rotation: that would tilt the oven body and re-open vertical/floor gates. R5A therefore adds a signed depth-vector dimension to the Perspective Editorial Gate.

Reference from the exposed module-03 stone edge:

- back ≈ `[751,520]`;
- front ≈ `[742,586]`;
- vector = `[-9,+66]`;
- slope ≈ `-0.1364`.

A symmetric deterministic sweep tested both signs before choosing a direction. The negative sign diverged from the reference; the positive sign converged. The selected transform keeps the accepted placement `[495,508,742,900]` and applies only:

- rear cooktop shift: `+12 px` (right);
- front cooktop shift: `0 px`;
- transition/hinge: local `y=84`;
- body below the hinge: unchanged.

Declared candidate vector: `[-12,+84]`, slope `-0.1429`, signed slope error `0.0065` (limit `0.02`). Height, width, centering and floor-contact measurements remain the accepted v2 values.

The active candidate remains `REVIEW / PENDING`. The recipe and gate are deterministic; runtime promotion still requires exact-hash human approval.
