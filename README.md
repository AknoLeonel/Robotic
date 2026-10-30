# Arena Robótica 26 · landing page

Página única para levar a pessoa ao clique em **“Retirar ingresso grátis”** e medir esse clique.
06 a 08 de novembro de 2026, Arena Mané Garrincha, Brasília.

- HTML, CSS e JS puros, sem build e sem dependências em produção.
- Mobile-first, com movimento só em `transform`/`opacity` e respeito a `prefers-reduced-motion`.
- Lighthouse (celular, servidor com brotli): Desempenho 95–97 · Acessibilidade 100 · Boas práticas 100 · SEO 100. LCP de cerca de 2,5 s no 4G lento simulado.

## Estrutura

```
public/                    ← raiz publicada (Vercel/Netlify)
  index.html               ← a landing page
  privacidade.html         ← política de privacidade (servida em /politica-de-privacidade)
  404.html
  tracking/tracking.js     ← GA4, GTM, Meta Pixel + API de Conversões, Clarity, UTMs
  tracking/consent-banner.js ← aviso de cookies (LGPD)
  assets/css/main.css      ← design system + seções + animações
  assets/js/main.js        ← contagem, abas, carrossel, barra mobile, mapa…
  assets/fonts/            ← Archivo 900 itálico, Space Mono, 7LED (woff2, subset latino)
  assets/img/              ← vetores do KV (SVG) e fotos (WebP)
  favicon.svg, ícones, site.webmanifest, robots.txt, sitemap.xml
source/                    ← arquivos originais (não são publicados)
  kv/                      ← peças do KV em 1920x1080
  vetores/                 ← caderno .ai e Letra Caixa
  fonts/                   ← TTFs originais
api/meta-events.js         ← função da Vercel: POST /api/meta-events
server/meta-capi.js        ← API de Conversões da Meta (Node 18+, sem dependências)
server/teste-meta-capi.js  ← testes (cd server && npm test)
.env.example               ← variáveis de ambiente da API de Conversões
scripts/
  extract_vectors.py       ← .ai/PDF → SVGs limpos e recoloridos
  build_images.py          ← KV → recortes WebP, textura, imagem OG e ícones
vercel.json / netlify.toml ← publicação, rewrite da política, cache e cabeçalhos
```

## Rodar localmente

```bash
cd public && python3 -m http.server 8080
# abrir http://localhost:8080/?utm_source=teste&arena_debug=1  (o console mostra cada evento)
# a API de Conversões só roda na Vercel (ou com `vercel dev`)
```

## Publicar

- **Vercel**: importe o repositório. O `vercel.json` já aponta `public/` como saída. O domínio é `www.arenarobotica.com.br`, e o domínio sem `www` redireciona para ele (308).
- **Netlify**: importe o repositório. O `netlify.toml` já define `publish = "public"`.

## Configuração

### Página (`window.AR26`, topo do `index.html`)

```js
window.AR26 = {
  eventStart: "2026-11-06T09:00:00-03:00",  // abertura dos portões (contagem regressiva)
  eventEnd: "2026-11-08T16:00:00-03:00",
  battleVideo: ""                            // ex.: "/assets/video/batalha.mp4"
};
```

Os links do Sympla estão direto no `href` dos botões (ingresso: `.../arena-robotica-26/3617088`;
voluntários: `.../voluntarios-arena-robotica/3617780`) e no `offers.url` do JSON-LD.

### Rastreamento (`window.ARENA_TRACKING_CONFIG`, no `<head>` das 3 páginas)

```js
window.ARENA_TRACKING_CONFIG = {
  metaPixelId: '1694579642232662',   // Pixel "arena robotica"
  ga4Id: 'G-4GDC9N3GS0',             // GA4 (fluxo de dados do site)
  googleAdsId: 'AW-18535303737',     // tag do Google Ads
  googleAdsTicketLabel: '',          // rótulo da conversão "AR26 - Clique ingresso" (opcional)
  gtmId: 'GTM-WV3MFCVQ',             // contêiner do Google Tag Manager
  clarityId: 'z2rtmqwol5',           // Clarity "Arena Robótica 26"
  tiktokPixelId: '',                 // Pixel do TikTok (vazio = não carrega)
  capiEndpoint: '/api/meta-events',  // função da Vercel (null = só Pixel)
  privacyPolicyUrl: '/politica-de-privacidade',
  spa: false,
  debug: false                       // ou ?arena_debug=1
};
```

