/*!
 * Arena Robótica 26 · aviso de cookies (LGPD)
 * Depende de /tracking/tracking.js (window.ArenaTracking). Usa os estilos .consent/.win/.btn do site.
 * Reabrir: qualquer elemento com [data-open-consent].
 */
(function () {
  "use strict";

  var d = document;
  var AT = window.ArenaTracking;
  if (!AT) return;
  var CFG = AT.config || {};
  var privacy = CFG.privacyPolicyUrl || "/politica-de-privacidade";

  var root, prefs, save, custom, lastFocus;

  function build() {
    if (root) return root;
    root = d.createElement("div");
    root.className = "consent";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "false");
    root.setAttribute("aria-labelledby", "consent-title");
    root.setAttribute("aria-describedby", "consent-desc");
    root.hidden = true;
    root.innerHTML =
      '<div class="win">' +
        '<div class="win__bar"><span class="win__title" id="consent-title">cookies.exe</span>' +
        '<span class="win__btns" aria-hidden="true"><i></i><i></i><i></i></span></div>' +
        '<div class="consent__body">' +
          '<p id="consent-desc">Usamos cookies para medir acessos e melhorar nossas campanhas. Você escolhe. ' +
          '<a href="' + privacy + '">Saiba mais</a>.</p>' +
          '<form class="consent__prefs" hidden>' +
            '<label class="switch"><input type="checkbox" checked disabled><span>Essenciais <small>sempre ativos</small></span></label>' +
            '<label class="switch"><input type="checkbox" name="analytics"><span>Métricas <small>Google Analytics e Microsoft Clarity</small></span></label>' +
            '<label class="switch"><input type="checkbox" name="marketing"><span>Marketing <small>Meta (Facebook e Instagram) e Google Ads</small></span></label>' +
          '</form>' +
          '<div class="consent__actions">' +
            '<button type="button" class="btn btn--cta btn--sm" data-accept>Aceitar todos</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-reject>Só essenciais</button>' +
            '<button type="button" class="linkish" data-custom aria-expanded="false">Personalizar</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-save hidden>Salvar escolhas</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    d.body.appendChild(root);

    prefs = root.querySelector("form");
    save = root.querySelector("[data-save]");
    custom = root.querySelector("[data-custom]");

    root.querySelector("[data-accept]").addEventListener("click", function () { choose({ analytics: true, marketing: true }); });
    root.querySelector("[data-reject]").addEventListener("click", function () { choose({ analytics: false, marketing: false }); });
    custom.addEventListener("click", function () {
      var open = prefs.hidden;
      prefs.hidden = !open;
      save.hidden = !open;
      custom.setAttribute("aria-expanded", String(open));
      if (open) prefs.elements.analytics.focus();
    });
    save.addEventListener("click", function () {
      choose({ analytics: prefs.elements.analytics.checked, marketing: prefs.elements.marketing.checked });
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !AT.consent.needed()) hide();
    });
    prefs.addEventListener("submit", function (e) { e.preventDefault(); });
    return root;
  }

  function choose(c) {
    AT.consent.set(c);
    hide();
  }

  function show(focus) {
    build();
    var c = AT.consent.get();
    prefs.elements.analytics.checked = !!(c && c.analytics);
    prefs.elements.marketing.checked = !!(c && c.marketing);
    root.hidden = false;
    d.body.classList.add("has-consent");
    if (focus) {
      lastFocus = d.activeElement;
      root.querySelector("[data-accept]").focus();
    }
  }

  function hide() {
    if (!root) return;
    root.hidden = true;
    d.body.classList.remove("has-consent");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  d.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-open-consent]") : null;
    if (!t) return;
    e.preventDefault();
    show(true);
  });
  d.addEventListener("arena:consent-open", function () { show(true); });

  function init() {
    // aparece depois de 1,2 s para não competir com o carregamento do topo da página
    if (AT.consent.needed()) setTimeout(function () { show(false); }, 1200);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})();
