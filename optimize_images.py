from PIL import Image, ImageOps
import glob, os

PUB = '/Users/manhongleung/AOS/sugar-glass/public'
MAX_W = 720
QUALITY = 78

before = 0
after = 0
for f in sorted(glob.glob(f'{PUB}/p*.jpg')):
    before += os.path.getsize(f)
    im = Image.open(f)
    im = ImageOps.exif_transpose(im)
    if im.width > MAX_W:
        h = round(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.LANCZOS)
    im = im.convert('RGB')
    im.save(f, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    after += os.path.getsize(f)

n = len(glob.glob(f'{PUB}/p*.jpg'))
print(f'{n} 張已壓縮')
print(f'之前: {before/1024/1024:.1f} MB')
print(f'之後: {after/1024/1024:.1f} MB')
print(f'縮減: {100*(before-after)//before}%')
