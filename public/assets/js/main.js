/* Arena Robótica 26 · comportamento da landing page
   Sem dependências. Carregado com `defer`. */
(function () {
  "use strict";

  var CFG = window.AR26 || {};
  var dataLayer = (window.dataLayer = window.dataLayer || []);
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------
     1. Link do Sympla + repasse de UTMs e IDs de clique
     ------------------------------------------------------------ */
  var PASS_KEYS = /^(utm_[a-z_]+|gclid|gbraid|wbraid|fbclid|msclkid)$/;
  var STORE_KEY = "ar26_attrib";

  function readAttribution() {
    var found = {};
    new URLSearchParams(location.search).forEach(function (v, k) {
      if (PASS_KEYS.test(k) && v) found[k] = v;
    });
    try {
      if (Object.keys(found).length) sessionStorage.setItem(STORE_KEY, JSON.stringify(found));
      else found = JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {}
    return found;
  }

  function buildTicketUrl(base, params) {
    var url;
    try { url = new URL(base); } catch (e) { return base; }
    Object.keys(params).forEach(function (k) { url.searchParams.set(k, params[k]); });
    return url.toString();
  }

  var attribution = readAttribution();
  var ctas = $$("[data-cta]");
  ctas.forEach(function (a) {
    var base = CFG.symplaUrl || a.getAttribute("href");
    a.href = buildTicketUrl(base, attribution);
    a.removeAttribute("target"); // o Sympla abre na mesma aba
  });

  /* ------------------------------------------------------------
     2. Evento de conversão: clique_ingresso { posicao }
     ------------------------------------------------------------ */
  ctas.forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var posicao = a.getAttribute("data-cta");
      var href = a.href;
      var newTab = ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1;

      if (window.fbq) window.fbq("track", "Lead", { content_name: "ingresso", posicao: posicao });

      var gtmReady = !!(window.google_tag_manager && CFG.gtmId && window.google_tag_manager[CFG.gtmId]);
      if (!gtmReady || newTab) {
        dataLayer.push({ event: "clique_ingresso", posicao: posicao, link_url: href });
        return;
      }
      // Segura a navegação até a tag disparar (ou 700 ms, o que vier antes)
      ev.preventDefault();
      var done = false;
      var go = function () { if (!done) { done = true; location.href = href; } };
      dataLayer.push({ event: "clique_ingresso", posicao: posicao, link_url: href, eventCallback: go, eventTimeout: 700 });
      setTimeout(go, 800);
    });
  });

  /* ------------------------------------------------------------
     3. Consentimento (LGPD + Consent Mode v2)
     ------------------------------------------------------------ */
  var CONSENT_KEY = "ar26_consent";
  var banner = $("[data-consent]");
  var prefs = $("[data-consent-prefs]");

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null"); } catch (e) { return null; }
  }

  function applyConsent(c) {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: c.analytics ? "granted" : "denied",
        ad_storage: c.marketing ? "granted" : "denied",
        ad_user_data: c.marketing ? "granted" : "denied",
        ad_personalization: c.marketing ? "granted" : "denied"
      });
    }
    dataLayer.push({ event: "consent_update", consent_analytics: !!c.analytics, consent_marketing: !!c.marketing });
    if (c.marketing) loadMetaPixel();
  }

  function saveConsent(c) {
    c.ts = new Date().toISOString();
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) {}
    applyConsent(c);
    hideBanner();
  }

  function showBanner() {
    if (!banner) return;
    var c = getConsent();
    if (prefs && c) {
      prefs.elements.analytics.checked = !!c.analytics;
      prefs.elements.marketing.checked = !!c.marketing;
    }
    banner.hidden = false;
    document.body.classList.add("has-consent");
  }
  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove("has-consent");
  }

  if (banner) {
    $("[data-consent-accept]", banner).addEventListener("click", function () { saveConsent({ analytics: true, marketing: true }); });
    $("[data-consent-reject]", banner).addEventListener("click", function () { saveConsent({ analytics: false, marketing: false }); });
    var custom = $("[data-consent-custom]", banner);
    var save = $("[data-consent-save]", banner);
    custom.addEventListener("click", function () {
      var open = prefs.hidden;
      prefs.hidden = !open;
      save.hidden = !open;
      custom.setAttribute("aria-expanded", String(open));
      if (open) prefs.elements.analytics.focus();
    });
    save.addEventListener("click", function () {
      saveConsent({ analytics: prefs.elements.analytics.checked, marketing: prefs.elements.marketing.checked });
    });
    $$("[data-consent-open]").forEach(function (b) { b.addEventListener("click", showBanner); });

    var saved = getConsent();
    if (saved) { if (saved.marketing) loadMetaPixel(); }
    else setTimeout(showBanner, 1200); // não compete com o hero no primeiro segundo
  }

  function loadMetaPixel() {
    var id = CFG.metaPixelId;
    if (!id || window.fbq) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", id);
    window.fbq("track", "PageView");
  }

  /* ------------------------------------------------------------
     4. Contagem regressiva estilo display
     ------------------------------------------------------------ */
  var cd = $("[data-countdown]");
  if (cd) {
    var start = new Date(CFG.eventStart || "2026-11-06T09:00:00-03:00").getTime();
    var end = new Date(CFG.eventEnd || "2026-11-08T20:00:00-03:00").getTime();
    var out = { d: $("[data-cd=d]", cd), h: $("[data-cd=h]", cd), m: $("[data-cd=m]", cd), s: $("[data-cd=s]", cd) };
    var label = $("[data-cd-label]", cd);
    var sr = $("[data-cd-sr]", cd);
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var lastSr = "";

    var tick = function () {
      var now = Date.now();
      var diff = start - now;
      if (diff <= 0) {
        cd.classList.add("is-live");
        label.textContent = now < end ? "Acontecendo agora" : "Obrigado por vir!";
        ["d", "h", "m", "s"].forEach(function (k) { out[k].textContent = "00"; });
        return false;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      out.d.textContent = pad(d); out.h.textContent = pad(h); out.m.textContent = pad(m); out.s.textContent = pad(s);
      var txt = "Faltam " + d + " dias e " + h + " horas para o evento.";
      if (txt !== lastSr) { sr.textContent = txt; lastSr = txt; }
      return true;
    };
    if (tick()) {
      var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000);
    }
  }

  /* ------------------------------------------------------------
     5. Revelar ao rolar
     ------------------------------------------------------------ */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* pausa animações de seções fora da tela (economiza bateria no celular) */
  if ("IntersectionObserver" in window) {
    var ao = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-off", !e.isIntersecting); });
    });
    $$("[data-anim-scope]").forEach(function (el) { ao.observe(el); });
  }

  /* ------------------------------------------------------------
     6. Troca de personagens do hero (com glitch)
     ------------------------------------------------------------ */
  var chars = $$("[data-chars] .chars__item");
  if (chars.length > 1 && !reduceMotion) {
    // as outras fotos só baixam depois que a página carregou (não competem com o LCP)
    var loadRest = function () {
      setTimeout(function () {
        chars.forEach(function (c) {
          var img = $("img[data-src]", c);
          if (!img) return;
          img.srcset = img.getAttribute("data-srcset");
          img.src = img.getAttribute("data-src");
          img.removeAttribute("data-src");
          img.removeAttribute("data-srcset");
        });
      }, 1200);
    };
    if (document.readyState === "complete") loadRest();
    else window.addEventListener("load", loadRest, { once: true });
    var ci = 0;
    var heroEl = $(".hero");
    setInterval(function () {
      if (document.hidden || (heroEl && heroEl.classList.contains("is-off"))) return;
      var prev = chars[ci];
      ci = (ci + 1) % chars.length;
      var next = chars[ci];
      var nextImg = $("img", next);
      if (!nextImg.complete || !nextImg.naturalWidth) { ci = (ci - 1 + chars.length) % chars.length; return; }
      next.classList.add("is-active", "is-glitch");
      prev.classList.remove("is-active");
      setTimeout(function () { next.classList.remove("is-glitch"); }, 500);
    }, 5200);
  }

  /* ------------------------------------------------------------
     7. Abas da programação (padrão WAI-ARIA)
     ------------------------------------------------------------ */
  $$("[data-tabs]").forEach(function (root) {
    var tabs = $$('[role="tab"]', root);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    // durante o evento, abre no dia de hoje (horário de Brasília)
    var today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    var match = tabs.filter(function (t) { return t.getAttribute("data-date") === today; })[0];
    if (match) select(match);
  });

  /* ------------------------------------------------------------
     8. Cabeçalho e barra fixa do celular
     ------------------------------------------------------------ */
  var hdr = $("[data-hdr]");
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle("is-scrolled", window.scrollY > 24); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var mbar = $("[data-mbar]");
  var heroCta = $('[data-cta="hero"]');
  var finalSec = $("[data-final]");
  if (mbar && heroCta && "IntersectionObserver" in window) {
    var state = { hero: true, final: false };
    var mbarLink = $("a", mbar);
    var update = function () {
      var on = !state.hero && !state.final;
      mbar.classList.toggle("is-on", on);
      document.body.classList.toggle("has-mbar", on);
      mbar.setAttribute("aria-hidden", String(!on));
      mbarLink.tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (e) { state.hero = e[0].isIntersecting; update(); }).observe(heroCta);
    if (finalSec) new IntersectionObserver(function (e) { state.final = e[0].isIntersecting; update(); }, { threshold: 0.25 }).observe(finalSec);
  }

  /* menu: marca a seção atual */
  var navLinks = $$(".hdr__nav a");
  if (navLinks.length && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) so.observe(s); });
  }

  /* ------------------------------------------------------------
     9. Batalha: cronômetro do round + vídeo só no desktop
     ------------------------------------------------------------ */
  var stage = $("[data-battle]");
  if (stage) {
    var bt = $("[data-battle-timer]", stage);
    var left = 180;
    if (!reduceMotion) {
      setInterval(function () {
        if (stage.closest(".is-off") || document.hidden) return;
        left = left <= 0 ? 180 : left - 1;
        bt.textContent = Math.floor(left / 60) + ":" + (left % 60 < 10 ? "0" : "") + (left % 60);
      }, 1000);
    }

    var desktop = window.matchMedia("(min-width: 960px)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (CFG.battleVideo && desktop && !saveData && !reduceMotion && "IntersectionObserver" in window) {
      var vo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        vo.disconnect();
        var v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
        v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
        v.preload = "auto";
        v.src = CFG.battleVideo;
        v.addEventListener("canplay", function () { stage.classList.add("has-video"); }, { once: true });
        stage.appendChild(v);
      }, { rootMargin: "200px" });
      vo.observe(stage);
    }
  }

  /* ------------------------------------------------------------
     10. Mapa sob demanda (não carrega Google Maps sem ação)
     ------------------------------------------------------------ */
  var map = $("[data-map]");
  if (map) {
    $("[data-map-load]", map).addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.title = "Mapa: Arena BRB Mané Garrincha, Brasília";
      f.src = "https://www.google.com/maps?q=Arena+BRB+Man%C3%A9+Garrincha,+Bras%C3%ADlia&z=15&output=embed";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.allowFullscreen = true;
      map.innerHTML = "";
      map.appendChild(f);
      dataLayer.push({ event: "mapa_aberto" });
    });
  }
})();
