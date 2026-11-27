/* Implement — painel privado do cliente (/cliente/<slug>).
   Entra com a palavra-passe enviada pela equipa; mostra as redes (seguidores), as campanhas e o progresso do mês.
   /cliente/modelo mostra um exemplo sem palavra-passe. */
(() => {
  const app = document.getElementById("pc-app");
  const sair = document.getElementById("pc-sair");
  const slug = (location.pathname.match(/^\/cliente\/([a-z0-9-]+)/) || [])[1] || "";
  const H = { "Content-Type": "application/json", "X-Implement": "1" };
  const WHATSAPP = "https://wa.me/351962951161";
  const EMAIL = "info@heyimplement.com";

  const T = {
    pt: {
      titulo: "Área de cliente", entrar: "Entrar", senha: "Palavra-passe", intro: "Escreva a palavra-passe que lhe enviámos por e-mail.",
      erroSenha: "Palavra-passe incorreta.", erro: "Não foi possível carregar. Tente outra vez daqui a pouco.", aEntrar: "A entrar…",
      ola: (n) => `Olá${n ? ", " + n : ""}`, sub: "Acompanhe aqui a presença digital da sua marca.", sair: "Sair",
      redes: "Redes sociais", seguidores: "seguidores", ult30: "nos últimos 30 dias", atualizado: "Atualizado a", semDados: "Ainda sem dados",
      campanhas: "Campanhas de anúncios", semCampanhas: "Não há campanhas ativas de momento.", semCampanhasP: "Quando lançarmos uma campanha, os resultados aparecem aqui.",
      investido: "Investido", orcamento: "Orçamento", alcance: "Alcance", cliques: "Cliques", resultados: "Resultados", desde: "Desde", ate: "até",
      estados: { ativa: "Ativa", pausada: "Pausada", terminada: "Terminada" },
      mes: "Este mês", mesP: (f, t) => `${f} de ${t} tarefas concluídas`, mesVazio: "O plano do mês está a ser preparado.",
      vis: "Visitas ao site",
      visMes: "visitas este mês",
      visAnt: "face ao mês anterior",
      visAno: "Visitas por mês",
      visTotal: "Total do período",
      plano: "O seu plano", ajuda: "Precisa de alguma coisa?", ajudaP: "Fale connosco a qualquer momento.", wa: "WhatsApp", mail: "E-mail",
      demo: "Exemplo com dados fictícios: é assim que cada cliente vê o seu painel.", rodape: "Página privada da Implement Digital Marketing. Não partilhe o link nem a palavra-passe.",
      locale: "pt-PT",
    },
    en: {
      titulo: "Client area", entrar: "Sign in", senha: "Password", intro: "Enter the password we sent you by email.",
      erroSenha: "Incorrect password.", erro: "We couldn’t load this. Please try again in a moment.", aEntrar: "Signing in…",
      ola: (n) => `Hello${n ? ", " + n : ""}`, sub: "Follow your brand’s digital presence here.", sair: "Sign out",
      redes: "Social media", seguidores: "followers", ult30: "in the last 30 days", atualizado: "Updated", semDados: "No data yet",
      campanhas: "Ad campaigns", semCampanhas: "There are no active campaigns at the moment.", semCampanhasP: "When we launch a campaign, its results will show here.",
      investido: "Spent", orcamento: "Budget", alcance: "Reach", cliques: "Clicks", resultados: "Results", desde: "From", ate: "to",
      estados: { ativa: "Active", pausada: "Paused", terminada: "Finished" },
      mes: "This month", mesP: (f, t) => `${f} of ${t} tasks done`, mesVazio: "This month’s plan is being prepared.",
      vis: "Website visits",
      visMes: "visits this month",
      visAnt: "vs last month",
      visAno: "Visits per month",
      visTotal: "Total for the period",
      plano: "Your plan", ajuda: "Need anything?", ajudaP: "Talk to us any time.", wa: "WhatsApp", mail: "Email",
      demo: "Example with sample data: this is how each client sees their dashboard.", rodape: "Private page by Implement Digital Marketing. Please don’t share the link or the password.",
      locale: "en-GB",
    },
  };
  let L = T[(navigator.language || "").toLowerCase().startsWith("pt") ? "pt" : "en"];

  const REDE = {
    instagram: { n: "Instagram", i: "r-instagram" }, facebook: { n: "Facebook", i: "r-facebook" }, tiktok: { n: "TikTok", i: "r-tiktok" },
    youtube: { n: "YouTube", i: "r-youtube" }, google: { n: "Google", i: "s-google" }, linkedin: { n: "LinkedIn", l: "in" },
    pinterest: { n: "Pinterest", l: "P" }, x: { n: "X", l: "X" },
  };
  const PLAT = { meta: "Meta Ads", google: "Google Ads", tiktok: "TikTok Ads", linkedin: "LinkedIn Ads", outra: "Ads" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const n = (v) => Number(v || 0).toLocaleString(L.locale);
  const eur = (v) => Number(v || 0).toLocaleString(L.locale, { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 ? 2 : 0 });
  const data = (d) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString(L.locale, { day: "numeric", month: "short", year: "numeric" }) : "");
  const icone = (r) => {
    const x = REDE[r] || { n: r, l: "•" };
    return x.i ? `<svg aria-hidden="true"><use href="/assets/img/sprite.svg#${x.i}"/></svg>` : `<span class="pc-rede__letra" aria-hidden="true">${esc(x.l)}</span>`;
  };

  function rodape() { document.getElementById("pc-rodape").textContent = L.rodape; }

  function ecraEntrar(msg = "") {
    sair.hidden = true;
    document.title = `Implement · ${L.titulo}`;
    app.innerHTML = `<section class="pc-entrar">
      <div class="pc-entrar__cartao">
        <svg class="abelha abelha--lilas pc-entrar__abelha" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
        <h1>${L.titulo}</h1>
        <p>${L.intro}</p>
        <form id="pc-forma" novalidate>
          <label class="campo__rotulo" for="pc-senha">${L.senha}</label>
          <input class="entrada" id="pc-senha" name="senha" type="password" autocomplete="current-password" required>
          <button class="botao" type="submit" id="pc-entrar"><span>${L.entrar}</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></button>
          <p class="aviso-erro" id="pc-erro" role="alert">${esc(msg)}</p>
        </form>
      </div>
    </section>`;
    rodape();
    const f = document.getElementById("pc-forma");
    f.senha.focus();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = document.getElementById("pc-entrar");
      const span = b.querySelector("span");
      b.disabled = true; span.textContent = L.aEntrar;
      try {
        const r = await fetch("/api/cliente/entrar", { method: "POST", headers: H, credentials: "same-origin", body: JSON.stringify({ slug, senha: f.senha.value }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) { document.getElementById("pc-erro").textContent = r.status === 401 ? L.erroSenha : d.erro || L.erro; f.senha.select(); return; }
        await carregar();
      } catch { document.getElementById("pc-erro").textContent = L.erro; }
      finally { b.disabled = false; span.textContent = L.entrar; }
    });
  }

  function redes(p) {
    const lista = p.redes.length ? p.redes : Object.keys(p.seguidores).map((rede) => ({ rede, conta: "" }));
    if (!lista.length) return "";
    return `<section class="pc-bloco" aria-labelledby="pc-t-redes">
      <h2 id="pc-t-redes">${L.redes}</h2>
      <ul class="pc-redes">${lista.map((r) => {
        const s = p.seguidores[r.rede];
        const v = s && s.variacao !== null && s.variacao !== undefined ? s.variacao : null;
        const nome = (REDE[r.rede] || { n: r.rede }).n;
        const conta = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.conta || nome)}</a>` : esc(r.conta);
        return `<li class="pc-rede pc-rede--${esc(r.rede)}">
          <div class="pc-rede__topo"><span class="pc-rede__icone">${icone(r.rede)}</span><div><strong>${esc(nome)}</strong>${conta ? `<span>${conta}</span>` : ""}</div></div>
          ${s ? `<p class="pc-rede__numero">${n(s.seguidores)} <small>${L.seguidores}</small></p>
            ${v !== null ? `<p class="pc-rede__var pc-rede__var--${v > 0 ? "sobe" : v < 0 ? "desce" : "igual"}">${v > 0 ? "+" : ""}${n(v)} ${L.ult30}</p>` : ""}
            <p class="pc-rede__data">${L.atualizado} ${data(s.data)}</p>` : `<p class="pc-rede__data">${L.semDados}</p>`}
        </li>`;
      }).join("")}</ul>
    </section>`;
  }

  function visitas(p) {
    const v = (p.visitas || []);
    if (!v.some((x) => x.visitas !== null)) return "";
    const atual = v[v.length - 1];
    const ant = v.length > 1 ? v[v.length - 2] : null;
    const max = Math.max(...v.map((x) => x.visitas || 0), 1);
    const total = v.reduce((t, x) => t + (x.visitas || 0), 0);
    const dif = atual.visitas !== null && ant && ant.visitas ? Math.round((atual.visitas - ant.visitas) / ant.visitas * 100) : null;
    const mesCurto = (k) => new Date(k + "-15T12:00:00").toLocaleDateString(L.locale, { month: "short" }).replace(".", "");
    return `<section class="pc-bloco" aria-labelledby="pc-t-vis">
      <h2 id="pc-t-vis">${L.vis}</h2>
      <div class="pc-vis__topo">
        <p class="pc-rede__numero">${atual.visitas !== null ? n(atual.visitas) : "—"} <small>${L.visMes}</small></p>
        ${dif !== null ? `<p class="pc-rede__var pc-rede__var--${dif > 0 ? "sobe" : dif < 0 ? "desce" : "igual"}">${dif > 0 ? "+" : ""}${dif}% ${L.visAnt}</p>` : ""}
        ${atual.nota ? `<p class="pc-rede__data">${esc(atual.nota)}</p>` : ""}
      </div>
      ${v.length > 1 ? `<figure class="pc-grafico" aria-label="${L.visAno}">
        <ol>${v.map((x) => `<li${x.mes === atual.mes ? ' class="pc-grafico--atual"' : ""}><span class="pc-grafico__valor">${x.visitas !== null ? n(x.visitas) : ""}</span><i data-alt="${x.visitas ? Math.max(3, Math.round(x.visitas / max * 72)) : 0}"></i><span class="pc-grafico__mes">${esc(mesCurto(x.mes))}</span></li>`).join("")}</ol>
        <figcaption>${L.visTotal}: <strong>${n(total)}</strong></figcaption>
      </figure>` : ""}
    </section>`;
  }

  function campanhas(p) {
    const c = p.campanhas || [];
    return `<section class="pc-bloco" aria-labelledby="pc-t-camp">
      <h2 id="pc-t-camp">${L.campanhas}</h2>
      ${c.length ? `<ul class="pc-campanhas">${c.map((x) => {
        const pct = x.orcamento ? Math.min(100, Math.round((x.investido || 0) / x.orcamento * 100)) : null;
        const met = [[L.alcance, x.alcance, n], [L.cliques, x.cliques, n]].filter((m) => m[1] !== null && m[1] !== undefined);
        return `<li class="pc-camp">
          <div class="pc-camp__topo"><span class="pc-camp__plat pc-camp__plat--${esc(x.plataforma)}">${esc(PLAT[x.plataforma] || "Ads")}</span><span class="pc-camp__estado pc-camp__estado--${esc(x.estado)}">${esc(L.estados[x.estado] || x.estado)}</span></div>
          <h3>${esc(x.nome)}</h3>
          ${x.objetivo ? `<p class="pc-camp__obj">${esc(x.objetivo)}</p>` : ""}
          ${x.inicio ? `<p class="pc-camp__datas">${L.desde} ${data(x.inicio)}${x.fim ? ` ${L.ate} ${data(x.fim)}` : ""}</p>` : ""}
          ${x.investido !== null || x.orcamento !== null ? `<div class="pc-camp__invest">
            <div class="pc-camp__valores"><span>${L.investido} <strong>${eur(x.investido)}</strong></span>${x.orcamento ? `<span>${L.orcamento} ${eur(x.orcamento)}</span>` : ""}</div>
            ${pct !== null ? `<div class="pc-barra" role="img" aria-label="${pct}%"><i data-pct="${pct}"></i></div>` : ""}
          </div>` : ""}
          ${met.length ? `<dl class="pc-camp__met">${met.map(([k, v, f]) => `<div><dt>${k}</dt><dd>${f(v)}</dd></div>`).join("")}</dl>` : ""}
          ${x.resultados ? `<p class="pc-camp__res"><strong>${L.resultados}:</strong> ${esc(x.resultados)}</p>` : ""}
        </li>`;
      }).join("")}</ul>` : `<div class="pc-vazio"><p><strong>${L.semCampanhas}</strong></p><p>${L.semCampanhasP}</p></div>`}
    </section>`;
  }

  function lateral(p) {
    const m = p.mes || { total: 0, feitas: 0 };
    const pct = m.total ? Math.round(m.feitas / m.total * 100) : 0;
    const mesNome = new Date().toLocaleDateString(L.locale, { month: "long", year: "numeric" });
    return `<aside class="pc-lado">
      <section class="pc-cartao pc-cartao--escuro" aria-labelledby="pc-t-mes">
        <p class="pc-cartao__leg" id="pc-t-mes">${L.mes} · ${esc(mesNome)}</p>
        ${m.total ? `<p class="pc-mes__num">${pct}%</p><div class="pc-barra pc-barra--clara"><i data-pct="${pct}"></i></div><p class="pc-mes__txt">${L.mesP(m.feitas, m.total)}</p>` : `<p class="pc-mes__txt">${L.mesVazio}</p>`}
      </section>
      ${p.pacotes ? `<section class="pc-cartao" aria-labelledby="pc-t-plano"><p class="pc-cartao__leg" id="pc-t-plano">${L.plano}</p><ul class="pc-plano">${p.pacotes.split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x.trim())}</li>`).join("")}</ul></section>` : ""}
      <section class="pc-cartao" aria-labelledby="pc-t-ajuda">
        <p class="pc-cartao__leg" id="pc-t-ajuda">${L.ajuda}</p>
        <p>${L.ajudaP}</p>
        <div class="pc-ajuda">
          <a class="botao botao--pequeno" href="${WHATSAPP}" target="_blank" rel="noopener"><svg aria-hidden="true" class="pc-ajuda__wa"><use href="/assets/img/sprite.svg#r-whatsapp"/></svg><span>${L.wa}</span></a>
          <a class="botao botao--pequeno botao--secundario" href="mailto:${EMAIL}"><span>${L.mail}</span></a>
        </div>
      </section>
    </aside>`;
  }

  function painel(p) {
    L = T[p.idioma === "en" ? "en" : "pt"];
    document.documentElement.lang = p.idioma === "en" ? "en" : "pt-PT";
    document.title = `${p.marca} · Implement`;
    sair.hidden = Boolean(p.demo);
    sair.textContent = L.sair;
    const primeiro = (p.nome || "").split(" ")[0];
    app.innerHTML = `${p.demo ? `<p class="pc-demo">${L.demo}</p>` : ""}
      <div class="contentor">
        <header class="pc-cabeca">
          <p class="legenda">${esc(p.marca)}</p>
          <h1>${esc(L.ola(primeiro))} <span class="pc-onda" aria-hidden="true">👋</span></h1>
          <p>${L.sub}</p>
        </header>
        <div class="pc-grelha">
          <div class="pc-principal">${redes(p)}${visitas(p)}${campanhas(p)}</div>
          ${lateral(p)}
        </div>
      </div>`;
    // Larguras das barras via JS (a CSP não permite style="" no HTML)
    app.querySelectorAll("[data-pct]").forEach((i) => { i.style.width = i.dataset.pct + "%"; });
    app.querySelectorAll("[data-alt]").forEach((i) => { i.style.height = i.dataset.alt + "%"; });
    rodape();
  }

  async function carregar() {
    try {
      const r = await fetch("/api/cliente/painel?slug=" + encodeURIComponent(slug), { credentials: "same-origin", headers: { "X-Implement": "1" } });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) return ecraEntrar();
      if (!r.ok || !d.ok) throw new Error();
      painel(d.painel);
      app.focus({ preventScroll: true });
    } catch {
      app.innerHTML = `<div class="pc-vazio pc-vazio--erro"><p>${L.erro}</p></div>`;
      rodape();
    }
  }

  sair.addEventListener("click", async () => {
    await fetch("/api/cliente/sair", { method: "POST", headers: H, credentials: "same-origin" }).catch(() => {});
    ecraEntrar();
  });

  if (!slug) { app.innerHTML = ""; return; }
  carregar();
})();
