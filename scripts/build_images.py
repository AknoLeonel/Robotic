#!/usr/bin/env python3
"""Gera as imagens otimizadas do site a partir de source/.

Uso: python3 scripts/build_images.py
Requer: Pillow com suporte a WebP.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
KV = ROOT / "source" / "kv"
OUT = ROOT / "public" / "assets" / "img"

# recorte da área do personagem dentro do KV 1920x1080: acima da pílula do QR code e
# antes da pílula de data/local (que começa em x≈772)
CHAR_BOX = (0, 0, 768, 940)
# as ondas brancas do canto superior esquerdo do KV são cobertas com um trecho limpo
# do fundo (espelhado), para não duplicar as ondas que o site já desenha
WAVES_BOX = (0, 0, 240, 280)
CLEAN_BG_BOX = (590, 0, 830, 280)
CHARACTERS = {
    "personagem-menino": "kv-personagem2-menino.webp",
    "personagem-menina": "kv-personagem1-menina.webp",
    "personagem-homem": "kv-personagem3-homem.webp",
}
CHAR_WIDTHS = (420, 600, 768)


def webp(im: Image.Image, dst: Path, q=78):
    im.save(dst, "WEBP", quality=q, method=6)
    print(f"{dst.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {dst.stat().st_size // 1024} KB")


def paint_out_waves(im: Image.Image) -> Image.Image:
    patch = ImageOps.mirror(im.crop(CLEAN_BG_BOX))
    w, h = patch.size
    # máscara com borda suave à direita e embaixo para emendar sem costura
    mask = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(mask)
    for i in range(40):
        a = round(255 * i / 40)
        d.line([(w - 40 + i, 0), (w - 40 + i, h)], fill=255 - a)
        d.line([(0, h - 40 + i), (w - 40 + i, h - 40 + i)], fill=255 - a)
    im.paste(patch, WAVES_BOX[:2], mask.filter(ImageFilter.GaussianBlur(6)))
    return im


def characters():
    """Prefere os PNGs recortados (fundo transparente) quando existirem em source/personagens/."""
    for name, src in CHARACTERS.items():
        cut = ROOT / "source" / "personagens" / f"{name}.png"
        if cut.exists():
            im = Image.open(cut).convert("RGBA")
            im = im.crop(im.getchannel("A").getbbox())
            for w in CHAR_WIDTHS:
                h = round(im.height * w / im.width)
                webp(im.resize((w, h), Image.LANCZOS), OUT / f"{name}-{w}.webp", q=80)
            continue
        im = paint_out_waves(Image.open(KV / src).convert("RGB")).crop(CHAR_BOX)
        for w in CHAR_WIDTHS:
            h = round(im.height * w / im.width)
            webp(im.resize((w, h), Image.LANCZOS), OUT / f"{name}-{w}.webp", q=76)


def textures():
    im = Image.open(KV / "background-verde-texture.webp").convert("RGB")
    for w in (960, 1440):
        h = round(im.height * w / im.width)
        webp(im.resize((w, h), Image.LANCZOS), OUT / f"bg-verde-{w}.webp", q=45)


def og():
    im = Image.open(KV / "kv-personagem2-menino.webp").convert("RGB").resize((1200, 675), Image.LANCZOS)
    im = im.crop((0, 22, 1200, 652))
    dst = OUT / "og-arena-robotica-26.jpg"
    im.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
    print(f"{dst.relative_to(ROOT)}  {dst.stat().st_size // 1024} KB")


def icons():
    """Ícones PNG: '26' em display verde sobre o azul royal."""
    pub = ROOT / "public"
    for size, name, pad in ((180, "apple-touch-icon.png", 0.16), (192, "icon-192.png", 0.16), (512, "icon-512.png", 0.22), (32, "favicon-32.png", 0.08)):
        im = Image.new("RGB", (size, size), (10, 30, 140))
        d = ImageDraw.Draw(im)
        p = round(size * pad)
        d.rounded_rectangle((p, p + size * 0.08, size - p, size - p - size * 0.08), radius=max(2, size // 24), fill=(140, 255, 26))
        # dígitos "26" em segmentos simples, desenhados à mão para não depender de fonte
        seg = max(2, round(size * 0.055))
        def digit(x0, y0, w, h, segs):
            pts = {
                "a": (x0, y0, x0 + w, y0 + seg), "d": (x0, y0 + h - seg, x0 + w, y0 + h),
                "g": (x0, y0 + h / 2 - seg / 2, x0 + w, y0 + h / 2 + seg / 2),
                "b": (x0 + w - seg, y0, x0 + w, y0 + h / 2), "c": (x0 + w - seg, y0 + h / 2, x0 + w, y0 + h),
                "e": (x0, y0 + h / 2, x0 + seg, y0 + h), "f": (x0, y0, x0 + seg, y0 + h / 2),
            }
            for s in segs:
                d.rectangle(pts[s], fill=(10, 30, 140))
        inner_w = size - 2 * p
        dw, dh = inner_w * 0.32, (size - 2 * p - size * 0.16) * 0.62
        y0 = size / 2 - dh / 2
        digit(p + inner_w * 0.13, y0, dw, dh, "abged")
        digit(p + inner_w * 0.55, y0, dw, dh, "afgedc")
        dst = pub / name
        im.save(dst, "PNG", optimize=True)
        print(f"{dst.relative_to(ROOT)}  {dst.stat().st_size // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    characters()
    textures()
    og()
    icons()
