#!/usr/bin/env python3
"""Gera public/prestacao-de-contas/dados-exemplo.json: os mesmos campos de dados.json com números FICTÍCIOS,
só para visualizar o layout (abra /prestacao-de-contas/?exemplo=1). Nunca use esses números em apresentação."""
import json
import random
from datetime import date, timedelta
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "public" / "prestacao-de-contas"
random.seed(26)
d = json.loads((DIR / "dados.json").read_text(encoding="utf-8"))
d["_aviso"] = "DADOS FICTÍCIOS: servem apenas para visualizar o layout."
d["meta"]["atualizado_em"] = "2026-11-10"

dias, ini = [], date(2026, 10, 23)
for i in range(17):
    dia = ini + timedelta(days=i)
    base = 40 + i * 18 + (220 if dia >= date(2026, 11, 4) else 0)
    dias.append([dia.isoformat(), base + random.randint(-25, 60)])
d["ingressos"]["diario"] = dias
total = sum(n for _, n in dias)
d["ingressos"]["origem"] = [
    {"canal": "Instagram", "ingressos": int(total * .34)}, {"canal": "Google Ads", "ingressos": int(total * .22)},
    {"canal": "Direto / sem UTM", "ingressos": int(total * .2)}, {"canal": "Meta Ads", "ingressos": int(total * .14)},
    {"canal": "Escolas e parceiros", "ingressos": total - int(total * .9)},
]
g = d["geral"]
g["ingressos_retirados"] = total
for p, f in zip(g["publico_por_dia"], (.28, .41, .33)):
    p["presentes"] = int(total * f * .9)
g["publico_presente"] = sum(p["presentes"] for p in g["publico_por_dia"])
g["escolas"] = 37

for c, (imp, clk, cst) in zip(d["midia"]["google_ads"]["campanhas"],
                             [(6200, 980, 210.4), (18400, 1320, 402.9), (15800, 1110, 318.2), (412000, 2980, 489.6)]):
    c.update(impressoes=imp, cliques=clk, custo=cst, conversoes=int(clk * random.uniform(.18, .34)))
d["midia"]["meta_ads"]["campanhas"] = [
    {"nome": "AR26 · Tráfego · Ingresso", "objetivo": "Tráfego", "alcance": 98000, "impressoes": 210000, "cliques": 3400, "custo": 620.0, "resultados": 3400},
    {"nome": "AR26 · Reconhecimento · DF", "objetivo": "Alcance", "alcance": 182000, "impressoes": 390000, "cliques": 1200, "custo": 380.0, "resultados": 182000},
]
d["midia"]["outros_canais"][0].update(custo=150.0, impressoes=64000, cliques=520)

s = d["site"]
s.update(visitas=14800, usuarios=11200)
for p, n in zip(s["cliques_por_posicao"], (1840, 420, 960, 380, 410, 260, 520)):
    p["cliques"] = n
s["cliques_ingresso"] = sum(p["cliques"] for p in s["cliques_por_posicao"])

ig = d["instagram"]
ig.update(alcance=246000, visualizacoes=812000, interacoes=21400, seguidores_ganhos=1930, visitas_perfil=18200)
for f, (v, i) in zip(ig["formatos"], [(180000, 6200), (240000, 2100), (392000, 13100)]):
    f.update(visualizacoes=v, interacoes=i)
cats = ["Institucional", "Conversão", "Bastidores", "Atrações", "Parceiros", "Serviço"]
ig["publicacoes"] = [
    {"titulo": t, "categoria": c, "data": f"2026-{m}", "url": "https://www.instagram.com/", "imagem": img,
     "curtidas": random.randint(60, 900), "comentarios": random.randint(2, 80), "compartilhamentos": random.randint(5, 300), "destaque": dz}
    for t, c, m, img, dz in [
        ("Save the date AR26", "Institucional", "10-23", "/assets/img/og-arena-robotica-26.jpg", False),
        ("Ingressos liberados no Sympla", "Conversão", "10-24", "/assets/img/personagem-menino-600.webp", True),
        ("Conheça a Batalha de Robôs", "Atrações", "10-27", "/assets/img/personagem-homem-600.webp", False),
        ("Arena Drones FPV", "Atrações", "10-29", "/assets/img/personagem-menina-600.webp", False),
        ("Programação oficial", "Serviço", "11-04", "/assets/img/og-arena-robotica-26.jpg", True),
        ("Bastidores da montagem", "Bastidores", "11-05", "/assets/img/personagem-homem-600.webp", False),
        ("É hoje! Arena Robótica 26", "Conversão", "11-06", "/assets/img/personagem-menino-600.webp", True),
        ("Grande final da batalha", "Atrações", "11-08", "/assets/img/personagem-menina-600.webp", False),
    ]]
d["imprensa"].update(releases_enviados=3, contatos=84, materias=[
    {"veiculo": "Veículo de exemplo 1", "titulo": "Matéria fictícia sobre o evento", "data": "2026-11-03", "url": "https://example.com/", "tipo": "Site"},
    {"veiculo": "Veículo de exemplo 2", "titulo": "Matéria fictícia de TV", "data": "2026-11-06", "url": "https://example.com/", "tipo": "TV"},
    {"veiculo": "Veículo de exemplo 3", "titulo": "Entrevista fictícia em rádio", "data": "2026-11-07", "url": "https://example.com/", "tipo": "Rádio"},
])
for a, n in zip(d["outras_acoes"], (1, 4, 120)):
    a["numero"] = n
d["galeria"] = [{"src": src, "legenda": "Foto de exemplo"} for src in
                ["/assets/img/personagem-menino-600.webp", "/assets/img/personagem-menina-600.webp",
                 "/assets/img/personagem-homem-600.webp", "/assets/img/og-arena-robotica-26.jpg"]]
d["conclusoes"] = [
    {"titulo": "Conclusão de exemplo 1", "texto": "Texto fictício: aqui entra a leitura de por que os números aconteceram."},
    {"titulo": "Conclusão de exemplo 2", "texto": "Texto fictício: o que funcionou melhor entre os canais e por quê."},
    {"titulo": "Conclusão de exemplo 3", "texto": "Texto fictício: o que vale repetir ou mudar na próxima edição."},
]
(DIR / "dados-exemplo.json").write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("dados-exemplo.json gerado:", total, "ingressos fictícios")
