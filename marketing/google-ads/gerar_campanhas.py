#!/usr/bin/env python3
"""Gera os arquivos de importação do Google Ads Editor para a Arena Robótica 26.

Uso: python3 marketing/google-ads/gerar_campanhas.py

Saída (nesta pasta):
  ar26-campanhas-editor.csv   campanhas, grupos, palavras-chave, negativas e anúncios (Editor → Importar → Do arquivo)
  ar26-recursos.tsv           sitelinks, frases de destaque e snippets (Editor → Fazer várias alterações)

O script para com erro se algum texto passar do limite do Google Ads.
"""
import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent
SITE = "https://www.arenarobotica.com.br/"
START, END = "2026-10-26", "2026-11-08"
# sufixo do URL final: as UTMs seguem do site para a Sympla (o gclid vai pela codificação automática)
SUFFIX = "utm_source=google&utm_medium=cpc&utm_campaign=ar26_{campaignid}&utm_term={keyword}"

# ---------------------------------------------------------------------------
# Textos dos anúncios (limites: título 30, descrição 90, caminho 15)
# ---------------------------------------------------------------------------
H_BASE = [
    "Arena Robótica 26",
    "Entrada Gratuita",
    "06 a 08 de Novembro",
    "Arena Mané Garrincha",
    "Retire Seu Ingresso Grátis",
    "Mais de 100 Equipes",
    "Robótica, Drones e Games",
    "Batalha de Robôs ao Vivo",
    "Evento Gratuito em Brasília",
    "Programa Para Toda a Família",
    "Oficinas e Experimentações",
    "Ingresso Grátis no Sympla",
    "Viva a Robótica de Perto",
]
D_BASE = [
    "Mais de 100 equipes com robôs e projetos em desafios ao vivo. Entrada gratuita.",
    "De 06 a 08/11 na Arena Mané Garrincha. Competições, oficinas, ativações e food park.",
    "Não precisa entender de robótica: torça, conheça projetos e participe das atividades.",
    "Retire seu ingresso grátis no Sympla em 1 minuto e traga a família ou a turma da escola!",
]

# headlines específicos de cada grupo entram primeiro; o resto vem da base até 15
CAMPAIGNS = [
    {
        "name": "AR26 | C01 | Pesquisa | Marca & Evento",
        "budget": 30,
        "groups": [
            {
                "name": "Arena Robótica",
                "path": ("arena-robotica", "ingresso"),
                "headlines": ["Arena Robótica 26 em Brasília", "Site Oficial da Arena Robótica"],
                "kw": ["arena robótica", "arena robótica 26", "arena robotica brasilia", "ar26 brasília",
                       "ingresso arena robótica", "arena robótica mané garrincha", "arena robótica 2026"],
            },
            {
                "name": "Mané Garrincha | Eventos",
                "path": ("mane-garrincha", "novembro"),
                "headlines": ["Evento no Mané Garrincha", "Novembro no Mané Garrincha"],
                "kw": ["evento mané garrincha novembro", "eventos arena mané garrincha",
                       "programação mané garrincha", "mané garrincha evento gratuito",
                       "o que vai ter no mané garrincha"],
            },
        ],
        # o estádio tem jogos e shows: fora do escopo do evento
        "neg": ["show", "shows", "futebol", "flamengo", "vasco", "corinthians", "palmeiras",
                "brasileirão", "jogo do", "camarote", "tour mané garrincha"],
    },
    {
        "name": "AR26 | C02 | Pesquisa | Robótica & Tecnologia",
        "budget": 50,
        "groups": [
            {
                "name": "Evento de Robótica",
                "path": ("robotica", "brasilia"),
                "headlines": ["Evento de Robótica em Brasília", "Competição de Robótica no DF"],
                "kw": ["evento de robótica", "evento de robótica brasília", "feira de robótica",
                       "competição de robótica", "campeonato de robótica", "torneio de robótica",
                       "robótica brasília", "robótica df"],
            },
            {
                "name": "Batalha de Robôs",
                "path": ("batalha", "de-robos"),
                "headlines": ["Robôs Se Enfrentando ao Vivo", "Batalha de Robôs em Brasília"],
                "kw": ["batalha de robôs", "luta de robôs", "combate de robôs", "robôs de combate",
                       "guerra de robôs brasília"],
            },
            {
                "name": "Drones & Games",
                "path": ("drones", "games"),
                "headlines": ["Drones e Games em Brasília", "Evento de Drones e Games"],
                "kw": ["evento de drones", "corrida de drones", "evento drones brasília",
                       "evento gamer brasília", "evento de games brasília", "campeonato de games df"],
            },
            {
                "name": "Tecnologia & Maker",
                "path": ("tecnologia", "maker"),
                "headlines": ["Evento de Tecnologia no DF", "Oficinas Maker Gratuitas"],
                "kw": ["evento de tecnologia brasília", "feira de tecnologia brasília",
                       "evento maker brasília", "oficina de robótica gratuita", "evento de ciência brasília",
                       "feira de ciências brasília", "robótica educacional evento"],
            },
        ],
        "neg": [],
    },
    {
        "name": "AR26 | C03 | Pesquisa | Lazer & Família",
        "budget": 40,
        "groups": [
            {
                "name": "Programa em Família",
                "path": ("familia", "gratis"),
                "headlines": ["Passeio Grátis em Família", "Programa Com as Crianças"],
                "kw": ["o que fazer em brasília com crianças", "programação infantil brasília",
                       "passeio com crianças brasília", "eventos para crianças brasília",
                       "programa em família brasília", "evento infantil df novembro"],
            },
            {
                "name": "Eventos Gratuitos",
                "path": ("eventos", "gratuitos"),
                "headlines": ["Programa Grátis em Brasília", "O Que Fazer em Brasília?"],
                "kw": ["eventos gratuitos brasília", "eventos grátis df", "o que fazer em brasília",
                       "o que fazer em brasília no fim de semana", "eventos em brasília novembro",
                       "agenda cultural brasília", "eventos fim de semana df"],
            },
            {
                "name": "Escolas & Estudantes",
                "path": ("escolas", "estudantes"),
                "headlines": ["Leve a Turma da Escola", "Evento Para Estudantes"],
                "kw": ["passeio escolar brasília", "excursão escolar brasília", "evento para estudantes brasília",
                       "atividade escolar robótica", "evento educacional brasília"],
            },
        ],
        "neg": ["hotel", "restaurante", "bar", "balada", "show", "shows", "festa", "réveillon", "natal"],
    },
]

