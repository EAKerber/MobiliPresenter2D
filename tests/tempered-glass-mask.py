import argparse
from pathlib import Path

from PIL import Image


parser = argparse.ArgumentParser()
parser.add_argument(
    "image",
    nargs="?",
    type=Path,
    default=Path(__file__).resolve().parents[1] / "app/assets/kitchen/overlays/tempered-glass.png",
)
alpha = Image.open(parser.parse_args().image).convert("RGBA").getchannel("A")
assert alpha.size == (1536, 1024)
assert alpha.getbbox() == (495, 0, 587, 900), f"unexpected glass alpha bounds: {alpha.getbbox()}"

# The user's marks identify glass above the hood, in its lower negative space,
# across the panel beneath it, and at the bottom return.
for point in [(510, 100), (550, 300), (570, 320), (550, 500), (530, 875)]:
    assert alpha.getpixel(point) > 0, f"glass missing at {point}"

# The plane must stay continuous and remain bounded by its measured silhouette.
assert all(alpha.getpixel((540, y)) > 0 for y in range(320, 856))
for point in [(530, 200), (580, 300), (600, 500), (580, 880)]:
    assert alpha.getpixel(point) == 0, f"glass escaped its silhouette at {point}"

print({"passed": True, "bounds": alpha.getbbox(), "samples": 5, "continuousRows": 536})

