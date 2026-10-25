# Google Ads · Arena Robótica 26 (Rede de Pesquisa)

Campanhas de pesquisa prontas para importar no **Google Ads Editor**, com o objetivo de levar ao clique em
“Retirar ingresso grátis” no site (`www.arenarobotica.com.br`).

| Arquivo | Para quê |
|---|---|
| `ar26-campanhas-editor.csv` | Campanhas, grupos de anúncios, palavras-chave, negativas e anúncios responsivos |
| `ar26-recursos.tsv` | Sitelinks, frases de destaque e snippets estruturados (colar no Editor) |
| `gerar_campanhas.py` | Gera os dois arquivos e valida os limites de caracteres. Edite aqui e rode de novo |

```bash
python3 marketing/google-ads/gerar_campanhas.py
```

## Estrutura

Todas as campanhas entram **pausadas**, de 26/10 a 08/11/2026, só na Rede de Pesquisa do Google, em português.

| Campanha | Grupos | Orçamento/dia* |
|---|---|---|
| `AR26 \| C01 \| Pesquisa \| Marca & Evento` | Arena Robótica · Mané Garrincha \| Eventos | R$ 30 |
| `AR26 \| C02 \| Pesquisa \| Robótica & Tecnologia` | Evento de Robótica · Batalha de Robôs · Drones & Games · Tecnologia & Maker | R$ 50 |
| `AR26 \| C03 \| Pesquisa \| Lazer & Família` | Programa em Família · Eventos Gratuitos · Escolas & Estudantes | R$ 40 |

\* **Orçamentos provisórios** (R$ 120/dia, cerca de R$ 1.680 nos 14 dias). Ajuste ao valor aprovado pelo cliente em `gerar_campanhas.py`.

- **Palavras-chave:** cada termo entra em correspondência **exata** e de **frase**. Não há correspondência ampla, para controlar o gasto em 2 semanas.
- **Negativas (frase, por campanha):** emprego, compra, cursos online e faculdade, “robôs” que não são o evento (aspirador, investimento, trader, cirurgia),
  além de jogos e shows no Mané Garrincha (C01) e baladas, hotéis e festas (C03).
- **Anúncios:** 1 anúncio responsivo por grupo, com 15 títulos (2 específicos do grupo + 13 gerais) e 4 descrições, todos dentro dos limites
  (30 / 90 / 15 caracteres). Os textos usam só informações confirmadas: entrada gratuita, mais de 100 equipes, 06 a 08/11,
  Arena Mané Garrincha e ingresso pelo Sympla.
- **Sufixo do URL final:** `utm_source=google&utm_medium=cpc&utm_campaign=ar26_{campaignid}&utm_term={keyword}`.
  O site repassa as UTMs e o `gclid` para o link da Sympla.

## Como importar no Google Ads Editor

1. Abra a conta da Arena Robótica no Editor e clique em **Obter alterações recentes**.
2. **Conta → Importar → Do arquivo…** → escolha `ar26-campanhas-editor.csv`.
3. Revise o resumo da importação e clique em **Concluir e revisar alterações** → **Manter**.
   Se alguma coluna aparecer com erro (por exemplo, `Languages`), ajuste essa configuração à mão na campanha.
4. **Recursos** (`ar26-recursos.tsv`): em **Recursos → Sitelinks**, use **Fazer várias alterações** e cole o bloco de sitelinks.
   Repita com as frases de destaque e com o snippet estruturado.
5. Ajuste à mão em cada campanha:
   - **Locais:** Distrito Federal + raio de 40 km da Arena Mané Garrincha, para pegar o Entorno.
     Opção de segmentação: “Presença: pessoas que estão ou costumam estar nos seus locais”.
   - **Estratégia de lances:** Maximizar cliques, com **limite de CPC máximo de R$ 3,00**.
   - **Redes:** desmarque Parceiros de pesquisa e Rede de Display, se o Editor tiver marcado.
6. **Verificar alterações** → corrija os avisos → **Postar**.
7. No Google Ads, revise e **ative** as campanhas quando o orçamento for aprovado.

## Conversão

A conversão principal é o clique no ingresso (`ticket_click` no GA4 `G-4GDC9N3GS0`):

1. No GA4, marque `ticket_click` como evento-chave.
2. No Google Ads: Metas → Conversões → Nova ação → Importar → Google Analytics 4 → `ticket_click`. Defina como **primária**.
3. Com cerca de 15 a 20 conversões, avalie trocar o lance de “Maximizar cliques” para “Maximizar conversões”.
   Com só 2 semanas de campanha, não troque nos primeiros dias, para não reiniciar o aprendizado.

## Confirmar antes de ativar

- [ ] Orçamento diário aprovado pelo cliente.
- [ ] **Drones e games** confirmados na programação. Se não estiverem, pause o grupo “Drones & Games” e troque o título
      “Robótica, Drones e Games” em `gerar_campanhas.py`.
- [ ] “Batalha de Robôs” confirmada como atividade aberta ao público.
- [ ] Contêiner do GTM publicado e `ticket_click` aparecendo no DebugView do GA4.
