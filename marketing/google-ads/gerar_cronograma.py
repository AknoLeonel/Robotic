#!/usr/bin/env python3
"""Atualiza as campanhas de pesquisa com o cronograma oficial do evento (CSV para o Google Ads Editor).

Uso: python3 marketing/google-ads/gerar_cronograma.py
Saída: ar26-cronograma-editor.csv (Editor → Conta → Importar → Do arquivo)

Só adiciona; não altera nem remove o que já existe:
  - palavras-chave novas nos grupos atuais (VR, drones FPV, oficinas, competições estudantis);
  - grupo novo "Altas Habilidades & Pais" na C03, com palavras-chave e anúncio;
  - 1 anúncio novo por grupo com os ganchos do cronograma (ativo);
  - 1 anúncio "é hoje" por grupo, PAUSADO, para ativar na manhã de 06/11.
"""
import csv
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("campanhas", HERE / "gerar_campanhas.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

C01, C02, C03 = (c["name"] for c in base.CAMPAIGNS)

# ganchos tirados do cronograma oficial (todos confirmados)
H_CRONOGRAMA = [
    "Grande Final Domingo 14h40",
    "Arena de Drones FPV e VR",
    "Oficinas de Caneta 3D e Laser",
    "Monte Seu Robô na Oficina",
    "Lutas de Robôs Sáb e Dom",
    "R$ 78 Mil em Prêmios",
]
H_HOJE = [
    "É Hoje no Mané Garrincha",
    "Veja Como Chegar à Arena",
    "Aberto Hoje a Partir das 9h",
]
D_CRONOGRAMA = [
    "Batalha de Robôs em 3 categorias, com as grandes finais no domingo, das 14h40 às 15h50.",
    "Arena Gamer, VR e Drones FPV, oficinas de caneta 3D, robótica e laser. Tudo de graça.",
]
D_HOJE = [
    "Acontecendo agora na Arena Mané Garrincha. Retire seu ingresso grátis e venha hoje!",
]

NEW_KW = {
    (C02, "Drones & Games"): ["realidade virtual brasília", "experiência vr brasília", "drone fpv brasília",
                              "pilotar drone fpv", "simulador brasília", "arena gamer brasília"],
    (C02, "Tecnologia & Maker"): ["oficina caneta 3d", "oficina corte a laser", "oficina de robótica brasília",
                                  "feira maker brasília", "oficina maker gratuita"],
    (C02, "Evento de Robótica"): ["robô seguidor de linha", "competição seguidor de linha",
                                  "competição de robótica estudantil", "robótica para estudantes brasília"],
}

ALTAS = {
    "name": "Altas Habilidades & Pais",
    "path": ("altas", "habilidades"),
    "headlines": ["Escola de Pais Gratuita", "Altas Habilidades no DF", "Palestras Sobre Superdotação"],
    "kw": ["altas habilidades brasília", "altas habilidades df", "superdotação brasília", "superdotação df",
           "palestra superdotação", "palestra altas habilidades", "escola de pais brasília",
           "filho superdotado o que fazer", "evento altas habilidades"],
    "desc": [
        "Escola de Pais com palestras e rodas de conversa sobre altas habilidades e superdotação.",
        "Atividades para crianças e adolescentes enquanto os pais participam. Entrada gratuita.",
    ],
}


def dedupe(items, n):
    out = []
    for h in items:
        if h not in out:
            out.append(h)
    return out[:n]


def rsa(campaign, group, headlines, descs, path, status="Enabled"):
    for h in headlines:
        base.check("headline", h, group)
    for d in descs:
        base.check("description", d, group)
    for p in path:
        base.check("path", p, group)
    ad = {"Campaign": campaign, "Ad Group": group, "Ad type": "Responsive search ad", "Status": status,
          "Path 1": path[0], "Path 2": path[1], "Final URL": base.SITE + "#programacao"}
    ad.update({f"Headline {i + 1}": h for i, h in enumerate(headlines)})
    ad.update({f"Description {i + 1}": d for i, d in enumerate(descs)})
    return base.row(**ad)


def build():
    rows, n = [], {"palavras": 0, "grupos": 0, "anuncios_ativos": 0, "anuncios_pausados": 0}

    for (camp, group), kws in NEW_KW.items():
        for k in kws:
            for match in ("Exact", "Phrase"):
                rows.append(base.row(**{"Campaign": camp, "Ad Group": group, "Keyword": k,
                                        "Criterion Type": match, "Status": "Enabled"}))
                n["palavras"] += 1

    # grupo novo na C03
    rows.append(base.row(**{"Campaign": C03, "Ad Group": ALTAS["name"], "Ad Group Status": "Enabled"}))
    n["grupos"] += 1
    for k in ALTAS["kw"]:
        for match in ("Exact", "Phrase"):
            rows.append(base.row(**{"Campaign": C03, "Ad Group": ALTAS["name"], "Keyword": k,
                                    "Criterion Type": match, "Status": "Enabled"}))
            n["palavras"] += 1

    groups = [(c["name"], g) for c in base.CAMPAIGNS for g in c["groups"]] + [(C03, ALTAS)]
    for camp, g in groups:
        specific = g["headlines"]
        descs = g.get("desc", []) + D_CRONOGRAMA + base.D_BASE
        rows.append(rsa(camp, g["name"], dedupe(specific + H_CRONOGRAMA + base.H_BASE, 15),
                        dedupe(descs, 4), g["path"]))
        n["anuncios_ativos"] += 1
        rows.append(rsa(camp, g["name"], dedupe(H_HOJE + specific + H_CRONOGRAMA + base.H_BASE, 15),
                        dedupe(D_HOJE + descs, 4), g["path"], status="Paused"))
        n["anuncios_pausados"] += 1

    path = HERE / "ar26-cronograma-editor.csv"
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=base.HEADERS)
        w.writeheader()
        w.writerows(rows)
    print(f"{path.name}: {len(rows)} linhas · " + " · ".join(f"{v} {k}" for k, v in n.items()))


if __name__ == "__main__":
    build()