O mesmo bloco está em `index.html`, `privacidade.html` e `404.html`, junto com o `<noscript>` do GTM logo depois do `<body>`.
Se mudar um ID, mude nas 3 páginas.

## Conversão e rastreamento

Segue a especificação do pacote de rastreamento do Marcio. `tracking.js` e `consent-banner.js` foram escritos a partir
do README dele, com a mesma configuração, os mesmos eventos e a mesma API (`ArenaTracking.track`, `data-track`,
`data-track-section`, `data-open-consent`). Se os arquivos originais chegarem, basta substituir os dois em `public/tracking/`.

### O que é medido

| Ação no site | Meta (Pixel + API) | GA4 | Clarity |
|---|---|---|---|
| Abrir página | PageView | page_view | gravação/mapa de calor |
| Rolar 50% ou ficar 30 s | ViewContent | engaged_view | evento |
| Clique em “Retirar ingresso grátis” (Sympla) | InitiateCheckout + Lead | ticket_click (+ `posicao`, `local_botao`) e, se configurada, conversão do Google Ads | evento |
| WhatsApp, telefone, e-mail, Instagram | Contact | contact_click | evento |
| Envio de formulário | Lead (+ e-mail/telefone criptografados) | generate_lead | evento |
| Botão/link com `data-track="nome"` | — | cta_click | evento |
| Outros links externos (inclui voluntários) | — | outbound_click | — |
| Rolagem 25/50/75/90% | — | scroll_depth | — |
| Tempo visível 15/30/60/120/300 s | — | time_on_page | — |
| Seção com `data-track-section` vista | — | section_view | — |
| `<video>` início/25/50/75%/fim (exceto vídeo decorativo em loop) | — | video_start/progress/complete | evento |
| Abrir o mapa interativo | — | mapa_aberto | evento |

- **Ingresso x voluntários:** só o link do ingresso conta como `InitiateCheckout`/`ticket_click`. O link de voluntários
  vira `outbound_click` com `link_name: voluntario`.
- **`clique_ingresso`:** além do GA4, cada clique no ingresso envia `{ event: "clique_ingresso", posicao }` ao `dataLayer`, para o GTM.
- **Mesma aba:** no clique do ingresso, a página espera o GA4 confirmar o envio (no máximo 500 ms) e segue para a Sympla.
- **UTMs na Sympla:** `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid` e `msclkid` da visita vão para todos os links da Sympla.
  Visita com `gclid` e sem UTM sai como `utm_source=google&utm_medium=cpc`. Sem nenhum dos dois, sai com
  `utm_source=site&utm_medium=referral&utm_campaign=ar26`.
- **TikTok:** com `tiktokPixelId` preenchido, o pixel carrega só depois do aceite de marketing, registra a página e envia
  `ClickButton` no clique do ingresso.
- **Pacote “RASTREAMENTO” (LEIA-ME com `1-head.html`, `2-aviso-de-cookies.txt` e `3-antes-do-body.html`):** **não cole**.
  O que ele tem de novo já está no `tracking.js`: TikTok, `Lead` no clique, UTMs `google/cpc` com `gclid`,
  `googleAdsConversionLabel` e as funções `liberarRastreamento()` e `bloquearRastreamento()` (o banner já faz o mesmo sozinho).
  Colar o pacote carregaria o `gtag.js` e o Pixel duas vezes e usaria o GA4 antigo (`G-5GHCH96NG1`).
  No GA4, o clique no ingresso se chama `ticket_click`, e não `clique_sympla`.
- **Deduplicação:** Pixel e API de Conversões usam o mesmo `event_id`.

### Botões de ingresso (`posicao`)

| `posicao`      | Onde fica                                      |
|----------------|------------------------------------------------|
| `hero`         | Botão principal do topo                        |
| `card`         | Destaque da Batalha de Robôs                   |
| `passos`       | Seção “Garanta o seu em 3 passos”              |
| `faq`          | Fim das perguntas frequentes                   |
| `final`        | Fechamento rosa “Ainda não garantiu?”          |
| `barra_mobile` | Barra fixa do celular                          |
| `header`       | Cabeçalho fixo (desktop)                       |

### Privacidade (LGPD)

- Antes do aceite, o Google roda em Consent Mode v2 (negado por padrão), e a Meta e o Clarity **não carregam**.
  Eventos da Meta ficam numa fila até o aceite e são descartados se a pessoa recusar.