# negativas para todas as campanhas: procura por emprego, compra, curso e "robôs" que não são o evento
NEG_ALL = [
    "emprego", "vaga", "vagas", "salário", "estágio", "concurso",
    "comprar", "preço", "loja", "mercado livre", "shopee", "amazon", "kit", "peças",
    "curso online", "faculdade", "graduação", "pós graduação", "licenciatura", "apostila", "pdf", "download",
    "robô aspirador", "aspirador", "robô de investimento", "robô trader", "trade", "forex", "bitcoin",
    "cirurgia robótica", "robô industrial", "chatgpt", "inteligência artificial curso",
    "reclame aqui", "golpe",
]

# ---------------------------------------------------------------------------
# Recursos (sitelinks: texto 25 / descrição 35; destaques 25; snippets 25)
# ---------------------------------------------------------------------------
SITELINKS = [
    ("Programação", "06 a 08 de novembro", "Sex e sáb 9h-18h, dom 9h-16h", SITE + "#programacao"),
    ("Como Retirar o Ingresso", "Grátis pelo Sympla", "Leva só 1 minuto", SITE + "#ingresso"),
    ("Local e Como Chegar", "Arena Mané Garrincha", "Eixo Monumental, Brasília", SITE + "#local"),
    ("Atividades", "Batalha de robôs e oficinas", "Drones, games e food park", SITE + "#atividades"),
    ("Perguntas Frequentes", "Idade, ingresso e comida", "Tire suas dúvidas antes de ir", SITE + "#duvidas"),
]
CALLOUTS = ["Entrada Gratuita", "Mais de 100 Equipes", "Para Toda a Família", "3 Dias de Evento",
            "Oficinas e Ativações", "Food Park", "Ingresso Pelo Sympla"]
SNIPPET = ("Tipos", ["Batalha de Robôs", "Competições", "Oficinas", "Drones", "Games", "Ativações"])

LIMITS = {"headline": 30, "description": 90, "path": 15, "sitelink": 25, "sitelink_desc": 35,
          "callout": 25, "snippet": 25}


def check(kind, text, where):
    if len(text) > LIMITS[kind]:
        raise SystemExit(f"{kind} com {len(text)} caracteres (máx. {LIMITS[kind]}) em {where}: {text!r}")


