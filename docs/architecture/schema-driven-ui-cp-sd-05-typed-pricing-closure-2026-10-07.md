# CP-SD-05 typed pricing closure — 2026-10-07

Status: **COMPLETE / PASS**.

## Outcome

CP-SD-05 removed pricing-type ambiguity from normal runtime and authoring authority without changing current commercial values.

Canonical layers are now:

1. **Public commercial source**
   - `CommercialEstimatePriceBook 2.0`
   - metadata: estimate mode, BRL, label, disclaimer
   - nested `CommercialPricingRules 1.0`

2. **Typed numeric contract**
   - `itemBase`: amount only
   - `handleChoiceTotal`: amount only
   - `frontFinishAdjustment`: amount or percentage
   - `localAdjustment`: amount only
   - `globalAdjustment`: amount only
   - `allocation.handleFrontTotal`: allocation metadata, not a percentage basis

3. **Percentage basis**
   - the only supported basis is `eligible-module-base`
   - percentage is calculated independently for each eligible module base;
   - per-module rounding occurs before summation.

4. **Buyer**
   - consumes typed rules;
   - does not infer type from bucket names;
   - published v3 pricing is upgraded once at the compatibility boundary;
   - current total, summary, module detail and option price copy consume the typed authority.

5. **Admin / unpublished v5**
   - v5 owns typed pricing directly;
   - admin rows derive unit from each rule;
   - only `frontFinishAdjustment` exposes amount/percentage authoring;
   - allowed types derive from `ROLE_CAPABILITIES`;
   - changing type resets the numeric value to zero rather than converting units;
   - percentage authoring exposes its basis.

6. **Legacy v3 compatibility**
   - v3 remains the current production persistence shape;
   - typed rules project to v3 only when lossless;
   - front-finish amount cannot be represented by v3 and returns `pricing_requires_publication`;
   - PriceBook 2.0 -> v3 projection belongs to `configuration.js`, the named v3 compatibility owner;
   - no normal buyer/admin runtime uses v3 bucket names as pricing type authority.

## Exact preserved commercial baseline

The historical defaults remain unchanged:

- default full estimate: 874000 cents;
- Cocoa finish total on the default composition: 99000 cents;
- Tango full handle total: 17985 cents with the existing deterministic fourteen-front allocation;
- all module, local, stone and service amounts are preserved exactly;
- zero-valued choices remain zero.

## Checkpoint sequence

- A0 — contract/basis discovery: COMPLETE / PASS
- A1 — pure typed contract + migration/projection: COMPLETE / PASS
- A2 — buyer calculation authority: COMPLETE / PASS
- A3a — v5/admin typed ownership: COMPLETE / PASS
- A3b — explicit admin type authoring: COMPLETE / PASS
- A4 — PriceBook 2.0 + runtime legacy-bucket retirement: COMPLETE / PASS

## Publication boundary

CP-SD-05 deliberately does **not** publish v5.

Production remains on the guarded v3 endpoint until CP-SD-06 crosses the authenticated publication boundary with:

- a fresh live read;
- revision/content guards;
- exact migration from that source;
- server-side validation;
- losslessness/equivalence proof;
- authenticated write;
- exact readback;
- production smoke verification.

Until that checkpoint, valid typed states that cannot project to v3 remain local drafts and fail closed before network publication.

No production write occurred during CP-SD-05.
