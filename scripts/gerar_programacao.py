#!/usr/bin/env python3
"""Gera o HTML da seção de programação (#programacao) a partir do cronograma oficial do evento.

Uso: python3 scripts/gerar_programacao.py   (reescreve o bloco entre os marcadores no public/index.html)
Fonte: CRONOGRAMA DO EVENTO – AGENDA DO EVENTO (PDF do cliente). Para mudar um horário, edite DIAS e rode de novo.
"""
import html
import re
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "public" / "index.html"
START, END = "<!-- PROGRAMACAO:INICIO -->", "<!-- PROGRAMACAO:FIM -->"

TAGS = {
    "batalha": "Batalha de Robôs",
    "maker": "Arena Maker",
    "comp": "Competições",
    "altas": "Altas Habilidades",
    "geral": "Arena",
}

OFICINAS_MANHA = [
    ("09:00", "maker", "Oficina de Caneta 3D", "até 10h"),
    ("10:15", "maker", "Oficina Monte seu Robô Seguidor de Linha", "até 11h45"),
    ("12:00", "maker", "Oficina de Corte e Gravação a Laser", "até 13h"),
]
OFICINAS_TARDE = [
    ("14:00", "maker", "Oficina de Caneta 3D", "até 15h"),
    ("15:15", "maker", "Oficina Monte seu Robô Seguidor de Linha", "até 16h45"),
]
LASER_TARDE = ("17:00", "maker", "Oficina de Corte e Gravação a Laser", "até 18h")

DIAS = [
    {
        "id": "6", "date": "2026-11-06", "num": "06", "wd": "sex", "hours": "9h–18h",
        "label": "Sexta, 06/11 · das 9h às 18h",
        "allday": [
            ("<b>Arena Gamer, Arena VR e Arena Drones</b>: simuladores, videogames, realidade virtual e pilotagem de drones FPV", "9h às 18h"),
            ("<b>Feira Maker</b>: exposição de projetos de estudantes", "9h às 18h"),
            ("<b>Treinos das equipes</b> da Batalha de Robôs e das competições Seguidor de Linha e Chão de Fábrica", "9h às 18h"),
            ("<b>Arena Altas Habilidades</b>: Escola de Pais e atividades para crianças e adolescentes. Tema: “Compreender, identificar e acolher”", "9h às 18h"),
        ],
        "timeline": OFICINAS_MANHA + OFICINAS_TARDE + [LASER_TARDE] + [
            ("09:30", "altas", "Palestra: Entendendo as altas habilidades e a superdotação", "Escola de Pais"),
            ("10:30", "altas", "Roda de conversa: Como reconhecer e apoiar os talentos dos filhos?", "Escola de Pais"),
            ("13:30", "altas", "Palestra: Mitos, identificação e necessidades educacionais", "Escola de Pais"),
            ("14:30", "altas", "Roda de conversa: Família e escola, construindo pontes", "Escola de Pais"),
            ("18:00", "geral", "Encerramento do 1º dia", ""),
        ],
    },
    {
        "id": "7", "date": "2026-11-07", "num": "07", "wd": "sáb", "hours": "9h–18h",
        "label": "Sábado, 07/11 · das 9h às 18h",
        "allday": [
            ("<b>Arena Gamer, Arena VR e Arena Drones</b>", "9h às 18h"),
            ("<b>Competições estudantis</b>: Seguidor de Linha e Chão de Fábrica", "9h às 17h"),
            ("<b>Feira Maker</b>: apresentações e avaliações técnicas dos projetos", "9h às 17h"),
            ("<b>Arena Altas Habilidades</b>: Escola de Pais e atividades para crianças e adolescentes. Tema: “Emoções, convivência e desenvolvimento”", "9h às 18h"),
        ],
        "timeline": OFICINAS_MANHA + OFICINAS_TARDE + [LASER_TARDE] + [
            ("08:30", "batalha", "Beetleweight: 1ª rodada (8 lutas)", "Arena 1 · até 10h10"),
            ("09:30", "altas", "Palestra: Intensidade emocional e desafios da superdotação", "Escola de Pais"),
            ("10:10", "batalha", "Featherweight: 4 lutas", "Arena 2"),
            ("10:30", "altas", "Roda de conversa: Ansiedade, perfeccionismo e pertencimento", "Escola de Pais"),
            ("11:10", "batalha", "Hobbyweight: 4 lutas", "Arena 2"),
            ("13:10", "batalha", "Beetleweight: quartas de final (4 lutas)", "Arena 1"),
            ("13:30", "altas", "Palestra: Inclusão escolar e desenvolvimento de potenciais", "Escola de Pais"),
            ("14:30", "batalha", "Hobbyweight: 3 lutas", "Arena 2"),
            ("14:30", "altas", "Mesa de diálogo: Estratégias práticas para o dia a dia", "Escola de Pais"),
            ("15:30", "batalha", "Featherweight: 4 lutas", "Arena 2"),
            ("16:30", "batalha", "Beetleweight: repescagem (8 lutas)", "Arena 1 · até 18h"),
            ("17:00", "comp", "Premiação: Seguidor de Linha e Chão de Fábrica", ""),
            ("18:00", "batalha", "Hobbyweight: 2 lutas", "Arena 2 · até 19h"),
        ],
    },
    {
        "id": "8", "date": "2026-11-08", "num": "08", "wd": "dom", "hours": "9h–16h",
        "label": "Domingo, 08/11 · das 9h às 16h",
        "allday": [
            ("<b>Arena Gamer, Arena VR e Arena Drones</b>", "9h às 16h"),
            ("<b>Exposição de projetos</b>: Seguidor de Linha, Chão de Fábrica e Feira Maker", "9h às 16h"),
            ("<b>Arena Altas Habilidades</b>: Escola de Pais e atividades para crianças e adolescentes. Tema: “Construindo caminhos para o futuro”", "9h às 16h"),
        ],
        "timeline": OFICINAS_MANHA + OFICINAS_TARDE + [
            ("08:30", "batalha", "Beetleweight: 4 lutas", "Arena 1"),
            ("09:15", "batalha", "Featherweight: 4 lutas", "Arena 2"),
            ("09:30", "altas", "Palestra: Como estimular talentos sem gerar pressão", "Escola de Pais"),
            ("10:15", "batalha", "Hobbyweight: 2 lutas", "Arena 2"),
            ("10:30", "altas", "Roda de conversa: Autonomia, projetos de vida e protagonismo", "Escola de Pais"),
            ("11:00", "batalha", "Beetleweight: 2 lutas", "Arena 1"),
            ("11:30", "batalha", "Featherweight: 2 lutas", "Arena 2"),
            ("13:00", "batalha", "Começam as finais: Hobbyweight, final da chave dos vencedores", "Arena 2"),
            ("13:20", "batalha", "Beetleweight: final dos vencedores e da repescagem", "Arena 1"),
            ("13:40", "batalha", "Hobbyweight: final da repescagem", "Arena 2"),
            ("14:00", "batalha", "Beetleweight: final da repescagem", "Arena 1"),
            ("14:00", "altas", "Oficina: Plano de desenvolvimento dos talentos", "Escola de Pais"),
            ("14:20", "batalha", "Featherweight: disputa de 3º lugar", "Arena 2"),
            ("14:40", "batalha", "★ Grande final Hobbyweight", "Arena 2", True),
            ("15:00", "batalha", "★ Grande final Featherweight", "Arena 2", True),
            ("15:00", "altas", "Mostra de talentos e encerramento", "Escola de Pais"),
            ("15:20", "batalha", "★ Grande final Beetleweight", "Arena 1", True),
            ("15:50", "batalha", "Bracket reset, se necessário", "Ambas as arenas · até 16h30"),
            ("16:00", "geral", "Encerramento do evento", ""),
        ],
    },
]


