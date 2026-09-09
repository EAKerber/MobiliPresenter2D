# Approved R6 component composition

The user accepted the joint PR23 review with “Ótimo, prossiga”. This receipt pins that exact default composition and its three replacement patches. Cooktop follows module-02; sink and drainer removal follow module-03. The existing approved faucet remains unchanged.

These are fixed-camera replacement patches including backing, not movable cutouts or material layers. No new finish is approved. The isolated generated objects remain available in their authoring packages for subsequent material separation.

`tools/validate_approved_components.py` validates hashes, host visibility, ordered composition and confinement in all four module states. Default pixels must match the approved joint pixel hash. Historical authoring scripts explicitly remove these new entities from their source manifest to reproduce the earlier candidates; runtime validation uses the full manifest.

Main and deployment are outside this integration PR. Next R6 work: separate backing/material from object pixels for stone finish changes without beige islands, then validate the browser experience and prepare a consolidated release.
