#!/usr/bin/env python3
"""Gera o CSV do Google Ads Editor com a campanha de Display (branding) e os novos orçamentos.

Uso: python3 marketing/google-ads/gerar_display.py
Saída: ar26-display-editor.csv (Editor → Conta → Importar → Do arquivo)

As imagens e os logos do anúncio responsivo não vão no CSV: depois de importar, adicione-os no Editor
(pasta responsivo/). O script para com erro se algum texto passar do limite do Google Ads.
"""
import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent
SITE = "https://www.arenarobotica.com.br/"
START, END = "2026-10-31", "2026-11-08"

# orçamento diário: o Display fica com a maior fatia (pedido do cliente: branding e alcance)
BUDGETS = {
    "AR26 | C04 | Display | Branding DF": 55,
    "AR26 | C02 | Pesquisa | Robótica & Tecnologia": 25,
    "AR26 | C03 | Pesquisa | Lazer & Família": 22,
    "AR26 | C01 | Pesquisa | Marca & Evento": 16,
}
DISPLAY = "AR26 | C04 | Display | Branding DF"
GROUP = "Branding DF"
SUFFIX = "utm_source=google&utm_medium=display&utm_campaign=ar26_display"

SHORT = ["Arena Robótica 26", "Entrada Gratuita no DF", "Batalha de Robôs ao Vivo",
         "R$ 78 Mil em Prêmios", "06 a 08/11 no Mané Garrincha"]
LONG = "Arena Robótica 26: +100 equipes, batalha de robôs e R$ 78 mil em prêmios. Entrada grátis"
DESC = [
    "De 06 a 08/11 na Arena Mané Garrincha. Retire seu ingresso grátis no Sympla.",
    "Mais de 100 equipes, drones, games, oficinas e food park. Programa para toda a família.",
    "Robôs se enfrentando ao vivo em rounds de 3 minutos. Venha torcer, é de graça.",
    "Não precisa entender de robótica: torça, conheça projetos e participe das oficinas.",
    "Leve a família ou a turma da escola. Ingresso gratuito, retire em 1 minuto.",
]
BUSINESS = "Arena Robótica 26"

for t in SHORT:
    assert len(t) <= 30, t
assert len(LONG) <= 90, LONG
for t in DESC:
    assert len(t) <= 90, t
assert len(BUSINESS) <= 25

HEADERS = (["Campaign", "Campaign Type", "Networks", "Budget", "Budget type", "Bid Strategy Type",
            "Campaign Status", "Start Date", "End Date", "Languages", "Final URL suffix",
            "Ad Group", "Ad Group Status", "Ad type", "Status"]
           + [f"Headline {i}" for i in range(1, 6)] + ["Long headline"]
           + [f"Description {i}" for i in range(1, 6)] + ["Business name", "Final URL"])


def row(**kw):
    return {h: kw.get(h, "") for h in HEADERS}


rows = []
# 1) campanhas de pesquisa existentes: só o orçamento muda
for name, b in BUDGETS.items():
    if name != DISPLAY:
        rows.append(row(**{"Campaign": name, "Budget": f"{b:.2f}"}))
# 2) campanha de Display nova (pausada até as imagens entrarem)
rows.append(row(**{
    "Campaign": DISPLAY, "Campaign Type": "Display", "Networks": "Display Network",
    "Budget": f"{BUDGETS[DISPLAY]:.2f}", "Budget type": "Daily", "Bid Strategy Type": "Maximize clicks",  # o Editor recusou "Viewable CPM"; CPM visível é escolhido à mão
    "Campaign Status": "Paused", "Start Date": START, "End Date": END, "Languages": "pt",
    "Final URL suffix": SUFFIX,
}))
rows.append(row(**{"Campaign": DISPLAY, "Ad Group": GROUP, "Ad Group Status": "Enabled"}))
ad = {"Campaign": DISPLAY, "Ad Group": GROUP, "Ad type": "Responsive display ad", "Status": "Enabled",
      "Long headline": LONG, "Business name": BUSINESS, "Final URL": SITE}
ad.update({f"Headline {i + 1}": t for i, t in enumerate(SHORT)})
ad.update({f"Description {i + 1}": t for i, t in enumerate(DESC)})
rows.append(row(**ad))

path = OUT / "ar26-display-editor.csv"
with path.open("w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=HEADERS)
    w.writeheader()
    w.writerows(rows)
print(f"{path.name}: {len(rows)} linhas · orçamento diário total R$ {sum(BUDGETS.values()):.2f}")
