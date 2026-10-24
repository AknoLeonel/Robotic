/*!
 * Arena Robótica 26 · rastreamento
 * Meta Pixel + API de Conversões, Google Analytics 4, Google Tag Manager e Microsoft Clarity,
 * com consentimento (LGPD + Consent Mode v2).
 *
 * Configuração em window.ARENA_TRACKING_CONFIG (ver /head.html e o README).
 * API pública: window.ArenaTracking
 *   .track(nome, params, { meta: "NomeNaMeta" })   evento próprio
 *   .consent.get() / .consent.set({ analytics, marketing }) / .consent.open()
 */
(function () {
  "use strict";

  var CFG = window.ARENA_TRACKING_CONFIG || {};
  var CONSENT_KEY = "arena_consent";
  var CONSENT_VERSION = 1;
  var ATTRIB_KEY = "arena_attrib";
  var DEFAULT_UTMS = { utm_source: "site", utm_medium: "referral", utm_campaign: "ar26" };
  var PASS_KEYS = /^(utm_[a-z_]+|gclid|gbraid|wbraid|fbclid|msclkid)$/;

  var w = window, d = document;
  var dataLayer = (w.dataLayer = w.dataLayer || []);
  function gtag() { dataLayer.push(arguments); }
  w.gtag = w.gtag || gtag;

  /* ---------------- depuração: ?arena_debug=1 ---------------- */
  var DEBUG = !!CFG.debug;
  try {
    var qd = new URLSearchParams(location.search).get("arena_debug");
    if (qd === "1") sessionStorage.setItem("arena_debug", "1");
    if (qd === "0") sessionStorage.removeItem("arena_debug");
    DEBUG = DEBUG || sessionStorage.getItem("arena_debug") === "1";
  } catch (e) {}
  function log() {
    if (!DEBUG) return;
    var a = Array.prototype.slice.call(arguments);
    a.unshift("%c[arena]", "color:#8CFF1A;background:#0A1E8C;padding:1px 4px;border-radius:3px");
    console.log.apply(console, a);
  }

  function uuid() {
    if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function loadScript(src) {
    var s = d.createElement("script");
    s.async = true;
    s.src = src;
    d.head.appendChild(s);
    return s;
  }
  function getCookie(name) {
    var m = d.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  }
  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    d.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + exp + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }

  /* ---------------- consentimento ---------------- */
  function readConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
      return c && c.v === CONSENT_VERSION ? c : null;
    } catch (e) { return null; }
  }
  var consent = readConsent();

  gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: "denied", functionality_storage: "granted", security_storage: "granted",
    wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", true);
  if (consent) applyGoogleConsent(consent);

  function applyGoogleConsent(c) {
    gtag("consent", "update", {
      analytics_storage: c.analytics ? "granted" : "denied",
      ad_storage: c.marketing ? "granted" : "denied",
      ad_user_data: c.marketing ? "granted" : "denied",
      ad_personalization: c.marketing ? "granted" : "denied"
    });
  }

  function setConsent(c) {
    var prev = consent;
    consent = { analytics: !!c.analytics, marketing: !!c.marketing, v: CONSENT_VERSION, ts: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch (e) {}
    applyGoogleConsent(consent);
    dataLayer.push({ event: "consent_update", consent_analytics: consent.analytics, consent_marketing: consent.marketing });
    log("consentimento", consent);
    if (consent.analytics) startClarity();
    if (w.clarity) w.clarity("consent", consent.analytics);
    if (consent.marketing) {
      startMeta();
      flushMetaQueue();
    } else {
      metaQueue.length = 0; // recusou: descarta o que estava na fila
      if (prev && prev.marketing && w.fbq) w.fbq("consent", "revoke");
    }
    d.dispatchEvent(new CustomEvent("arena:consent", { detail: consent }));
  }

  /* ---------------- Google: GA4 + Google Ads + GTM (Consent Mode já aplicado) ---------------- */
  // um único gtag.js atende o GA4 e o Google Ads
  var gtagId = CFG.ga4Id || CFG.googleAdsId;
  if (gtagId) {
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gtagId));
    gtag("js", new Date());
    if (CFG.ga4Id) gtag("config", CFG.ga4Id, DEBUG ? { debug_mode: true } : {});
    if (CFG.googleAdsId) gtag("config", CFG.googleAdsId);
  }
  if (CFG.gtmId) {
    dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CFG.gtmId));
  }

  function ga(name, params) {
    if (!CFG.ga4Id) return;
    params = params || {};
    params.send_to = CFG.ga4Id; // sem isso o evento também iria para o Google Ads
    gtag("event", name, params);
    log("GA4", name, params);
  }

  // conversão do Google Ads "AR26 - Clique ingresso" (só se o rótulo estiver configurado)
  function adsTicketConversion(cb) {
    if (!CFG.googleAdsId || !CFG.googleAdsTicketLabel) return false;
    gtag("event", "conversion", {
      send_to: CFG.googleAdsId + "/" + CFG.googleAdsTicketLabel,
      value: 0, currency: "BRL",
      event_callback: cb, event_timeout: 450
    });
    log("Google Ads conversão", CFG.googleAdsTicketLabel);
    return true;
  }

  /* ---------------- Clarity (só com consentimento de métricas) ---------------- */
  var clarityStarted = false;
  function startClarity() {
    if (clarityStarted || !CFG.clarityId) return;
    clarityStarted = true;
    w.clarity = w.clarity || function () { (w.clarity.q = w.clarity.q || []).push(arguments); };
    loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(CFG.clarityId));
    w.clarity("consent", true);
    log("Clarity carregado");
  }
  function clarityEvent(name) {
    if (w.clarity && consent && consent.analytics) w.clarity("event", name);
  }

  /* ---------------- Meta: Pixel + API de Conversões (só com consentimento de marketing) ---------------- */
  var metaStarted = false;
  var metaQueue = [];

  // fbclid → cookie _fbc (formato da Meta), mesmo antes do Pixel carregar
  (function () {
    try {
      var fbclid = new URLSearchParams(location.search).get("fbclid");
      if (fbclid) w.__arenaFbc = "fb.1." + Date.now() + "." + fbclid;
    } catch (e) {}
  })();

  function startMeta() {
    if (metaStarted || !CFG.metaPixelId) return;
    metaStarted = true;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,"script","https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    w.fbq("init", CFG.metaPixelId);
    if (w.__arenaFbc && !getCookie("_fbc")) setCookie("_fbc", w.__arenaFbc, 90);
    log("Meta Pixel carregado");
  }

  function meta(name, customData, userData) {
    if (!CFG.metaPixelId) return;
    var ev = {
      event_name: name,
      event_id: uuid(),
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      referrer_url: d.referrer || undefined,
      custom_data: customData || {},
      user_data: userData || {}
    };
    if (consent && consent.marketing) sendMeta(ev);
    else if (!consent) { metaQueue.push(ev); log("Meta (na fila até o aceite)", name); }
    // consentimento negado: não envia nada
  }

  function flushMetaQueue() {
    var q = metaQueue.splice(0);
    q.forEach(sendMeta);
  }

  var STANDARD = /^(PageView|ViewContent|InitiateCheckout|Contact|Lead|CompleteRegistration|Schedule|Subscribe|Search)$/;
  function sendMeta(ev) {
    startMeta();
    var method = STANDARD.test(ev.event_name) ? "track" : "trackCustom";
    w.fbq(method, ev.event_name, ev.custom_data, { eventID: ev.event_id });
    log("Meta Pixel", ev.event_name, ev.custom_data, ev.event_id);
    if (!CFG.capiEndpoint) return;
    ev.user_data.fbp = getCookie("_fbp");
    ev.user_data.fbc = getCookie("_fbc") || w.__arenaFbc;
    var body = JSON.stringify(ev);
    var sent = false;
    try {
      if (navigator.sendBeacon) sent = navigator.sendBeacon(CFG.capiEndpoint, new Blob([body], { type: "text/plain" }));
    } catch (e) {}
    if (!sent && w.fetch) {
      fetch(CFG.capiEndpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {});
    }
    log("API de Conversões", ev.event_name, ev.event_id);
  }

  /* ---------------- UTMs → links da Sympla ---------------- */
  function attribution() {
    var found = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) { if (PASS_KEYS.test(k) && v) found[k] = v; });
      if (Object.keys(found).length) sessionStorage.setItem(ATTRIB_KEY, JSON.stringify(found));
      else found = JSON.parse(sessionStorage.getItem(ATTRIB_KEY) || "{}");
    } catch (e) {}
    var hasUtm = Object.keys(found).some(function (k) { return k.indexOf("utm_") === 0; });
    if (!hasUtm) Object.keys(DEFAULT_UTMS).forEach(function (k) { found[k] = DEFAULT_UTMS[k]; });
    return found;
  }
  function isSympla(url) { return /(^|\.)sympla\.com\.br$/i.test(url.hostname); }
  function decorateSymplaLinks() {
    var params = attribution();
    Array.prototype.forEach.call(d.querySelectorAll("a[href]"), function (a) {
      var url;
      try { url = new URL(a.href, location.href); } catch (e) { return; }
      if (!isSympla(url)) return;
      Object.keys(params).forEach(function (k) { url.searchParams.set(k, params[k]); });
      a.href = url.toString();
    });
  }

  /* ---------------- eventos automáticos ---------------- */
  var ticketLink = function (a, url) {
    // ingresso = link da Sympla que não é a inscrição de voluntários
    return isSympla(url) && !a.hasAttribute("data-vol") && !/voluntari/i.test(url.pathname);
  };
  var CONTACT = [
    { re: /^(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)$/i, method: "whatsapp" },
    { re: /(^|\.)instagram\.com$/i, method: "instagram" }
  ];

  function onClick(ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("a, button, [data-track]") : null;
    if (!el) return;

    var named = el.getAttribute("data-track");
    if (named) {
      ga("cta_click", { cta_name: named, link_url: el.href || undefined });
      clarityEvent("cta_" + named);
    }
    if (el.tagName !== "A" || !el.href) return;

    var url;
    try { url = new URL(el.href, location.href); } catch (e) { return; }

    if (url.protocol === "tel:" || url.protocol === "mailto:") {
      var m = url.protocol === "tel:" ? "telefone" : "email";
      ga("contact_click", { method: m });
      meta("Contact", { method: m });
      clarityEvent("contact_" + m);
      return;
    }

    if (ticketLink(el, url)) {
      var posicao = el.getAttribute("data-cta") || named || "link";
      var params = { posicao: posicao, link_url: url.toString() };
      meta("InitiateCheckout", { content_name: "ingresso", posicao: posicao, currency: "BRL", value: 0 });
      clarityEvent("ticket_click");
      dataLayer.push({ event: "clique_ingresso", posicao: posicao, link_url: params.link_url });

      var newTab = ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1 || el.target === "_blank";
      if (newTab || !gtagId || ev.defaultPrevented) { ga("ticket_click", params); adsTicketConversion(); return; }
      // mesma aba: espera o Google confirmar o envio (no máximo 500 ms) antes de sair para a Sympla
      ev.preventDefault();
      var done = false, pending = 0;
      var go = function () { if (!done) { done = true; location.href = url.toString(); } };
      var settle = function () { if (--pending <= 0) go(); };
      if (CFG.ga4Id) { pending++; params.event_callback = settle; params.event_timeout = 450; }
      if (CFG.googleAdsId && CFG.googleAdsTicketLabel) pending++;
      ga("ticket_click", params);
      adsTicketConversion(settle);
      if (!pending) go();
      setTimeout(go, 500);
      return;
    }

    for (var i = 0; i < CONTACT.length; i++) {
      if (CONTACT[i].re.test(url.hostname)) {
        ga("contact_click", { method: CONTACT[i].method, link_url: url.toString() });
        meta("Contact", { method: CONTACT[i].method });
        clarityEvent("contact_" + CONTACT[i].method);
        return;
      }
    }

    if (url.hostname && url.hostname !== location.hostname) {
      ga("outbound_click", { link_url: url.toString(), link_domain: url.hostname, link_name: el.getAttribute("data-vol") ? "voluntario" : undefined });
    }
  }

  /* formulários → Lead (dados pessoais só vão para a API de Conversões) */
  function onSubmit(ev) {
    var f = ev.target;
    if (!f || f.tagName !== "FORM" || f.hasAttribute("data-track-ignore")) return;
    var get = function (sel) { var i = f.querySelector(sel); return i && i.value ? i.value : undefined; };
    var name = get('[name*="nome" i], [name*="name" i], [autocomplete="name"]');
    var parts = name ? name.trim().split(/\s+/) : [];
    ga("generate_lead", { form_name: f.getAttribute("name") || f.id || "formulario" });
    meta("Lead", { form_name: f.getAttribute("name") || f.id || "formulario" }, {
      email: get('[type="email"], [name*="mail" i]'),
      phone: get('[type="tel"], [name*="fone" i], [name*="phone" i], [name*="whats" i]'),
      first_name: parts[0],
      last_name: parts.length > 1 ? parts[parts.length - 1] : undefined
    });
    clarityEvent("lead");
  }

  /* rolagem 25/50/75/90 e ViewContent (50% ou 30 s visível) */
  var scrollMarks = [25, 50, 75, 90], scrollDone = {}, viewContentSent = false;
  function viewContent(reason) {
    if (viewContentSent) return;
    viewContentSent = true;
    ga("engaged_view", { reason: reason });
    meta("ViewContent", { content_name: d.title, reason: reason });
    clarityEvent("engaged_view");
  }
  function onScroll() {
    var h = d.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (max <= 0) return;
    var pct = Math.round((h.scrollTop || d.body.scrollTop) / max * 100);
    scrollMarks.forEach(function (m) {
      if (pct >= m && !scrollDone[m]) { scrollDone[m] = true; ga("scroll_depth", { percent: m }); }
    });
    if (pct >= 50) viewContent("scroll_50");
  }

  /* tempo visível 15/30/60/120/300 s */
  var timeMarks = [15, 30, 60, 120, 300], visibleSecs = 0;
  setInterval(function () {
    if (d.visibilityState !== "visible") return;
    visibleSecs += 1;
    if (timeMarks.indexOf(visibleSecs) !== -1) ga("time_on_page", { seconds: visibleSecs });
    if (visibleSecs === 30) viewContent("time_30s");
  }, 1000);

  /* seções com data-track-section */
  function watchSections() {
    if (!("IntersectionObserver" in w)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        ga("section_view", { section_name: e.target.getAttribute("data-track-section") });
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(d.querySelectorAll("[data-track-section]"), function (s) { io.observe(s); });
  }

  /* vídeos: início, 25/50/75% e fim (eventos de mídia não borbulham: escuta na captura) */
  var videoState = new WeakMap();
  // vídeo decorativo (autoplay + mudo + loop) não gera eventos de vídeo
  function decorative(v) { return v.autoplay && v.muted && v.loop; }
  function videoName(v) { return v.getAttribute("data-track") || v.getAttribute("title") || (v.currentSrc || v.src || "").split("/").pop() || "video"; }
  d.addEventListener("play", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || decorative(v)) return;
    var st = videoState.get(v) || {};
    if (!st.started) { st.started = true; ga("video_start", { video_title: videoName(v) }); clarityEvent("video_start"); }
    videoState.set(v, st);
  }, true);
  d.addEventListener("timeupdate", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || !v.duration || decorative(v)) return;
    var st = videoState.get(v) || {};
    [25, 50, 75].forEach(function (p) {
      if (!st[p] && v.currentTime / v.duration * 100 >= p) { st[p] = true; ga("video_progress", { video_title: videoName(v), video_percent: p }); }
    });
    videoState.set(v, st);
  }, true);
  d.addEventListener("ended", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || decorative(v)) return;
    ga("video_complete", { video_title: videoName(v) });
    clarityEvent("video_complete");
  }, true);

  /* SPA: page_view a cada troca de rota */
  function setupSpa() {
    if (!CFG.spa) return;
    var last = location.pathname + location.search;
    var fire = function () {
      var now = location.pathname + location.search;
      if (now === last) return;
      last = now;
      ga("page_view", { page_location: location.href, page_title: d.title });
      meta("PageView");
      decorateSymplaLinks();
    };
    ["pushState", "replaceState"].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { var r = orig.apply(this, arguments); setTimeout(fire, 0); return r; };
    });
    w.addEventListener("popstate", fire);
  }

  /* ---------------- API pública ---------------- */
  w.ArenaTracking = {
    config: CFG,
    track: function (name, params, opts) {
      ga(name, params || {});
      clarityEvent(name);
      if (opts && opts.meta) meta(opts.meta, params || {});
    },
    consent: {
      get: function () { return consent; },
      set: setConsent,
      open: function () { d.dispatchEvent(new CustomEvent("arena:consent-open")); },
      needed: function () { return !consent; }
    },
    debug: function (on) { DEBUG = on !== false; }
  };

  /* ---------------- início ---------------- */
  if (consent && consent.analytics) startClarity();
  if (consent && consent.marketing) startMeta();
  meta("PageView");

  function ready() {
    decorateSymplaLinks();
    watchSections();
    setupSpa();
    d.addEventListener("click", onClick, true);
    d.addEventListener("submit", onSubmit, true);
    w.addEventListener("scroll", onScroll, { passive: true });
    log("pronto", { ga4: CFG.ga4Id, ads: CFG.googleAdsId, gtm: CFG.gtmId, pixel: CFG.metaPixelId, clarity: CFG.clarityId, consentimento: consent });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
