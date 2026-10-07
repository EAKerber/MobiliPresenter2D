# CP-SD-03A7 — persistent bottom dock discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-03a7-bottom-dock-discovery-2026-10-07.md`.

## Conclusion

No new dock DOM, pricing state, CTA state, presentation schema or generic floating-shell framework is required.

The current buyer shell already contains the exact two policy slots in the exact frozen order:

```html
<footer class="flow-actions">
  <p class="configuration-value" id="configurationValue" aria-live="polite"></p>
  <button id="nextStepButton" class="button button--primary" type="button">...</button>
</footer>
```

The remaining work is presentation authority + viewport clearance:

1. make `presentationPolicy.shell.bottomDock` executable against the existing footer and children;
2. make that same footer persistent without cloning/reparenting it;
3. derive live bottom clearance from the actual dock geometry;
4. teach keyboard/focus scrolling and draggable PiP to respect the dock.

This remains one bounded shell slice.

## Frozen policy authority

`app/data/presentation-policy-defaults.js` declares:

- `shell.bottomDock.enabled = true`;
- `shell.bottomDock.slots = ["estimate", "primary-action"]`.

`app/core/presentation-contract.js` already validates:

- `enabled` is boolean;
- slots are from the closed set `estimate | primary-action`;
- slots do not repeat;
- an enabled dock is non-empty.

No schema or validator extension is justified.

## Existing content/domain owners

### Estimate slot

Stable adapter:
- `#configurationValue`.

Domain owner remains:
- `renderCurrentValue(resolved)`;
- `getEstimate(resolved)`;
- the existing pricing model/state.

The dock must not calculate an estimate itself.

### Primary-action slot

Stable adapter:
- `#nextStepButton`.

Behavior owner remains:
- `syncStep(resolved)` for its stage-dependent label;
- the existing click handler -> `changeStep(...)`.

The dock must not introduce a second CTA state machine.

### Shell adapter

Stable adapter:
- `.flow-actions`.

Its existing child order already matches the frozen slot order.

A8 may reconcile visibility/order from `bottomDock.enabled` + `bottomDock.slots` by moving the existing two child nodes inside the existing footer. It must not clone either slot.

## Effective scroll-owner matrix

### side-rail

Primary stage scrolling:
- `.controls`;
- `max-height: calc(100dvh - 112px)`;
- `overflow-y: auto`.

The flow nav is inside that same scroller and already sticky.

Modules do not own independent vertical scrollers in side-rail; the controls rail owns the scroll.

### stacked

Ordinary stage sections:
- document/window scrolling.

Modules:
- each `.module-stage-pane` owns an independent vertical scroller;
- `overflow-y: auto`;
- fixed stage block-size range.

The flow nav is sticky in the document flow.

### compact

Ordinary stage sections:
- document/window scrolling.

Modules `replace` projection:
- no independent stacked peer-pane scrolling contract;
- visible content follows the document/window path.

The flow nav is sticky in the document flow.

## Current keyboard viewport algorithm

`app/core/keyboard-shortcuts.js` already discovers the nearest real vertical scroller dynamically through `scrollContainerFor(element)`.

`scrollViewport(sectionElement)` then computes:
- top clearance from the visible flow nav;
- bottom = scroller bottom minus 16px, or viewport bottom minus 16px.

This is the correct integration seam.

The defect is narrow: the bottom calculation has no knowledge of the persistent dock.

A8 should preserve dynamic scroller discovery and cap the usable bottom against the **live visible dock top**. Do not add profile-specific keyboard branches.

## Dock geometry

The smallest coherent presentation is to keep `.flow-actions` in normal DOM order and make the enabled dock sticky at the bottom of its effective scrollport.

That gives one element with profile-appropriate behavior:

- side-rail -> sticky against the `.controls` scrollport;
- stacked -> sticky against the document viewport while the controls shell is active;
- compact -> same document-viewport behavior.

A8 must browser-prove this assumption before treating it as final. If one profile cannot sustain the same sticky adapter without reparenting/cloning, stop and split rather than silently inventing a second dock.