def headlines_for(group):
    out = []
    for h in group["headlines"] + H_BASE:
        if h not in out:
            out.append(h)
    return out[:15]


HEADERS = (["Campaign", "Campaign Type", "Networks", "Budget", "Budget type", "Bid Strategy Type",
            "Campaign Status", "Start Date", "End Date", "Languages", "Final URL suffix",
            "Ad Group", "Ad Group Status", "Keyword", "Criterion Type", "Status", "Ad type"]
           + [f"Headline {i}" for i in range(1, 16)] + [f"Description {i}" for i in range(1, 5)]
           + ["Path 1", "Path 2", "Final URL"])


def row(**kw):
    return {h: kw.get(h, "") for h in HEADERS}


def build():
    rows = []
    totals = {"campanhas": 0, "grupos": 0, "palavras": 0, "negativas": 0, "anuncios": 0}
    for c in CAMPAIGNS:
        totals["campanhas"] += 1
        rows.append(row(**{
            "Campaign": c["name"], "Campaign Type": "Search", "Networks": "Google search",
            "Budget": f'{c["budget"]:.2f}', "Budget type": "Daily", "Bid Strategy Type": "Maximize clicks",
            "Campaign Status": "Paused", "Start Date": START, "End Date": END, "Languages": "pt",
            "Final URL suffix": SUFFIX,
        }))
        for neg in sorted(set(NEG_ALL + c["neg"])):
            totals["negativas"] += 1
            rows.append(row(**{"Campaign": c["name"], "Keyword": neg, "Criterion Type": "Negative phrase"}))
        for g in c["groups"]:
            totals["grupos"] += 1
            rows.append(row(**{"Campaign": c["name"], "Ad Group": g["name"], "Ad Group Status": "Enabled"}))
            for k in g["kw"]:
                for match in ("Exact", "Phrase"):
                    totals["palavras"] += 1
                    rows.append(row(**{"Campaign": c["name"], "Ad Group": g["name"], "Keyword": k,
                                       "Criterion Type": match, "Status": "Enabled"}))
            hs = headlines_for(g)
            for h in hs:
                check("headline", h, g["name"])
            for dsc in D_BASE:
                check("description", dsc, g["name"])
            for p in g["path"]:
                check("path", p, g["name"])
            ad = {"Campaign": c["name"], "Ad Group": g["name"], "Ad type": "Responsive search ad",
                  "Status": "Enabled", "Path 1": g["path"][0], "Path 2": g["path"][1], "Final URL": SITE}
            ad.update({f"Headline {i + 1}": h for i, h in enumerate(hs)})
            ad.update({f"Description {i + 1}": dsc for i, dsc in enumerate(D_BASE)})
            totals["anuncios"] += 1
            rows.append(row(**ad))

    path = OUT / "ar26-campanhas-editor.csv"
    with path.open("w", newline="", encoding="utf-8-sig") as f:  # BOM: o Editor lê os acentos certo
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        w.writerows(rows)

    # recursos: uma tabela por tipo, para colar em "Fazer várias alterações"
    for s in SITELINKS:
        check("sitelink", s[0], "sitelink")
        check("sitelink_desc", s[1], s[0])
        check("sitelink_desc", s[2], s[0])
    for t in CALLOUTS:
        check("callout", t, "destaque")
    for v in SNIPPET[1]:
        check("snippet", v, "snippet")
    names = [c["name"] for c in CAMPAIGNS]
    lines = ["# SITELINKS (Campanha | Texto do link | Descrição 1 | Descrição 2 | URL final)"]
    lines += ["\t".join([n, *s]) for n in names for s in SITELINKS]
    lines += ["", "# FRASES DE DESTAQUE (Campanha | Texto)"]
    lines += [f"{n}\t{t}" for n in names for t in CALLOUTS]
    lines += ["", "# SNIPPETS ESTRUTURADOS (Campanha | Cabeçalho | Valores separados por ;)"]
    lines += [f"{n}\t{SNIPPET[0]}\t{';'.join(SNIPPET[1])}" for n in names]
    (OUT / "ar26-recursos.tsv").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"{path.name}: {len(rows)} linhas · " + " · ".join(f"{v} {k}" for k, v in totals.items()))
    print(f"orçamento diário total: R$ {sum(c['budget'] for c in CAMPAIGNS):.2f}")
    print("ar26-recursos.tsv: sitelinks, destaques e snippets")


if __name__ == "__main__":
    build()
