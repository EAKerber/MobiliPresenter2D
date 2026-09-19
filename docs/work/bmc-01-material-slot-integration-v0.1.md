# BMC-01 — Material-slot integration note v0.1

Status: research / no runtime promotion

The current historical exposed-side entity is structurally incapable of
following finish changes:

- entity: `module-02-right-exposed-face`;
- kind: accessory;
- `finishGroups: []`;
- its RGB is a static overlay.

That matches the previously observed symptom where part of Module 02 does not
change color.

The new reconstruction must therefore **not** be promoted as one static RGB
replacement.

Required material split:

1. exposed carcass side:
   - geometric authority: local carcass quad;
   - neutral appearance/shading donor: current BMC-01 antialiased candidate;
   - material slot: Module 02 finish / MDF;
   - visibility: Module 02 visible AND Module 03 hidden.

2. exposed recessed plinth side:
   - geometric authority: local 348.83 mm plinth quad;
   - neutral appearance/shading donor: dedicated plinth candidate;
   - material slot:
     - normal state: selected front/MDF finish;
     - `stone-skirting` opt-in: selected stone package;
   - visibility: Module 02 visible AND Module 03 hidden.

The existing runtime already distinguishes plinth material this way:
without `stone-skirting` the plinth renderer receives the front finish;
with the service enabled it receives the selected stone material.

Therefore BMC-01 integration should extend the existing material masks/recipes,
not bypass them with a fixed-color overlay.

Research proof:
`review-assets/research/bmc01-material-slot-preview-v0.1`.

The diagnostic preview uses the reconstructed carcass/plinth masks and applies
separate colors to prove bounded material responsiveness. It is not a final
photometric renderer.

Next integration gate:
- material slot masks conditionally active only in `module-03-hidden`;
- zero changes outside those masks;
- published Module 02 finishes recolor the side;
- plinth follows front finish by default;
- plinth follows stone package only with `stone-skirting`;
- restore/default remains pixel-stable outside reconstructed regions.
