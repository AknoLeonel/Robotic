#!/usr/bin/env python3
"""Extrai os vetores do caderno .ai (PDF-compatível) e da Letra Caixa para SVGs
limpos, recortados e recoloridos com o verde neon.

Uso: python3 scripts/extract_vectors.py
Requer: pdftocairo (poppler-utils) e Node + Playwright (para medir o bbox).
"""
import json, re, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "vetores"
OUT = ROOT / "public" / "assets" / "img"

# página do caderno -> nome do arquivo final
PAGES = {
    2: "x-pattern",   # padrão de X encadeados
    3: "lcd-26",      # display "26"
    4: "icon-resize", # quadrado com diagonal
    5: "x-duo",       # dois X
    6: "lcd-arena",   # display "ARENA"
    11: "cursor-hand",# mãozinha pixelada
}
GREEN = re.compile(r'fill="rgb\((?:60\.0|72\.15)[^"]*\)"')
PAGE_BG = re.compile(r'<g clip-path="url\(#clip-0\)">\s*<path[^>]*fill="rgb\(100%, 100%, 100%\)"[^>]*d="M 0 0 L 566\.85[^"]*"/>\s*</g>')
NEON = "#8CFF1A"  # verde neon do digital (o .ai usa a versão CMYK, mais apagada)
NUM = re.compile(r'-?\d+\.\d+')


def to_svg(pdf: Path, page: int, dst: Path):
    subprocess.run(["pdftocairo", "-svg", "-f", str(page), "-l", str(page), str(pdf), str(dst)], check=True)


def clean(svg: str, recolor=True) -> str:
    svg = PAGE_BG.sub("", svg)
    if recolor:
        svg = GREEN.sub(f'fill="{NEON}"', svg)
    svg = NUM.sub(lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), svg)
    svg = re.sub(r'<\?xml[^>]*>\s*', "", svg)
    svg = re.sub(r' fill-opacity="1"', "", svg)
    svg = re.sub(r' fill-rule="nonzero"', "", svg)
    return svg


def bbox(files):
    js = """
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const out = {};
  for (const f of JSON.parse(process.argv[2])) {
    await p.goto('file://' + f);
    out[f] = await p.evaluate(() => { const s = document.querySelector('svg');
      const r = s.getBBox(); return [r.x, r.y, r.width, r.height]; });
  }
  console.log(JSON.stringify(out)); await b.close();
})();"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as t:
        t.write(js)
    res = subprocess.run(["node", t.name, json.dumps([str(f) for f in files])], check=True, capture_output=True, text=True)
    return json.loads(res.stdout)


def crop(path: Path, box):
    x, y, w, h = box
    svg = path.read_text()
    svg = re.sub(r'<svg([^>]*?) width="[^"]*" height="[^"]*" viewBox="[^"]*"',
                 f'<svg\\1 viewBox="{x:.1f} {y:.1f} {w:.1f} {h:.1f}"', svg, count=1)
    svg = re.sub(r'\s*\n\s*', "\n", svg)
    path.write_text(svg)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    made = []
    with tempfile.TemporaryDirectory() as tmp:
        for page, name in PAGES.items():
            raw = Path(tmp) / f"{name}.svg"
            to_svg(SRC / "Caderno-Pngs-SocialMedia.ai", page, raw)
            dst = OUT / f"{name}.svg"
            dst.write_text(clean(raw.read_text(), recolor=name != "cursor-hand"))
            made.append(dst)
        raw = Path(tmp) / "logo.svg"
        to_svg(SRC / "LetraCaixa-835x20m.pdf", 1, raw)
        dst = OUT / "logo-robotica.svg"
        dst.write_text(clean(raw.read_text()))
        made.append(dst)
    boxes = bbox(made)
    # a sombra do cursor usa um padrão radial gigante que infla o bbox; recorte medido no raster
    boxes[str(OUT / "cursor-hand.svg")] = [18, 86, 532, 395]
    for f, box in boxes.items():
        crop(Path(f), box)
        print(f"{Path(f).name}: {box[2]:.0f}x{box[3]:.0f}  {Path(f).stat().st_size} bytes")


def wordmark():
    """Versão só com ROBÓTICA + 26 (sem o "ARENA," de cima), para o hero."""
    svg = (OUT / "logo-robotica.svg").read_text().replace('fill="rgb(100%, 100%, 100%)"', 'fill="#fff"')
    paths = re.findall(r'<path [^>]*/>', svg)
    keep = []
    for p in paths:
        ys = [float(v) for v in re.findall(r'-?\d+\.?\d*', re.search(r' d="([^"]*)"', p).group(1))][1::2]
        if min(ys) > 130:  # o "ARENA," ocupa y < 210 e começa em y=24; o acento do Ó começa em y=135
            keep.append(p)
    out = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 134 2353 413">\n'
           + "\n".join(keep) + "\n</svg>\n")
    (OUT / "logo-robotica-wordmark.svg").write_text(out)
    print(f"logo-robotica-wordmark.svg: {len(keep)} paths")


if __name__ == "__main__":
    main()
    wordmark()