- Métricas (GA4 e Clarity) e marketing (Meta e Google Ads) são categorias separadas no banner.
- Dados de formulário (e-mail, telefone, nome) nunca vão para o GA4: só para a API de Conversões, criptografados no servidor.

### Configurar na Vercel (uma vez)

Em **Settings → Environment Variables** (Production), use o `.env.example` como modelo:

| Variável | Valor |
|---|---|
| `META_PIXEL_ID` | `1694579642232662` |
| `META_CAPI_TOKEN` | Gerenciador de Eventos → arena robotica → Configurações → API de Conversões → Gerar token. **Nunca no repositório.** |
| `ALLOWED_ORIGINS` | `https://www.arenarobotica.com.br,https://arenarobotica.com.br` |
| `META_API_VERSION` | opcional (padrão `v26.0`) |
| `META_TEST_EVENT_CODE` | só durante o teste; apague depois |

Sem o token, `/api/meta-events` responde 204 e ignora os eventos: o Pixel continua funcionando.

### GTM, GA4 e Google Ads

1. **Publique o contêiner `GTM-WV3MFCVQ`** (Enviar → Publicar), mesmo vazio. Sem isso, o `gtm.js` dá 404.
   O snippet do `<head>` que o GTM mostra na instalação **não** é colado no HTML: o `tracking.js` já carrega o GTM,
   depois do Consent Mode. Só o `<noscript>` fica logo após o `<body>`, nas 3 páginas.
2. **Não crie tags do GA4 nem do Pixel dentro do GTM:** o `tracking.js` já envia os dois, e haveria contagem em dobro.
3. **Tag do Google Ads (`AW-18535303737`):** já é carregada pelo `tracking.js`, no mesmo `gtag.js` do GA4 e com o Consent Mode.
   **Não cole o snippet do Google Ads no HTML** nem crie essa tag no GTM: ela seria carregada duas vezes, e antes do consentimento.
4. **Conversão “AR26 - Clique ingresso”:** escolha **um** dos caminhos (os dois juntos contam em dobro):
   - **Pelo GA4 (recomendado):** no Google Ads, importe o evento-chave `ticket_click` do GA4 e deixe `googleAdsTicketLabel: ''`.
   - **Direto no Google Ads:** crie a conversão do tipo “Site” no Google Ads. No trecho do evento aparece
     `send_to: 'AW-18535303737/XXXXXXXX'`. Copie só o `XXXXXXXX` para `googleAdsTicketLabel`, nas 3 páginas,
     e **não** importe o `ticket_click` do GA4.
5. No GA4, marque `ticket_click` como **evento-chave**.

### Como testar

1. Abra o site com `?arena_debug=1`: o console mostra cada evento, e o GA4 aparece em Administrador → DebugView.
2. Meta: Gerenciador de Eventos → Eventos de teste. Coloque o código `TEST...` em `META_TEST_EVENT_CODE`, aceite os cookies e navegue.
   Cada evento deve aparecer como “Navegador” e “Servidor” (deduplicado). Apague o código depois.
3. Clarity: as gravações aparecem em até 2 horas.
4. `cd server && npm test` valida a criptografia e os filtros.

## Pendências de conteúdo (precisam vir do cliente)

Os textos abaixo estão **provisórios** e precisam ser confirmados antes de publicar:

- [x] Link do evento no Sympla e link de inscrição de voluntários.
- [x] IDs de GA4, GTM, Meta Pixel e Clarity.
- [ ] Token da API de Conversões na Vercel, publicação do contêiner do GTM e conversão do Google Ads (ver “Configurar na Vercel” e “GTM, GA4 e Google Ads”).
- [x] Horários (06 e 07/11, das 9h às 18h; 08/11, das 9h às 16h), endereço e descrição oficial do Sympla.
- [ ] **Programação por dia**: a página mostra só o que é oficial (dias, horários e o que rola todos os dias) com o aviso "em breve". Quando sair, siga “Publicar a programação” abaixo.
- [ ] Portão de entrada, estacionamento, transporte e acessibilidade (seção Local).
- [ ] Respostas do FAQ sobre idade, documento na entrada e saída e retorno.
- [ ] Logos em SVG do Instituto Guilda, da Secretaria de CT&I e do GDF (hoje o rodapé usa texto).
- [ ] Links das redes sociais (rodapé) e e-mail de privacidade (`privacidade@arenarobotica.com.br` precisa existir).
- [ ] Fotos dos cards de atividades e vídeo da batalha (opcionais).
- [x] Domínio final: `www.arenarobotica.com.br` (canonical, OG, sitemap, robots, JSON-LD).
- [ ] **QR code e texto das peças do KV** apontam para `arenarobotica26.com`: registrar esse domínio e redirecionar para o site, ou refazer o QR.

