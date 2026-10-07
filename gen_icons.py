from PIL import Image, ImageDraw, ImageFont
import os

OUT = '/Users/manhongleung/AOS/sugar-glass/public'
os.makedirs(OUT, exist_ok=True)

def gradient(size, c1, c2):
    img = Image.new('RGB', (size, size), c1)
    px = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img

def make_icon(size, maskable=False):
    c1 = (250, 168, 212)   # pink
    c2 = (192, 132, 252)   # purple
    img = gradient(size, c1, c2).convert('RGBA')
    d = ImageDraw.Draw(img)
    # soft white circle for monogram area
    pad = int(size * (0.22 if maskable else 0.14))
    d.ellipse([pad, pad, size - pad, size - pad], fill=(255, 255, 255, 230))
    # "V" letter
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Playfair Display.ttf', int(size * 0.42))
    except Exception:
        try:
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', int(size * 0.42))
        except Exception:
            font = ImageFont.load_default()
    text = 'V'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - int(size * 0.02)
    d.text((tx, ty), text, font=font, fill=(192, 132, 252, 255))
    return img

for s in (192, 512):
    make_icon(s).save(f'{OUT}/icon-{s}.png')
make_icon(512, maskable=True).save(f'{OUT}/icon-512-maskable.png')
make_icon(180).save(f'{OUT}/apple-touch-icon.png')
make_icon(64).save(f'{OUT}/favicon.ico', format='ICO')
print('icons generated:', [f for f in os.listdir(OUT) if f.endswith(('.png','.ico'))])
