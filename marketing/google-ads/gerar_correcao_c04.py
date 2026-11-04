#!/usr/bin/env python3
"""Corrige a campanha de Display (C04) e junta o cronograma num único arquivo de importação.

Uso: python3 marketing/google-ads/gerar_correcao_c04.py
Saída: ar26-importar-04-11.csv (Editor → Conta → Importar → Do arquivo)

Baseado na exportação da conta de 04/11 (nomes de coluna exatamente como o Editor 2.13 exporta):
  - C04 estava com "EU political ads: Not specified" (erro), lance Maximizar conversões sem conversão
    configurada, segmentação no Brasil inteiro e método "presença ou interesse";
  - o cronograma (ar26-cronograma-editor.csv) ainda não tinha sido importado.
"""
import csv
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
C04 = "AR26 | C04 | Display | Branding DF"

# mesmos locais das campanhas de pesquisa (IDs da exportação da conta)
LOCATIONS = [
    ("Distrito Federal, Brasil", "20090"),
    ("Águas Lindas de Goiás, Goiás, Brasil", "1032140"),
    ("Valparaíso de Goiás, Goiás, Brasil", "9074231"),
    ("Luziânia, Goiás, Brasil", "1031782"),
    ("Novo Gama, Goiás, Brasil", "9074205"),
    ("Cidade Ocidental, Goiás, Brasil", "9074282"),
    ("Santo Antônio do Descoberto, Goiás, Brasil", "1032015"),
    ("Planaltina, Goiás, Brasil", "9074242"),
    ("Formosa, Goiás, Brasil", "1031632"),
]

EXTRA = ["EU political ads", "Maximum CPC bid limit", "Targeting method", "Exclusion method", "Location", "ID"]


def main():
    subprocess.run([sys.executable, str(HERE / "gerar_cronograma.py")], check=True)
    with (HERE / "ar26-cronograma-editor.csv").open(encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames)
        cron = list(reader)
    headers += [h for h in EXTRA if h not in headers]

    def row(**kw):
        return {h: kw.get(h, "") for h in headers}

    fix = [row(**{
        "Campaign": C04,
        "EU political ads": "Doesn't have EU political ads",
        "Bid Strategy Type": "Maximize clicks",
        "Maximum CPC bid limit": "1.00",
        "Targeting method": "Location of presence",
        "Exclusion method": "Location of presence",
    })]
    # tira o Brasil inteiro e coloca DF + Entorno
    fix.append(row(**{"Campaign": C04, "Location": "Brasil", "ID": "2076", "Status": "Removed"}))
    for name, loc_id in LOCATIONS:
        fix.append(row(**{"Campaign": C04, "Location": name, "ID": loc_id, "Status": "Enabled"}))

    out = HERE / "ar26-importar-04-11.csv"
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(fix + cron)
    print(f"{out.name}: {len(fix)} linhas de correção da C04 + {len(cron)} do cronograma")


if __name__ == "__main__":
    main()