## Publicar a programação

Hoje a seção `#programacao` mostra os 3 dias com o horário oficial e a lista “todos os dias”.
Quando a programação sair, troque o bloco `<div class="sched__body">` por abas com horários.
O CSS (`.tabs`, `.tab`, `.timeline`) e o JS (teclado, ARIA, abrir no dia de hoje durante o evento) já estão prontos:

```html
<div class="tabs reveal" data-tabs>
  <div class="tabs__list" role="tablist" aria-label="Dias do evento">
    <button class="tab" role="tab" id="tab-6" aria-controls="dia-6" aria-selected="true" data-date="2026-11-06">
      <span class="tab__num lcd-txt">06</span><span class="tab__day">sex</span><span class="tab__hours">9h–18h</span>
    </button>
    <button class="tab" role="tab" id="tab-7" aria-controls="dia-7" aria-selected="false" tabindex="-1" data-date="2026-11-07">
      <span class="tab__num lcd-txt">07</span><span class="tab__day">sáb</span><span class="tab__hours">9h–18h</span>
    </button>
    <button class="tab" role="tab" id="tab-8" aria-controls="dia-8" aria-selected="false" tabindex="-1" data-date="2026-11-08">
      <span class="tab__num lcd-txt">08</span><span class="tab__day">dom</span><span class="tab__hours">9h–16h</span>
    </button>
  </div>
  <div class="tabs__panel" role="tabpanel" id="dia-6" aria-labelledby="tab-6" tabindex="0">
    <ol class="timeline">
      <li><time class="lcd-txt">09:00</time><div><h3>Título da atividade</h3><p>Detalhe opcional.</p></div></li>
      <!-- … -->
    </ol>
  </div>
  <div class="tabs__panel" role="tabpanel" id="dia-7" aria-labelledby="tab-7" tabindex="0" hidden>…</div>
  <div class="tabs__panel" role="tabpanel" id="dia-8" aria-labelledby="tab-8" tabindex="0" hidden>…</div>
  <p class="tabs__note">Programação sujeita a alterações.</p>
</div>
```

Se preferir, me mande a programação (pode ser um texto ou uma planilha) que eu monto.

## Imagens

### Personagens

Hoje os três personagens vêm recortados das peças do KV, com as ondas do canto apagadas e máscara suave nas bordas.
Com os **PNGs recortados (fundo transparente)** a qualidade fica melhor:

1. Salve-os como `source/personagens/personagem-menino.png`, `personagem-menina.png` e `personagem-homem.png`.
2. Rode `python3 scripts/build_images.py`. O script usa os PNGs automaticamente.

### Fotos dos cards

Cada card de atividade tem uma área de arte (`.card__art`). Para usar uma foto, coloque um `<img>` dentro dela.
O CSS já a ajusta para cobrir a área:

```html
<div class="card__art" aria-hidden="true">
  <img src="/assets/img/atividade-drones.webp" alt="" loading="lazy" width="800" height="500">
</div>
```

### Vídeo da batalha

Coloque um MP4 curto e leve (até 3 MB, sem áudio, cerca de 10 s em loop) em `public/assets/video/` e preencha `battleVideo`.
Ele só carrega no desktop, quando a seção aparece, e nunca com economia de dados ou movimento reduzido ativos.

### Regenerar os assets

```bash
pip install pillow fonttools brotli
python3 scripts/extract_vectors.py   # requer poppler-utils e Playwright
python3 scripts/build_images.py
```

## Acessibilidade

- Contraste AA em todos os textos. O magenta só aparece com texto azul-escuro (5,1:1).
- Navegação por teclado, foco visível, link “pular para o conteúdo” e abas no padrão WAI-ARIA.
- O FAQ usa `<details>` nativo, a contagem regressiva tem versão em texto para leitores de tela e as decorações usam `aria-hidden`.
- Com `prefers-reduced-motion`, todas as animações são desligadas.