The dock should expose:
- stable stacking/background/border treatment;
- bottom safe-area padding;
- no new fixed pixel height.

## Clearance authority

Dock height is content-dependent:
- estimate can wrap;
- compact uses a narrower `.configuration-value` grid;
- safe-area padding may add height.

Therefore the dock height must not be copied as a CSS constant.

A8 should use the **actual dock element** as the geometric authority:

1. a small runtime sync reads the rendered dock block-size when enabled;
2. a `ResizeObserver` keeps a root custom property such as `--bottom-dock-clearance` current;
3. CSS applies that live clearance as scroll padding to relevant scroll owners;
4. keyboard `scrollViewport()` additionally caps its computed bottom against the current dock `getBoundingClientRect().top`, because its custom `scrollBy` algorithm must reason about actual intersection rather than blindly subtracting a height.

These are two consumers of one physical source element, not duplicate policy authorities.

## PiP interaction

A6 PiP is available in stacked/compact and is draggable.

Current drag limit:

```js
maxTop = innerHeight - viewerCard.height - 8
```

That limit ignores the future dock and would allow the PiP to cover the persistent estimate/CTA.

A8 must incorporate the live dock top into the PiP vertical clamp when the dock is enabled and visible.

Requirements:
- default/open PiP remains above the dock;
- downward drag stops above the dock;
- an already-positioned PiP is re-clamped when dock height changes;
- PiP resize must not create bottom overlap;
- no shared “floating chrome framework” is needed: both features may read the same shell dock geometry.

Side-rail does not need PiP/dock collision handling because PiP is policy-unavailable there.

## Policy -> runtime seam

A8 should add one small shell sync around the existing footer:

- read `presentationPolicy.shell.bottomDock`;
- map `estimate -> #configurationValue`;
- map `primary-action -> #nextStepButton`;
- hide the footer when disabled;
- append the existing slot nodes in policy order when enabled;
- expose an enabled marker for CSS/tests;
- synchronize live dock clearance.

No new configuration persistence is involved.

## Minimal implementation files

Expected:
- `app/app.js` — bottom-dock policy projection, live geometry, PiP clamp;
- `app/styles.css` — persistent dock presentation + scroll padding;
- `app/core/keyboard-shortcuts.js` — live dock-aware usable viewport bottom;
- source/browser tests;
- runtime cache revision only if the normal cache contract requires it.

Likely unchanged:
- `app/index.html` structure;
- presentation policy defaults;
- presentation contract;
- pricing model;
- normalized flow schema;
- module/finish/service domain data.

## Execution proof

A8 must prove:

### Policy / DOM
- one `.flow-actions` footer;
- one estimate node and one CTA node;
- slot order follows the frozen policy;
- no cloned pricing/CTA state.

### side-rail
- dock remains visible at the bottom of the controls scroller while stage content scrolls;
- first and last reachable keyboard sections remain unobscured;
- CTA still advances stages and estimate continues updating.

### stacked
- dock remains persistent during document scrolling;
- stacked Modules independent pane scrolling remains intact;
- keyboard section navigation never lands behind the dock.

### compact
- dock remains persistent with safe-area-aware bottom padding;
- compact Modules `replace` behavior remains intact;
- keyboard/window navigation respects the dock.

### PiP coexistence
- stacked manual PiP remains above the dock;
- compact auto PiP remains above the dock;
- dragging downward stops above the dock;
- resize/dock-height changes do not create overlap.

### Regression
- existing flow/price semantics unchanged;
- all repository workflows + Netlify preview green.

## Stop / split

Stop and split if implementation requires:
- moving the action footer outside the existing controls shell;
- cloning estimate/CTA nodes;
- profile-specific dock DOM;
- pricing or CTA domain changes;
- presentation-schema changes;
- a new generic overlay/floating-shell framework;
- PiP redesign beyond consuming the dock boundary;
- production configuration writes.

## Next

Execute:
- `docs/backlog/schema-driven-ui-cp-sd-03a8-bottom-dock-execution-2026-10-07.md`.
