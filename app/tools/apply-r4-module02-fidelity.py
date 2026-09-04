#!/usr/bin/env python3
"""R4: remove module 02 column contamination and build its finish mask.

This operation is intentionally bounded: it only clears alpha in the proven
column-artifact strip and derives a finish mask from the remaining module
silhouette while protecting the complete oven appliance rectangle.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
LAYER = ROOT / 'assets/kitchen/layers/02_inferior_fogao.png'
OLD_COMBINED = ROOT / 'tools/sources/02_inferior_fogao-combined-v2.png'
NEW_COMBINED = ROOT / 'tools/sources/02_inferior_fogao-combined-v3.png'
APPROVED_ALPHA = ROOT / 'tools/masks/module02-alpha-approved-v3.png'
FINISH_MASK = ROOT / 'assets/kitchen/masks/02.png'

CLEANUP_ROI = (484, 590, 498, 856)
PROTECTED_APPLIANCE = (516, 611, 720, 838)
EXPECTED_OLD_ALPHA_BOUNDS = (484, 590, 757, 856)
EXPECTED_NEW_ALPHA_BOUNDS = (498, 590, 757, 856)


def clear_roi_alpha(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    rgba = image.convert('RGBA')
    before = rgba.getchannel('A')
    after = before.copy()
    ImageDraw.Draw(after).rectangle((CLEANUP_ROI[0], CLEANUP_ROI[1], CLEANUP_ROI[2]-1, CLEANUP_ROI[3]-1), fill=0)
    removed = ImageChops.subtract(before, after)
    rgba.putalpha(after)
    return rgba, removed


def main() -> int:
    original = Image.open(LAYER).convert('RGBA')
    observed_bounds = original.getchannel('A').getbbox()
    if observed_bounds == EXPECTED_OLD_ALPHA_BOUNDS:
        cleaned, removed = clear_roi_alpha(original)
        removed_bounds = removed.getbbox()
        if removed_bounds is None:
            raise RuntimeError('CLEANUP_REMOVED_NOTHING')
    elif observed_bounds == EXPECTED_NEW_ALPHA_BOUNDS:
        cleaned = original
        removed = Image.new('L', original.size, 0)
        removed_bounds = None
        if cleaned.getchannel('A').crop(CLEANUP_ROI).getbbox() is not None:
            raise RuntimeError('CLEANUP_ROI_REGRESSED')
    else:
        raise RuntimeError(f'UNEXPECTED_MODULE02_ALPHA:{observed_bounds}')
    outside = Image.new('L', cleaned.size, 255)
    ImageDraw.Draw(outside).rectangle((CLEANUP_ROI[0], CLEANUP_ROI[1], CLEANUP_ROI[2]-1, CLEANUP_ROI[3]-1), fill=0)
    alpha_diff = ImageChops.difference(original.getchannel('A'), cleaned.getchannel('A'))
    if ImageChops.multiply(alpha_diff, outside).getbbox() is not None:
        raise RuntimeError('CLEANUP_CHANGED_ALPHA_OUTSIDE_ROI')
    if cleaned.getchannel('A').getbbox() != EXPECTED_NEW_ALPHA_BOUNDS:
        raise RuntimeError(f'NEW_ALPHA_BOUNDS_UNEXPECTED:{cleaned.getchannel("A").getbbox()}')
    cleaned.save(LAYER)

    combined = Image.open(OLD_COMBINED).convert('RGBA')
    cleaned_combined, combined_removed = clear_roi_alpha(combined)
    if combined_removed.getbbox() is None:
        raise RuntimeError('COMBINED_CLEANUP_REMOVED_NOTHING')
    cleaned_combined.save(NEW_COMBINED)

    combined_alpha = cleaned_combined.getchannel('A')
    APPROVED_ALPHA.parent.mkdir(parents=True, exist_ok=True)
    combined_alpha.save(APPROVED_ALPHA)

    module_alpha = cleaned.getchannel('A')
    target = Image.new('L', cleaned.size, 0)
    target.paste(module_alpha)
    ImageDraw.Draw(target).rectangle((PROTECTED_APPLIANCE[0], PROTECTED_APPLIANCE[1], PROTECTED_APPLIANCE[2]-1, PROTECTED_APPLIANCE[3]-1), fill=0)
    if target.getbbox() is None:
        raise RuntimeError('FINISH_MASK_EMPTY')
    rgba_mask = Image.new('RGBA', cleaned.size, (255,255,255,0))
    rgba_mask.putalpha(target)
    rgba_mask.save(FINISH_MASK)

    print({'cleanupRoi': CLEANUP_ROI,'removedAlphaBounds': removed_bounds,'module02AlphaBounds': cleaned.getchannel('A').getbbox(),'finishMaskAlphaBounds': target.getbbox(),'protectedAppliance': PROTECTED_APPLIANCE})
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