def item(t):
    hour, tag, title, note = t[:4]
    star = len(t) > 4 and t[4]
    cls = ' class="is-final"' if star else ""
    note_html = f"<p>{html.escape(note)}</p>" if note else ""
    return (f'<li{cls}><time class="lcd-txt" datetime="{hour}">{hour}</time><div>'
            f'<span class="tag tag--{tag}">{TAGS[tag]}</span>'
            f'<h4>{html.escape(title)}</h4>{note_html}</div></li>')


def build():
    tabs, panels = [], []
    for i, d in enumerate(DIAS):
        sel = i == 0
        tabs.append(
            f'<button class="tab" role="tab" id="tab-{d["id"]}" aria-controls="dia-{d["id"]}" '
            f'aria-selected="{"true" if sel else "false"}"{"" if sel else " tabindex=\"-1\""} data-date="{d["date"]}">\n'
            f'              <span class="tab__num lcd-txt">{d["num"]}</span><span class="tab__day">{d["wd"]}</span>'
            f'<span class="tab__hours">{d["hours"]}</span>\n            </button>')
        allday = "\n".join(f'                <li><span>{txt}</span><small>{h}</small></li>' for txt, h in d["allday"])
        tl = "\n".join("                " + item(t) for t in sorted(d["timeline"], key=lambda t: t[0]))
        panels.append(f'''          <div class="tabs__panel" role="tabpanel" id="dia-{d["id"]}" aria-labelledby="tab-{d["id"]}" tabindex="0"{"" if sel else " hidden"}>
            <p class="day-label"><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>{d["label"]}</p>
            <div class="win allday">
              <div class="win__bar"><span class="win__title">o_dia_todo.txt</span><span class="win__btns" aria-hidden="true"><i></i><i></i><i></i></span></div>
              <ul class="allday__list allday__list--rows" role="list">
{allday}
              </ul>
            </div>
            <h3 class="tl-title">Horários</h3>
            <ol class="timeline">
{tl}
            </ol>
          </div>''')
    return f'''{START}
        <div class="tabs reveal" style="--d:.1s" data-tabs>
          <div class="tabs__list" role="tablist" aria-label="Dias do evento">
            {(chr(10) + "            ").join(tabs)}
          </div>

{chr(10).join(panels)}
          <p class="tabs__note">Oficinas na Arena Maker com turmas de até 20 participantes por horário. Beetleweight, Hobbyweight e Featherweight são as categorias de peso da Batalha de Robôs. Programação sujeita a alterações.</p>
        </div>
        {END}'''


def main():
    s = INDEX.read_text(encoding="utf-8")
    block = build()
    if START in s:
        s = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: block, s, flags=re.S)
    else:
        a = s.index('        <!-- Quando a programação oficial sair')
        b = s.index('      </div>\n    </section>\n\n    <!-- ========== COMO RETIRAR')
        s = s[:a] + "        " + block + "\n" + s[b:]
    INDEX.write_text(s, encoding="utf-8")
    print("programação atualizada:", sum(len(d["timeline"]) for d in DIAS), "horários em", len(DIAS), "dias")


if __name__ == "__main__":
    main()
