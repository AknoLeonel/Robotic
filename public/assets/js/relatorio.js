/* Arena Robótica 26 · prestação de contas
   Lê /prestacao-de-contas/dados.json (ou dados-exemplo.json com ?exemplo=1) e monta a página.
   Campo null = ainda sem dado: mostra "—" ou "aguardando dados". Sem dependências além do Chart.js. */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EXEMPLO = new URLSearchParams(location.search).get("exemplo") === "1";
  var BASE = "/prestacao-de-contas/"; // caminho absoluto: a Vercel serve a página sem a barra final
  var FONTE = BASE + (EXEMPLO ? "dados-exemplo.json" : "dados.json");
  var COLORS = ["#8CFF1A", "#E33FD9", "#B7A6FF", "#F07FC0", "#FFFFFF", "#4FE3FF"];
  var charts = {};

  /* ---------- formatação ---------- */
  var isNum = function (v) { return typeof v === "number" && isFinite(v); };
  var num = function (v, dec) {
    return isNum(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }) : "—";
  };
  var brl = function (v) { return isNum(v) ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"; };
  var pct = function (v) { return isNum(v) ? (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—"; };
  var ratio = function (a, b) { return isNum(a) && isNum(b) && b > 0 ? a / b : null; };
  var sum = function (arr, key) {
    var vals = arr.map(function (x) { return key ? x[key] : x; }).filter(isNum);
    return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) : null;
  };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var safeUrl = function (u) { return /^(https?:\/\/|\/)/i.test(u || "") ? u : ""; };
  var dataBR = function (iso) {
    if (!iso) return "—";
    var p = String(iso).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : esc(iso);
  };
  var dm = function (iso) { var p = String(iso).split("-"); return p[2] + "/" + p[1]; };
  var get = function (obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  };
  var EMPTY = '<p class="empty"><span class="dot" aria-hidden="true"></span>Aguardando dados</p>';

  /* ---------- blocos ---------- */
  function kpis(el, items) {
    el.innerHTML = items.map(function (k) {
      var vazio = k.v === "—";
      return '<div class="kpi' + (vazio ? " is-empty" : "") + '"><p class="kpi__v">' + k.v + '</p><p class="kpi__l">' + esc(k.l) +
        (k.s ? '<span class="kpi__s">' + esc(k.s) + "</span>" : "") + "</p></div>";
    }).join("");
  }

  function table(el, head, rows, foot) {
    if (!rows.length) { el.innerHTML = EMPTY; return; }
    var th = head.map(function (h) { return '<th scope="col"' + (h.n ? ' class="n"' : "") + ">" + esc(h.t) + "</th>"; }).join("");
    var tr = function (r, tag) {
      return "<tr>" + r.map(function (c, i) {
        var t = i === 0 && tag === "td" ? "th scope=\"row\"" : tag;
        return "<" + t + (head[i] && head[i].n ? ' class="n"' : "") + ">" + c + "</" + t.split(" ")[0] + ">";
      }).join("") + "</tr>";
    };
    el.innerHTML = '<table class="tbl"><thead><tr>' + th + "</tr></thead><tbody>" +
      rows.map(function (r) { return tr(r, "td"); }).join("") + "</tbody>" +
      (foot ? "<tfoot>" + tr(foot, "td") + "</tfoot>" : "") + "</table>";
  }

  function chart(key, cfg, hasData, label) {
    var el = $('[data-chart="' + key + '"]');
    if (!el) return;
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
    if (!hasData || !window.Chart) { el.innerHTML = EMPTY; return; }
    el.innerHTML = '<canvas role="img" aria-label="' + esc(label) + '"></canvas>';
    charts[key] = new window.Chart($("canvas", el), cfg);
  }

  function baseOpts(extra) {
    var o = {
      responsive: true, maintainAspectRatio: false,
      animation: matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 700 },
      plugins: { legend: { labels: { color: "#C9D2FF", boxWidth: 12, font: { family: "Space Mono", size: 11 } } },
        tooltip: { backgroundColor: "#02104F", borderColor: "#8CFF1A", borderWidth: 1, titleFont: { family: "Space Mono" }, bodyFont: { family: "Space Mono" } } },
      scales: {
        x: { ticks: { color: "#C9D2FF", font: { family: "Space Mono", size: 11 } }, grid: { color: "rgba(160,178,255,.12)" } },
        y: { beginAtZero: true, ticks: { color: "#C9D2FF", font: { family: "Space Mono", size: 11 } }, grid: { color: "rgba(160,178,255,.12)" } }
      }
    };
    return Object.assign(o, extra || {});
  }
  var donutOpts = function () {
    return { responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: { legend: { position: "bottom", labels: { color: "#C9D2FF", boxWidth: 12, font: { family: "Space Mono", size: 11 } } } } };
  };

  /* ---------- seções ---------- */
  function render(d) {
    var g = d.geral || {}, ing = d.ingressos || {}, md = d.midia || {}, st = d.site || {}, ig = d.instagram || {}, im = d.imprensa || {};
    var gads = (md.google_ads && md.google_ads.campanhas) || [];
    var mads = (md.meta_ads && md.meta_ads.campanhas) || [];
    var outros = md.outros_canais || [];

    // status e cabeçalho
    var status = $("[data-status]");
    if (EXEMPLO) {
      status.hidden = false; status.className = "rel-status rel-status--demo";
      status.innerHTML = "<strong>Dados fictícios.</strong> Esta versão serve só para ver o layout preenchido. Os números reais estão em <a href=\"" + BASE + "\">prestação de contas</a>.";
    } else if (!d.meta || !d.meta.atualizado_em) {
      status.hidden = false; status.className = "rel-status";
      status.innerHTML = "<strong>Relatório em preparação.</strong> Os números entram depois do evento. Para ver o layout preenchido, abra o <a href=\"" + BASE + "?exemplo=1\">modo exemplo</a>.";
    }
    var per = (d.meta && d.meta.periodo_campanha) || {};
    $("[data-meta]").innerHTML = "Campanha de <strong>" + dataBR(per.inicio) + "</strong> a <strong>" + dataBR(per.fim) +
      "</strong>. Evento de 06 a 08/11/2026, Arena Mané Garrincha, Brasília." +
      (d.meta && d.meta.atualizado_em ? " Atualizado em <strong>" + dataBR(d.meta.atualizado_em) + "</strong>." : "");
    $$("[data-text]").forEach(function (el) { var t = get(d, el.getAttribute("data-text")); el.textContent = t || ""; el.hidden = !t; });

    // totais de mídia
    var custoG = sum(gads, "custo"), custoM = sum(mads, "custo"), custoO = sum(outros, "custo");
    var investimento = sum([custoG, custoM, custoO].filter(isNum));
    var cliquesMidia = sum([sum(gads, "cliques"), sum(mads, "cliques"), sum(outros, "cliques")].filter(isNum));
    var impMidia = sum([sum(gads, "impressoes"), sum(mads, "impressoes"), sum(outros, "impressoes")].filter(isNum));

    kpis($('[data-kpis="geral"]'), [
      { v: num(g.ingressos_retirados), l: "Ingressos retirados", s: "Sympla" },
      { v: num(g.publico_presente), l: "Público presente", s: "nos 3 dias" },
      { v: pct(ratio(g.publico_presente, g.ingressos_retirados)), l: "Comparecimento", s: "presentes ÷ ingressos" },
      { v: brl(ratio(investimento, g.ingressos_retirados)), l: "Custo por ingresso", s: "mídia paga ÷ ingressos" }
    ]);
    kpis($('[data-kpis="evento"]'), [
      { v: isNum(g.equipes) ? "+" + num(g.equipes) : "—", l: "Equipes participantes" },
      { v: brl(g.premios_reais).replace(",00", ""), l: "Em prêmios" },
      { v: "3", l: "Dias de evento" },
      { v: num(g.escolas), l: "Escolas presentes" }
    ]);

    var dias = g.publico_por_dia || [];
    chart("publico", {
      type: "bar",
      data: { labels: dias.map(function (x) { return x.rotulo; }),
        datasets: [{ label: "Presentes", data: dias.map(function (x) { return x.presentes; }), backgroundColor: COLORS[0], borderRadius: 6 }] },
      options: baseOpts({ plugins: { legend: { display: false } } })
    }, dias.some(function (x) { return isNum(x.presentes); }), "Público presente por dia do evento");

    // ingressos diários (dia / semana / acumulado)
    var diario = (ing.diario || []).filter(function (x) { return Array.isArray(x) && isNum(x[1]); });
    function serie(modo) {
      if (modo === "semana") {
        var semanas = {};
        diario.forEach(function (x) {
          var dt = new Date(x[0] + "T12:00:00"); var seg = new Date(dt); seg.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
          var k = seg.toISOString().slice(0, 10); semanas[k] = (semanas[k] || 0) + x[1];
        });
        var ks = Object.keys(semanas).sort();
        return { labels: ks.map(function (k) { return "sem. " + dm(k); }), data: ks.map(function (k) { return semanas[k]; }) };
      }
      var acc = 0;
      return { labels: diario.map(function (x) { return dm(x[0]); }),
        data: diario.map(function (x) { acc += x[1]; return modo === "acumulado" ? acc : x[1]; }) };
    }
    function drawDiario(modo) {
      var s = serie(modo);
      chart("diario", {
        type: modo === "acumulado" ? "line" : "bar",
        data: { labels: s.labels, datasets: [{ label: "Ingressos retirados", data: s.data, backgroundColor: COLORS[0], borderColor: COLORS[0],
          borderRadius: 4, fill: modo === "acumulado" ? { target: "origin", above: "rgba(140,255,26,.15)" } : false, tension: .3, pointRadius: 2 }] },
        options: baseOpts({ plugins: { legend: { display: false } } })
      }, diario.length > 0, "Ingressos retirados por " + modo);
    }
    drawDiario("dia");
    $$("[data-group-toggle] button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-group-toggle] button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        drawDiario(b.getAttribute("data-group"));
      });
    });

    var origem = (ing.origem || []).filter(function (x) { return isNum(x.ingressos); });
    chart("origem", {
      type: "doughnut",
      data: { labels: origem.map(function (x) { return x.canal; }),
        datasets: [{ data: origem.map(function (x) { return x.ingressos; }), backgroundColor: COLORS, borderColor: "#031066", borderWidth: 3 }] },
      options: donutOpts()
    }, origem.length > 0, "Origem dos ingressos por canal");

    var top = diario.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    $('[data-list="top-dias"]').innerHTML = top.length ? top.map(function (x) {
      return '<li><span class="rank__k rank__k--date">' + dm(x[0]) + '</span><span class="rank__v">' + num(x[1]) + " ingressos</span></li>";
    }).join("") : EMPTY;

    // mídia
    kpis($('[data-kpis="midia"]'), [
      { v: brl(investimento), l: "Investimento total", s: "Google + Meta + outros" },
      { v: num(impMidia), l: "Impressões" },
      { v: num(cliquesMidia), l: "Cliques" },
      { v: brl(ratio(investimento, cliquesMidia)), l: "Custo por clique", s: "média" }
    ]);
    var canais = [{ c: "Google Ads", v: custoG }, { c: "Meta Ads", v: custoM }]
      .concat(outros.map(function (o) { return { c: o.canal, v: o.custo }; })).filter(function (x) { return isNum(x.v) && x.v > 0; });
    chart("investimento", {
      type: "doughnut",
      data: { labels: canais.map(function (x) { return x.c; }),
        datasets: [{ data: canais.map(function (x) { return x.v; }), backgroundColor: COLORS, borderColor: "#031066", borderWidth: 3 }] },
      options: donutOpts()
    }, canais.length > 0, "Investimento em mídia por canal");

    var camps = gads.map(function (c) { return { n: c.nome, v: c.cliques }; })
      .concat(mads.map(function (c) { return { n: c.nome, v: c.cliques }; })).filter(function (x) { return isNum(x.v); });
    chart("cliques-campanha", {
      type: "bar",
      data: { labels: camps.map(function (x) { return x.n; }), datasets: [{ label: "Cliques", data: camps.map(function (x) { return x.v; }), backgroundColor: COLORS[1], borderRadius: 4 }] },
      options: baseOpts({ indexAxis: "y", plugins: { legend: { display: false } } })
    }, camps.length > 0, "Cliques por campanha");

    var gRows = gads.map(function (c) {
      return [esc(c.nome), esc(c.tipo || ""), num(c.impressoes), num(c.cliques), pct(ratio(c.cliques, c.impressoes)), brl(c.custo),
        brl(ratio(c.custo, c.cliques)), num(c.conversoes), brl(ratio(c.custo, c.conversoes))];
    });
    var gTot = ["Total", "", num(sum(gads, "impressoes")), num(sum(gads, "cliques")), pct(ratio(sum(gads, "cliques"), sum(gads, "impressoes"))),
      brl(custoG), brl(ratio(custoG, sum(gads, "cliques"))), num(sum(gads, "conversoes")), brl(ratio(custoG, sum(gads, "conversoes")))];
    table($('[data-table="google"]'), [{ t: "Campanha" }, { t: "Tipo" }, { t: "Impressões", n: 1 }, { t: "Cliques", n: 1 }, { t: "CTR", n: 1 },
      { t: "Investimento", n: 1 }, { t: "CPC", n: 1 }, { t: "Conversões", n: 1 }, { t: "Custo/conv.", n: 1 }], gRows, gads.length > 1 ? gTot : null);

    table($('[data-table="meta"]'), [{ t: "Campanha" }, { t: "Objetivo" }, { t: "Alcance", n: 1 }, { t: "Impressões", n: 1 }, { t: "Cliques", n: 1 },
      { t: "Investimento", n: 1 }, { t: "CPC", n: 1 }, { t: "Resultados", n: 1 }],
      mads.map(function (c) {
        return [esc(c.nome), esc(c.objetivo || ""), num(c.alcance), num(c.impressoes), num(c.cliques), brl(c.custo), brl(ratio(c.custo, c.cliques)), num(c.resultados)];
      }));

    // site
    var pos = (st.cliques_por_posicao || []);
    kpis($('[data-kpis="site"]'), [
      { v: num(st.visitas), l: "Visitas", s: "GA4" },
      { v: num(st.usuarios), l: "Usuários" },
      { v: num(st.cliques_ingresso), l: "Cliques no ingresso" },
      { v: pct(ratio(st.cliques_ingresso, st.visitas)), l: "Taxa de clique", s: "cliques ÷ visitas" }
    ]);
    var posOk = pos.filter(function (p) { return isNum(p.cliques); }).sort(function (a, b) { return b.cliques - a.cliques; });
    chart("posicoes", {
      type: "bar",
      data: { labels: posOk.map(function (p) { return p.rotulo; }), datasets: [{ label: "Cliques", data: posOk.map(function (p) { return p.cliques; }), backgroundColor: COLORS[0], borderRadius: 4 }] },
      options: baseOpts({ indexAxis: "y", plugins: { legend: { display: false } } })
    }, posOk.length > 0, "Cliques no botão de ingresso por posição na página");

    // instagram
    kpis($('[data-kpis="instagram"]'), [
      { v: num(ig.alcance), l: "Alcance" },
      { v: num(ig.visualizacoes), l: "Visualizações" },
      { v: num(ig.interacoes), l: "Interações", s: pct(ratio(ig.interacoes, ig.alcance)) !== "—" ? pct(ratio(ig.interacoes, ig.alcance)) + " do alcance" : "" },
      { v: isNum(ig.seguidores_ganhos) ? "+" + num(ig.seguidores_ganhos) : "—", l: "Novos seguidores" }
    ]);
    var fmts = (ig.formatos || []).filter(function (f) { return isNum(f.visualizacoes) || isNum(f.interacoes); });
    chart("formatos", {
      type: "bar",
      data: { labels: fmts.map(function (f) { return f.formato; }), datasets: [
        { label: "Visualizações", data: fmts.map(function (f) { return f.visualizacoes; }), backgroundColor: COLORS[0], borderRadius: 4, yAxisID: "y" },
        { label: "Interações", data: fmts.map(function (f) { return f.interacoes; }), backgroundColor: COLORS[1], borderRadius: 4, yAxisID: "y2" }] },
      options: baseOpts({ scales: {
        x: { ticks: { color: "#C9D2FF", font: { family: "Space Mono" } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#8CFF1A", font: { family: "Space Mono", size: 10 } }, grid: { color: "rgba(160,178,255,.12)" } },
        y2: { beginAtZero: true, position: "right", ticks: { color: "#E33FD9", font: { family: "Space Mono", size: 10 } }, grid: { display: false } } } })
    }, fmts.length > 0, "Visualizações e interações por formato no Instagram");

    var pubs = ig.publicacoes || [];
    var eng = function (p) { return (p.curtidas || 0) + (p.comentarios || 0) + (p.compartilhamentos || 0); };
    var topPubs = pubs.slice().sort(function (a, b) { return eng(b) - eng(a); }).slice(0, 5);
    $('[data-list="top-posts"]').innerHTML = topPubs.length ? topPubs.map(function (p) {
      return '<li><span class="rank__k">' + esc(p.titulo) + '</span><span class="rank__v">' + num(eng(p)) + " interações</span></li>";
    }).join("") : EMPTY;

    var cats = ["Todas"].concat(pubs.map(function (p) { return p.categoria; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; }));
    var filtro = $("[data-filter]");
    function drawPubs(cat) {
      var lista = pubs.filter(function (p) { return cat === "Todas" || p.categoria === cat; });
      table($('[data-table="publicacoes"]'), [{ t: "Publicação" }, { t: "Categoria" }, { t: "Data" }, { t: "Curtidas", n: 1 }, { t: "Coment.", n: 1 }, { t: "Compart.", n: 1 }, { t: "" }],
        lista.map(function (p) {
          var u = safeUrl(p.url);
          return [esc(p.titulo), esc(p.categoria), p.data ? dm(p.data) : "—", num(p.curtidas), num(p.comentarios), num(p.compartilhamentos),
            u ? '<a class="ext" href="' + esc(u) + '" target="_blank" rel="noopener">Abrir<span class="sr-only"> ' + esc(p.titulo) + " (nova aba)</span></a>" : ""];
        }));
    }
    filtro.innerHTML = pubs.length ? cats.map(function (c, i) {
      return '<button type="button" class="chip" aria-pressed="' + (i === 0) + '">' + esc(c) + "</button>";
    }).join("") : "";
    $$(".chip", filtro).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".chip", filtro).forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        drawPubs(b.textContent);
      });
    });
    drawPubs("Todas");

    function gallery(el, items, withStats) {
      if (!items.length) { el.innerHTML = EMPTY; return; }
      el.innerHTML = items.map(function (p) {
        var src = safeUrl(p.imagem || p.src);
        var cap = esc(p.titulo || p.legenda || "");
        var stats = withStats ? '<p class="g-stats"><b>' + num(p.curtidas) + "</b> curtidas · <b>" + num(p.comentarios) + "</b> coment. · <b>" + num(p.compartilhamentos) + "</b> compart.</p>" : "";
        var img = src ? '<img src="' + esc(src) + '" alt="' + cap + '" loading="lazy" decoding="async">' : '<div class="g-ph" aria-hidden="true"></div>';
        return '<figure class="g-item">' + img + "<figcaption>" + cap + stats + "</figcaption></figure>";
      }).join("");
    }
    gallery($('[data-gallery="destaques"]'), pubs.filter(function (p) { return p.destaque; }), true);

    // imprensa e ações
    var mats = im.materias || [];
    kpis($('[data-kpis="imprensa"]'), [
      { v: num(im.releases_enviados), l: "Releases enviados" },
      { v: num(im.contatos), l: "Jornalistas e veículos contatados" },
      { v: mats.length ? num(mats.length) : "—", l: "Matérias publicadas" }
    ]);
    table($('[data-table="materias"]'), [{ t: "Veículo" }, { t: "Matéria" }, { t: "Tipo" }, { t: "Data" }, { t: "" }], mats.map(function (m) {
      var u = safeUrl(m.url);
      return [esc(m.veiculo), esc(m.titulo), esc(m.tipo || ""), dataBR(m.data),
        u ? '<a class="ext" href="' + esc(u) + '" target="_blank" rel="noopener">Ver<span class="sr-only"> ' + esc(m.titulo) + " (nova aba)</span></a>" : ""];
    }));
    $('[data-list="acoes"]').innerHTML = (d.outras_acoes || []).map(function (a) {
      return '<article class="action"><p class="action__n">' + num(a.numero) + '</p><h4 class="action__t">' + esc(a.titulo) + "</h4>" +
        '<p class="action__l">' + esc(a.rotulo || "") + "</p>" + (a.descricao ? '<p class="action__d">' + esc(a.descricao) + "</p>" : "") + "</article>";
    }).join("");
    gallery($('[data-gallery="fotos"]'), d.galeria || [], false);

    // parceiros
    var papeis = {};
    (d.parceiros || []).forEach(function (p) { (papeis[p.papel] = papeis[p.papel] || []).push(p.nome); });
    $('[data-list="parceiros"]').innerHTML = Object.keys(papeis).map(function (k) {
      return '<div class="partner"><p class="partner__role">' + esc(k) + "</p><ul>" +
        papeis[k].map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>";
    }).join("") || EMPTY;

    // síntese
    var concl = d.conclusoes || [];
    $('[data-list="conclusoes"]').innerHTML = concl.length ? concl.map(function (c, i) {
      return '<article class="concl"><p class="concl__n lcd-txt">' + (i < 9 ? "0" : "") + (i + 1) + '</p><h3 class="concl__t">' + esc(c.titulo) + '</h3><p>' + esc(c.texto) + "</p></article>";
    }).join("") : EMPTY;

    $("[data-foot-right]").textContent = "Fontes: " + ((d.meta && d.meta.fontes) || []).join(", ");
    if (d.meta && d.meta.atualizado_em) $("[data-foot-left]").textContent = "Arena Robótica 26 · Relatório atualizado em " + dataBR(d.meta.atualizado_em);
  }

  /* menu: marca a seção visível */
  function navSpy() {
    var links = $$(".rel-nav a");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$(".rel-sec").forEach(function (s) { io.observe(s); });
  }

  function start() {
    navSpy();
    fetch(FONTE, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () {
        var st = $("[data-status]"); st.hidden = false; st.className = "rel-status rel-status--erro";
        st.textContent = "Não foi possível carregar os dados do relatório (" + FONTE + "). Confira se o arquivo existe e é um JSON válido.";
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
