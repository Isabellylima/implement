/* Implement — comportamento comum: idioma, menu, cabeçalho, animações ao percorrer. */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");

  /* ---------- Idioma (EN no HTML; PT em i18n.js) ---------- */
  const CHAVE = "implement:idioma";
  const originais = new Map(); // elemento → { texto, html, aria }

  function lerPreferencia() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "pt" || q === "en") return q;
    try { const v = localStorage.getItem(CHAVE); if (v === "pt" || v === "en") return v; } catch (_) {}
    return (navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en";
  }

  function aplicarIdioma(idioma) {
    const pt = window.IMPLEMENT_PT || {};
    document.querySelectorAll("[data-i18n], [data-i18n-html], [data-i18n-aria]").forEach((el) => {
      if (!originais.has(el)) originais.set(el, { html: el.innerHTML, aria: el.getAttribute("aria-label") });
      const orig = originais.get(el);
      const chaveTexto = el.getAttribute("data-i18n");
      const chaveHtml = el.getAttribute("data-i18n-html");
      const chaveAria = el.getAttribute("data-i18n-aria");
      if (chaveHtml) el.innerHTML = idioma === "pt" && pt[chaveHtml] ? pt[chaveHtml] : orig.html;
      else if (chaveTexto) {
        if (idioma === "pt" && pt[chaveTexto]) el.textContent = pt[chaveTexto];
        else el.innerHTML = orig.html;
      }
      if (chaveAria) el.setAttribute("aria-label", idioma === "pt" && pt[chaveAria] ? pt[chaveAria] : orig.aria || "");
    });
    doc.lang = idioma === "pt" ? "pt-PT" : "en";
    document.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
    const titulo = document.querySelector('meta[name="titulo-pt"]');
    if (titulo) {
      if (!titulo.dataset.en) titulo.dataset.en = document.title;
      document.title = idioma === "pt" ? titulo.content : titulo.dataset.en;
    }
    window.IMPLEMENT_IDIOMA = idioma;
    document.dispatchEvent(new CustomEvent("implement:idioma", { detail: idioma }));
  }

  window.implementIdioma = () => window.IMPLEMENT_IDIOMA || "en";

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-idioma]");
    if (!b) return;
    try { localStorage.setItem(CHAVE, b.dataset.idioma); } catch (_) {}
    aplicarIdioma(b.dataset.idioma);
  });

  /* ---------- Menu móvel ---------- */
  const hamburguer = document.querySelector(".hamburguer");
  if (hamburguer) {
    const fechar = () => { document.body.classList.remove("menu-aberto"); hamburguer.setAttribute("aria-expanded", "false"); };
    hamburguer.addEventListener("click", () => {
      // O menu começa logo abaixo do cabeçalho, esteja a página no topo ou já percorrida
      const topo = document.querySelector(".topo");
      if (topo) doc.style.setProperty("--menu-topo", `${Math.round(topo.getBoundingClientRect().bottom)}px`);
      const aberto = document.body.classList.toggle("menu-aberto");
      hamburguer.setAttribute("aria-expanded", String(aberto));
    });
    document.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", fechar));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
    matchMedia("(min-width: 981px)").addEventListener("change", fechar);
  }

  /* ---------- Cabeçalho com sombra ao percorrer ---------- */
  const topo = document.querySelector(".topo");
  if (topo) {
    const sentinela = document.createElement("div");
    sentinela.style.cssText = "position:absolute;top:120px;height:1px;width:1px";
    document.body.prepend(sentinela);
    new IntersectionObserver(([e]) => topo.classList.toggle("com-sombra", !e.isIntersecting)).observe(sentinela);
  }

  /* ---------- Revelar ao percorrer ---------- */
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alvos = document.querySelectorAll(".revelar");
  if (reduzir || !("IntersectionObserver" in window)) {
    alvos.forEach((el) => el.classList.add("visivel"));
  } else {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .12 });
    alvos.forEach((el) => obs.observe(el));
  }
  if (reduzir) document.querySelectorAll("svg.voo").forEach((s) => s.pauseAnimations && s.pauseAnimations());

  /* ---------- WhatsApp: botão flutuante e mensagem pré-preenchida ---------- */
  const SPRITE = new URL("../img/sprite.svg", (document.currentScript && document.currentScript.src) || location.href).href;
  const WHATSAPP = "351962951161";
  const MENSAGEM = { pt: "Olá! Gostaria de falar sobre o meu negócio.", en: "Hi! I’d like to talk about my business." };
  const ROTULO = { pt: "Falar connosco pelo WhatsApp", en: "Chat with us on WhatsApp" };
  const flutuante = document.createElement("a");
  flutuante.className = "whatsapp-flutuante";
  flutuante.rel = "noopener";
  flutuante.target = "_blank";
  flutuante.setAttribute("data-whatsapp", "");
  flutuante.innerHTML = `<svg aria-hidden="true"><use href="${SPRITE}#r-whatsapp"/></svg><span class="whatsapp-flutuante__texto"></span>`;
  document.body.appendChild(flutuante);
  // Só altera o que está diferente, para não provocar novas mutações (e um ciclo infinito com o observador)
  function atualizarWhatsapp(idioma) {
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM[idioma] || MENSAGEM.en)}`;
    const rotulo = ROTULO[idioma] || ROTULO.en;
    document.querySelectorAll("a[data-whatsapp]").forEach((a) => {
      if (a.getAttribute("href") !== url) a.setAttribute("href", url);
      if (a.target !== "_blank") a.target = "_blank";
    });
    if (flutuante.getAttribute("aria-label") !== rotulo) flutuante.setAttribute("aria-label", rotulo);
    const texto = flutuante.querySelector(".whatsapp-flutuante__texto");
    if (texto.textContent !== rotulo) texto.textContent = rotulo;
  }
  document.addEventListener("implement:idioma", (e) => atualizarWhatsapp(e.detail));
  // Links de WhatsApp criados depois (ex.: mensagem de sucesso do formulário)
  new MutationObserver((mudancas) => {
    if (mudancas.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches("a[data-whatsapp]") || n.querySelector("a[data-whatsapp]"))))) {
      atualizarWhatsapp(window.IMPLEMENT_IDIOMA || "en");
    }
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Ano no rodapé ---------- */
  document.querySelectorAll("[data-ano]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  aplicarIdioma(lerPreferencia());
})();
