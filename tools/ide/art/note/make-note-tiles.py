"""Small-size AppIcon artwork: a bold eighth note on the parchment tile.

Apple's own convention — the 16pt and 32pt slots carry SIMPLIFIED art rather
than a downscale of the large icon. The parchment's wordmark and five-line
staff turn to mush below ~64px; a single note holds its shape all the way to
16, and the tan tile keeps the app recognisable as the same one.

Drawn geometrically at 8x and downsampled, which stays crisp where a
downscaled raster does not. Colours are sampled from the real artwork so the
small and large icons are the same app, not two designs.
"""
from PIL import Image, ImageDraw
import os

OUT = "/private/tmp/claude-501/-Users-david-repos-sharpee/a2f4b94e-3ef7-45ea-95c0-4e8081935513/scratchpad/icon-out"
os.makedirs(OUT, exist_ok=True)

PAPER = (185, 156, 123, 255)   # sampled from the chord-diagram tile, so the
                               # small and large icons are one parchment
INK = (0, 0, 0, 255)


def note_tile(px: int) -> Image.Image:
    """The tile at `px`, drawn at 8x and downsampled."""
    S = px * 8
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # Parchment tile: rounded square, heavy ink outline, ~92% of the canvas.
    m = S * 0.04
    radius = S * 0.20
    outline = max(1, int(S * 0.035))
    d.rounded_rectangle([m, m, S - m, S - m], radius=radius,
                        fill=PAPER, outline=INK, width=outline)

    # Eighth note, sized off the tile rather than absolute numbers.
    head_w, head_h = S * 0.34, S * 0.26
    head_x, head_y = S * 0.22, S * 0.52          # lower-left
    d.ellipse([head_x, head_y, head_x + head_w, head_y + head_h], fill=INK)

    stem_w = max(1, int(S * 0.055))
    stem_x = head_x + head_w - stem_w
    stem_top = S * 0.18
    d.rectangle([stem_x, stem_top, stem_x + stem_w, head_y + head_h * 0.55], fill=INK)

    # Flag: a thick wedge off the stem top — the silhouette cue that says
    # "musical note" even when everything else has collapsed.
    flag_w = S * 0.26
    d.polygon([
        (stem_x + stem_w, stem_top),
        (stem_x + stem_w + flag_w, stem_top + S * 0.14),
        (stem_x + stem_w + flag_w * 0.72, stem_top + S * 0.30),
        (stem_x + stem_w, stem_top + S * 0.17),
    ], fill=INK)

    return im.resize((px, px), Image.LANCZOS)


# The 16pt and 32pt slots — both scales, so Retina and non-Retina agree.
for size, scl in [(16, 1), (16, 2), (32, 1), (32, 2)]:
    px = size * scl
    name = f"icon_{size}x{size}{'@2x' if scl == 2 else ''}.png"
    note_tile(px).save(f"{OUT}/{name}")
    print("wrote", name, f"({px}px)")

# Contact sheet: actual size, then 10x nearest-neighbour to inspect the pixels.
sheet = Image.new("RGBA", (900, 300), (245, 245, 245, 255))
d = ImageDraw.Draw(sheet)
x = 30
for px in (16, 32, 64):
    t = note_tile(px)
    sheet.paste(t, (x, 40), t)
    big = t.resize((px * 6, px * 6), Image.NEAREST)
    sheet.paste(big, (x, 90), big)
    d.text((x, 100 + px * 6), f"{px}px", fill=(50, 50, 50, 255))
    x += max(px * 6, 90) + 45
sheet.save(f"{OUT}/note-preview.png")
print("wrote note-preview.png")
