# CP-SD-02A2h0 — stage navigation / core-dispatch residual discovery result — 2026-10-07

Status: **COMPLETE / PASS**.

Baseline:
- `main = 27bdc6b3926d34ac56f7283682ca64838c3fceac`.

## Executive result

Only one non-Modules stage-level semantic duplication remains in CP-SD-02 scope:

> the generic core-stage group dispatcher still binds Finishes, Services and Summary by their historical stage ids instead of the normalized stage's actual id.

Everything else inspected falls into a different category.

## Residual matrix

| Surface | Classification | Action |
| --- | --- | --- |
| compact nav labels | responsive presentation copy | defer to CP-SD-03 / presentation-copy decision |
| `stagePanels` | renderer registry keyed by semantic kind | keep |
| `applyBuyerFlowLayout()` historical non-Modules ids | duplicate semantic authority | remove in A2h1 |
| static group-grid historical ids | duplicate binding identity | make claimable by actual normalized stage id in A2h1 |
| Modules companion/view identity | presentation topology | defer CP-SD-03 |
| scene-service id branches | domain/scene | defer |
| material group ids | domain/material | defer |

## Evidence

The configuration/flow contract treats id and kind separately:
- stage ids are validated for syntax/uniqueness;
- non-custom stage kinds are validated independently and must be unique;
- stage item capability is checked by kind;
- legacy hierarchy templates resolve by `stage.id` or fallback `stage.kind`.

The buyer already maps core visual roots by kind in `stagePanelFor()`.

So a non-Modules core stage can remain semantically Finishes/Services/Summary while carrying a different document id, but the current group mount path still fails because it requests and pre-authors the historical ids.

## Why compact labels stay

The abbreviations are not hidden semantic ownership:
- full stage label/order come from normalized flow;
- CSS only uses `data-compact-label` at narrow nav-container width;
- source tests intentionally require the runtime projection to preserve `Acab.` / `Serv.`.

Replacing them with automatic truncation or a new schema field would be a presentation decision, not a CP-SD-02 hierarchy fix.

## Why stagePanels stays

`stagePanels` is a small renderer registry:
- key = stage kind;
- value = stable accepted visual root.

It does not choose stage order, enabled state, label, groups, sections or item ownership.

Removing it merely to avoid a map would move renderer knowledge elsewhere without reducing semantic duplication.

## A2h1 boundary

A2h1 should:
- iterate normalized non-custom core stages rather than literal Finishes/Services/Summary ids;
- use `stagePanelFor(stage)` for the stable visual root;
- let `mountStageGroups(stage.id, root)` claim the root's single neutral group grid with the actual normalized stage id;
- preserve all existing group/section/component creation and fail-closed checks;
- leave Modules on the current specialized companion path;
- prove valid renamed non-Modules core ids end-to-end.

No production write.
