# R4 — Module 02 fidelity repair + publish contract

Status: candidate

## Goal

Repair two confirmed default-state defects without broadening the photographic scope: remove the white column fragment embedded in module 02 and make module 02 participate in the existing global front-finish system. The same slice also fixes the Netlify publish root to `app/`.

## Parent

- parent checkpoint: `cozinha-01-phase3-stone-split1`
- parent integration commit: `d8ec0dd15c7dc9e61623b5eb3a4bd346b4e7d587`
- parent default fingerprint: `scene2d-89ce17bc`

## Pixel repair

The contamination is a narrow white strip embedded in `02_inferior_fogao.png`. R4 removes pixels by alpha only; no RGB is invented. The authorized cleanup ROI is `[484, 590, 498, 856]` on the canonical 1536×1024 canvas.

The repaired module alpha bounds become `[498, 590, 757, 856]`. The new golden is recomposed from the exact base/layers and differs from the parent golden in 3,579 pixels, all inside that ROI; outside-ROI difference count is zero.

## Finish mask

`assets/kitchen/masks/02.png` becomes a real RGBA mask. It is derived from the repaired module silhouette while protecting the complete oven appliance rectangle `[516, 611, 720, 838]`.

Scene data now binds module 02 to that mask and to `fronts-all`. The frame/cabinet body around the appliance receives finish; the oven panel, controls, handle, glass and stainless face remain protected.

## Runtime/checkpoint transition

Current checkpoint: `cozinha-01-module02-fidelity-fix1`.

The default runtime fingerprint becomes `scene2d-e7c8dba7`; variant fingerprints become:

- `module-02-hidden` → `scene2d-e990f538`
- `module-03-hidden` → `scene2d-ea7073bc`

These fingerprint changes are expected because module 02 now has finish authority and a new scene manifest version; visibility semantics do not change.

## Gates

1. R0/current baseline validator: default recomposition = current golden, 0 px.
2. canonical app tests: 23 tracked assets, 0 px default divergence.
3. parent→current module and golden changes bounded to the cleanup ROI.
4. module 02 cleanup ROI fully transparent.
5. finish mask is a subset of module alpha.
6. finish mask has zero overlap with the protected appliance rectangle.
7. visual artifact: before/after cleanup plus original + five finish previews.
8. R2 variant harness remains active for hidden-state photographic debt.
9. R3 candidate gates remain active for future replacement/endcap assets.

## Netlify

Root `netlify.toml` declares `publish = "app"`; no build command is introduced in this slice.

## Out of scope

- conventional range asset;
- hidden-state endcaps / raw-neighbor-cut repair;
- new finish engine or texture strategy;
- guided commercial UI.
