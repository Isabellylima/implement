/* Implement — newsletter: faixa antes do rodapé e convite discreto (pop-up) que aparece uma vez.
   Envia para /api/newsletter (guarda na base de dados e passa para o HubSpot). */
(() => {
  const TXT = {
    en: {
      legenda: "Newsletter",
      titulo: "News and packages, straight to your inbox.",
      texto: "Practical tips to grow your business online, Implement news and special packages before anyone else. One email a month, at most.",
      popTitulo: "Packages and news, first-hand",
      popTexto: "Get practical tips and our special packages before anyone else. One email a month, at most.",
      email: "Your email", botao: "Subscribe", aEnviar: "Subscribing…",
      consent: "I want to receive Implement’s news and packages by email. I can unsubscribe at any time.",
      politica: "Privacy policy",
      ok: "You’re in! See you soon in your inbox 🐝",
      erroEmail: "Please enter a valid email.", erroConsent: "Please tick the box to confirm.", erro: "Something went wrong. Please try again in a moment.",
      fechar: "Close", agoraNao: "Not now",
    },
    pt: {
      legenda: "Newsletter",
      titulo: "Novidades e pacotes, direto no seu e-mail.",
      texto: "Dicas práticas para o seu negócio crescer online, as novidades da Implement e pacotes especiais antes de todos. No máximo um e-mail por mês.",
      popTitulo: "Pacotes e novidades em primeira mão",
      popTexto: "Receba dicas práticas e os nossos pacotes especiais antes de todos. No máximo um e-mail por mês.",
      email: "O seu e-mail", botao: "Subscrever", aEnviar: "A subscrever…",
      consent: "Quero receber por e-mail as novidades e os pacotes da Implement. Posso cancelar quando quiser.",
      politica: "Política de privacidade",
      ok: "Inscrição feita! Até breve no seu e-mail 🐝",
      erroEmail: "Escreva um e-mail válido.", erroConsent: "Marque a caixa para confirmar.", erro: "Não foi possível subscrever. Tente outra vez daqui a pouco.",
      fechar: "Fechar", agoraNao: "Agora não",
    },
  };
  const CHAVE = "implement-newsletter";
  const DIAS_PAUSA = 30;
  const idioma = () => (typeof window.implementIdioma === "function" ? window.implementIdioma() : document.documentElement.lang.startsWith("pt") ? "pt" : "en");
  const t = (k) => (TXT[idioma()] || TXT.en)[k];
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } };
  const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...v })); } catch (_) {} };
  const caminho = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  const PAGINAS_FORMULARIO = ["/start-a-project", "/contact", "/precario", "/privacy", "/404"];
  if (caminho.startsWith("/admin")) return;
  let n = 0;

  function formulario(origem) {
    const i = ++n;
    return `<form class="nl-form" data-origem="${origem}" novalidate>
      <div class="nl-form__linha">
        <label class="sr-only" for="nl-email-${i}" data-nl="email"></label>
        <input class="nl-form__email" id="nl-email-${i}" type="email" name="email" autocomplete="email" inputmode="email" required data-nl-ph="email">
        <input class="sr-only" type="text" name="site_empresa" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="botao nl-form__botao" type="submit"><span data-nl="botao"></span></button>
      </div>
      <label class="nl-form__consent"><input type="checkbox" name="consentimento" required> <span><span data-nl="consent"></span> <a href="/privacy.html" target="_blank" rel="noopener" data-nl="politica"></a></span></label>
      <p class="nl-form__estado" role="status" aria-live="polite"></p>
    </form>`;
  }

  function traduzir(raiz = document) {
    raiz.querySelectorAll("[data-nl]").forEach((el) => { el.textContent = t(el.dataset.nl); });
    raiz.querySelectorAll("[data-nl-ph]").forEach((el) => { el.placeholder = t(el.dataset.nlPh); });
    raiz.querySelectorAll("[data-nl-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.nlAria)); });
  }

  async function enviar(form) {
    const estado = form.querySelector(".nl-form__estado");
    const botao = form.querySelector("button[type=submit]");
    const email = form.email.value.trim();
    estado.className = "nl-form__estado";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { estado.textContent = t("erroEmail"); estado.classList.add("nl-form__estado--erro"); form.email.focus(); return; }
    if (!form.consentimento.checked) { estado.textContent = t("erroConsent"); estado.classList.add("nl-form__estado--erro"); form.consentimento.focus(); return; }
    botao.disabled = true; botao.querySelector("span").textContent = t("aEnviar");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consentimento: true, idioma: idioma(), origem: form.dataset.origem, pagina: location.pathname, site_empresa: form.site_empresa.value }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error((d.erros && Object.values(d.erros)[0]) || t("erro"));
      gravar({ inscrito: true });
      form.classList.add("nl-form--feito");
      estado.textContent = t("ok"); estado.dataset.nl = "ok";
      form.querySelector(".nl-form__linha").hidden = true; form.querySelector(".nl-form__consent").hidden = true;
      if (form.closest(".nl-pop")) setTimeout(() => fecharPop(false), 3500);
    } catch (e) {
      estado.textContent = e.message || t("erro"); estado.classList.add("nl-form__estado--erro");
      botao.disabled = false; botao.querySelector("span").textContent = t("botao");
    }
  }

  document.addEventListener("submit", (e) => {
    const f = e.target.closest(".nl-form");
    if (!f) return;
    e.preventDefault(); enviar(f);
  });

  /* Faixa antes do rodapé */
  const rodape = document.querySelector("footer.rodape");
  if (rodape && !PAGINAS_FORMULARIO.includes(caminho)) {
    const faixa = document.createElement("section");
    faixa.className = "nl-faixa";
    faixa.setAttribute("aria-labelledby", "nl-faixa-titulo");
    faixa.innerHTML = `<div class="contentor nl-faixa__grelha">
      <div><p class="legenda" data-nl="legenda"></p><h2 id="nl-faixa-titulo" data-nl="titulo"></h2><p class="nl-faixa__texto" data-nl="texto"></p></div>
      ${ler().inscrito ? `<p class="nl-form__estado nl-faixa__ja" data-nl="ok"></p>` : formulario("rodape")}
    </div>`;
    rodape.before(faixa);
    traduzir(faixa);
  }

  /* Convite (pop-up): uma vez, depois de algum tempo ou de ler metade da página; nunca depois de subscrever */
  let pop = null;
  function fecharPop(pausar = true) {
    if (!pop) return;
    if (pausar) gravar({ pausa: Date.now() + DIAS_PAUSA * 86400000 });
    pop.classList.remove("nl-pop--visivel");
    const p = pop; pop = null;
    setTimeout(() => p.remove(), 400);
    document.removeEventListener("keydown", tecla);
  }
  const tecla = (e) => { if (e.key === "Escape") fecharPop(); };
  function abrirPop() {
    if (pop || ler().inscrito || (ler().pausa || 0) > Date.now()) return;
    const a = document.activeElement;
    if (a && a.matches && a.matches("input, textarea, select")) return; // não interrompe quem está a escrever
    pop = document.createElement("aside");
    pop.className = "nl-pop";
    pop.setAttribute("aria-labelledby", "nl-pop-titulo");
    pop.innerHTML = `<button type="button" class="nl-pop__fechar" data-nl-aria="fechar">×</button>
      <svg class="abelha nl-pop__abelha" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
      <h2 id="nl-pop-titulo" data-nl="popTitulo"></h2>
      <p data-nl="popTexto"></p>
      ${formulario("popup")}
      <button type="button" class="nl-pop__depois" data-nl="agoraNao"></button>`;
    document.body.append(pop);
    traduzir(pop);
    pop.querySelector(".nl-pop__fechar").addEventListener("click", () => fecharPop());
    pop.querySelector(".nl-pop__depois").addEventListener("click", () => fecharPop());
    document.addEventListener("keydown", tecla);
    requestAnimationFrame(() => requestAnimationFrame(() => pop && pop.classList.add("nl-pop--visivel")));
  }
  if (!PAGINAS_FORMULARIO.includes(caminho) && !ler().inscrito && (ler().pausa || 0) < Date.now()) {
    const tempo = setTimeout(abrirPop, 25000);
    const rolar = () => {
      const h = document.documentElement;
      if (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) > 0.55) {
        clearTimeout(tempo); removeEventListener("scroll", rolar); abrirPop();
      }
    };
    addEventListener("scroll", rolar, { passive: true });
  }

  document.addEventListener("implement:idioma", () => traduzir());
})();
