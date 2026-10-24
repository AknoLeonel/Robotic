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
  privacidade.html         ← política de privacidade (LGPD)
  404.html
  assets/css/main.css      ← design system + seções + animações
  assets/js/main.js        ← UTMs, rastreamento, consentimento, contagem, abas…
  assets/fonts/            ← Archivo 900 itálico, Space Mono, 7LED (woff2, subset latino)
  assets/img/              ← vetores do KV (SVG) e fotos (WebP)
  favicon.svg, ícones, site.webmanifest, robots.txt, sitemap.xml
source/                    ← arquivos originais (não são publicados)
  kv/                      ← peças do KV em 1920x1080
  vetores/                 ← caderno .ai e Letra Caixa
  fonts/                   ← TTFs originais
scripts/
  extract_vectors.py       ← .ai/PDF → SVGs limpos e recoloridos
  build_images.py          ← KV → recortes WebP, textura, imagem OG e ícones
vercel.json / netlify.toml ← publicação, cache e cabeçalhos de segurança
```

## Rodar localmente

```bash
cd public && python3 -m http.server 8080
# abrir http://localhost:8080/?utm_source=teste&gclid=abc  (para ver o repasse de UTMs)
```

## Publicar

- **Vercel**: importe o repositório. O `vercel.json` já aponta `public/` como saída. O domínio é `www.arenarobotica.com.br`, e o domínio sem `www` redireciona para ele (308).
- **Netlify**: importe o repositório. O `netlify.toml` já define `publish = "public"`.

## Configuração (topo do `public/index.html`)

```js
window.AR26 = {
  symplaUrl: "https://www.sympla.com.br/evento/arena-robotica-26/3617088",           // ingresso
  volunteerUrl: "https://www.sympla.com.br/evento/voluntarios-arena-robotica/3617780", // voluntários
  gtmId: "",                                 // ← ex.: "GTM-ABC1234"
  metaPixelId: "",                           // ← opcional
  eventStart: "2026-11-06T09:00:00-03:00",  // ← abertura dos portões (contagem regressiva)
  eventEnd: "2026-11-08T16:00:00-03:00",
  battleVideo: ""                            // ← ex.: "/assets/video/batalha.mp4"
};
```

O JS aplica `symplaUrl` em todos os botões de ingresso e `volunteerUrl` nos links de voluntário. Se um link mudar,
troque também os `href` e o `offers.url` do JSON-LD no `index.html`, para quem estiver sem JavaScript.

## Conversão e rastreamento

### Botões de ingresso

Todos usam o mesmo texto, a mesma cor e `data-cta="<posicao>"`. O link do Sympla abre na mesma aba.

| `posicao`      | Onde fica                                      |
|----------------|------------------------------------------------|
| `hero`         | Botão principal do topo                        |
| `card`         | Destaque da Batalha de Robôs                   |
| `passos`       | Seção “Garanta o seu em 3 passos”              |
| `faq`          | Fim das perguntas frequentes                   |
| `final`        | Fechamento rosa “Ainda não garantiu?”          |
| `barra_mobile` | Barra fixa do celular                          |
| `header`       | Cabeçalho fixo (desktop)                       |

A barra do celular só aparece depois que o botão do hero sai da tela e some no fechamento rosa,
para nunca existirem dois botões iguais na mesma tela.

### Evento enviado ao `dataLayer`

```js
{ event: "clique_ingresso", posicao: "hero", link_url: "https://www.sympla.com.br/...?utm_source=..." }
```

Com o GTM carregado, a navegação espera a tag disparar (`eventCallback`), com limite de 700 ms.

### Repasse de UTMs e GCLID

`utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid` e `msclkid` da URL são copiados para todos os links do Sympla.
Eles ficam guardados na sessão, para não se perderem se a pessoa navegar pelas âncoras.

### Configurar o GTM (uma vez)

1. **Variáveis** → *Variável da camada de dados* `posicao` (nome: `DLV - posicao`).
2. **Acionador** → *Evento personalizado* `clique_ingresso` (nome: `CE - clique_ingresso`).
3. **Tags**
   - *Tag do Google* com o ID do GA4 (acionador: Initialization - All Pages).
   - *GA4 Evento* `clique_ingresso` com o parâmetro `posicao = {{DLV - posicao}}` (acionador: `CE - clique_ingresso`).
     No GA4, marque o evento como **evento-chave**.
   - *Vinculador de conversões* (acionador: All Pages).
   - *Acompanhamento de conversões do Google Ads*, conversão **“AR26 - Clique ingresso”** (acionador: `CE - clique_ingresso`).
4. **Consentimento**: o site já envia o *Consent Mode v2* (padrão `denied`) antes de carregar o GTM e
   atualiza quando a pessoa escolhe no banner. No GTM, ative a *Visão geral do consentimento* e deixe as tags
   do Google com o consentimento integrado. Também é enviado o evento `consent_update` para acionar tags de terceiros.
5. **Meta Pixel (opcional)**: preencha `metaPixelId`. Ele só carrega com consentimento de marketing e envia
   `Lead` com `posicao` em cada clique. Se preferir gerenciar pelo GTM, deixe o campo vazio e use o evento `consent_update`.

Também são enviados:

- `clique_voluntario` com `posicao` (`faq` ou `rodape`), nos links de inscrição de voluntários. Eles somem sozinhos depois de 05/11, quando as inscrições fecham (`data-vol-until`). Eles abrem em nova aba, levam as mesmas UTMs e **não** contam como conversão de ingresso.
- `mapa_aberto`, quando alguém carrega o mapa interativo.

## Pendências de conteúdo (precisam vir do cliente)

Os textos abaixo estão **provisórios** e precisam ser confirmados antes de publicar:

- [x] Link do evento no Sympla e link de inscrição de voluntários.
- [ ] ID do GTM e conversão do Google Ads.
- [x] Horários (06 e 07/11, das 9h às 18h; 08/11, das 9h às 16h), endereço e descrição oficial do Sympla.
- [ ] **Programação por dia**: a página mostra só o que é oficial (dias, horários e o que rola todos os dias) com o aviso "em breve". Quando sair, siga “Publicar a programação” abaixo.
- [ ] Portão de entrada, estacionamento, transporte e acessibilidade (seção Local).
- [ ] Respostas do FAQ sobre idade, documento na entrada e saída e retorno.
- [ ] Logos em SVG do Instituto Guilda, da Secretaria de CT&I e do GDF (hoje o rodapé usa texto).
- [ ] Links das redes sociais (rodapé) e e-mail de privacidade (`privacidade.html`).
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
