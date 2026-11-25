/* Implement — proposta do Carvoeiro Bar (página privada).
   Uma pergunta de cada vez, com a barra da abelha (como «Start a project»); o resumo ao lado acumula as escolhas.
   No fim só se pede o e-mail; envia para /api/contacto (base de dados, e-mail para info@ e HubSpot). */
(() => {
  const form = document.getElementById("cb-form");
  if (!form) return;
  const inicio = Date.now();
  const idioma = () => (typeof window.implementIdioma === "function" ? window.implementIdioma() : "en");
  const TXT = {
    en: { passo: (a, b) => `Step ${a} of ${b}`, email: "Please enter a valid email.", escolha: "Please choose an option.", valor: "Please enter a monthly amount.", erro: "Something went wrong. Please try again in a moment.", aEnviar: "Sending…", orcamento: "Budget", mes: "/month", linguas: "Languages", site: "Website", redes: "Social media" },
    pt: { passo: (a, b) => `Passo ${a} de ${b}`, email: "Escreva um e-mail válido.", escolha: "Escolha uma opção.", valor: "Indique um valor mensal.", erro: "Não foi possível enviar. Tente outra vez daqui a pouco.", aEnviar: "A enviar…", orcamento: "Orçamento", mes: "/mês", linguas: "Línguas", site: "Site", redes: "Redes sociais" },
  };
  const t = (k, ...a) => { const v = (TXT[idioma()] || TXT.en)[k]; return typeof v === "function" ? v(...a) : v; };
  const $ = (id) => document.getElementById(id);
  const todas = [...form.querySelectorAll(".etapa")];
  const valor = $("cb-valor");
  const mail = $("cb-mail");
  const aviso = $("cb-aviso");
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let atual = 0;

  const marcado = (nome) => form.querySelector(`input[name="${nome}"]:checked`);
  const rotulo = (input) => input.closest(".cb-op").querySelector(".cb-op__nome").textContent.trim();
  const visiveis = () => todas;
  const varios = (nome) => [...form.querySelectorAll(`input[name="${nome}"]:checked`)];

  const valida = {
    site: () => (marcado("site") ? "" : t("escolha")),
    redes: () => (marcado("redes") ? "" : t("escolha")),
    valor: () => (Number(valor.value) > 0 ? "" : t("valor")),
    email: () => (EMAIL.test(mail.value.trim()) ? "" : t("email")),
  };

  function mostrar(n, direcao = 1) {
    const lista = visiveis();
    atual = Math.max(0, Math.min(n, lista.length - 1));
    todas.forEach((e) => { e.hidden = true; e.classList.remove("a-entrar", "a-voltar"); });
    const e = lista[atual];
    e.hidden = false;
    e.classList.add(direcao > 0 ? "a-entrar" : "a-voltar");
    aviso.textContent = "";
    $("cb-voltar").hidden = atual === 0;
    const ultimo = atual === lista.length - 1;
    $("cb-seguinte").hidden = ultimo;
    $("cb-enviar").hidden = !ultimo;
    progresso();
  }

  function progresso() {
    const lista = visiveis();
    const curto = (e) => e.querySelector(".cb-curto").textContent;
    $("cb-prog-nome").textContent = curto(lista[atual]);
    $("cb-prog-passo").textContent = t("passo", atual + 1, lista.length);
    const fracao = lista.length > 1 ? atual / (lista.length - 1) : 1;
    $("cb-prog-enchido").style.width = `${Math.max(fracao * 100, 3)}%`;
    $("cb-prog-abelha").style.left = `${Math.max(fracao * 100, 3)}%`;
    const ol = $("cb-etapas");
    ol.innerHTML = "";
    lista.forEach((e, i) => {
      const li = document.createElement("li");
      li.textContent = curto(e);
      li.dataset.estado = i < atual ? "feito" : i === atual ? "atual" : "";
      ol.append(li);
    });
    resumo();
  }

  function seguinte() {
    const e = visiveis()[atual];
    const erro = valida[e.dataset.passo]();
    if (erro) { aviso.textContent = erro; return false; }
    mostrar(atual + 1, 1);
    const foco = visiveis()[atual].querySelector("input:checked, input");
    if (foco && matchMedia("(min-width: 721px)").matches) foco.focus({ preventScroll: true });
    $("cb-cartao").scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function resumo() {
    const lista = $("cb-resumo");
    const linhas = [];
    const s = marcado("site");
    const sc = varios("site_conteudo");
    if (s || sc.length) linhas.push([t("site"), [s && rotulo(s), ...sc.map(rotulo)].filter(Boolean).join(" · ")]);
    const l = varios("linguas");
    if (l.length) linhas.push([t("linguas"), l.map(rotulo).join(", ")]);
    const r = marcado("redes");
    const rl = varios("redes_lista");
    if (r || rl.length) linhas.push([t("redes"), [r && rotulo(r), ...rl.map(rotulo)].filter(Boolean).join(" · ")]);
    if (Number(valor.value) > 0) linhas.push([t("orcamento"), `${Number(valor.value)} €${t("mes")}`, true]);
    lista.innerHTML = "";
    linhas.forEach(([k, v, forte]) => {
      const li = document.createElement("li");
      if (forte) li.className = "cb-resumo__forte";
      const a = document.createElement("span"); a.textContent = k;
      const b = document.createElement("strong"); b.textContent = v;
      li.append(a, b); lista.append(li);
    });
    $("cb-resumo-vazio").hidden = linhas.length > 0;
  }

  form.addEventListener("change", () => { aviso.textContent = ""; resumo(); });
  valor.addEventListener("input", () => {
    document.querySelectorAll(".cb-chip").forEach((c) => c.classList.toggle("cb-chip--ativo", c.dataset.valor === valor.value));
    aviso.textContent = "";
    resumo();
  });
  document.querySelectorAll(".cb-chip").forEach((c) => c.addEventListener("click", () => {
    valor.value = c.dataset.valor;
    valor.dispatchEvent(new Event("input"));
  }));
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "email") { e.preventDefault(); seguinte(); }
  });
  $("cb-seguinte").addEventListener("click", seguinte);
  $("cb-voltar").addEventListener("click", () => mostrar(atual - 1, -1));
  document.addEventListener("implement:idioma", progresso);

  function mensagem() {
    const lin = [];
    const add = (q, v) => { if (v) lin.push(`${q}\n→ ${v}`, ""); };
    const v = (nome) => varios(nome).map((i) => i.value).join(" · ");
    add("Website", marcado("site")?.value);
    add("Website should show", v("site_conteudo"));
    add("Languages", v("linguas"));
    add("Website payment", marcado("pagamento")?.value);
    add("Social media", marcado("redes")?.value);
    add("Networks", v("redes_lista"));
    const notas = form.notas.value.trim();
    if (notas) lin.push(`Questions / comments from Bob:\n${notas}`);
    return ["Questionário Carvoeiro Bar (Bob van Goethem)", `VALOR MENSAL QUE ESTÁ DISPOSTO A INVESTIR: ${Number(valor.value)} €`, "", ...lin].join("\n").trim().slice(0, 2990);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = valida.email();
    if (erro) { aviso.textContent = erro; mail.focus(); return; }
    const botao = $("cb-enviar");
    const span = botao.querySelector("[data-i18n]");
    const original = span.textContent;
    botao.disabled = true; span.textContent = t("aEnviar");
    try {
      const r = await fetch("/api/contacto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respostas: { nome: "Bob van Goethem", email: mail.value.trim(), empresa: "Carvoeiro Bar Bob van Goethem", assunto: "projeto", mensagem: mensagem(), consentimento: true },
          idioma: idioma(), inicio, site_empresa: form.site_empresa.value,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error();
      form.hidden = true;
      document.querySelector("#cb-cartao .progresso").hidden = true;
      const ok = $("cb-sucesso");
      ok.hidden = false; ok.focus();
    } catch {
      aviso.textContent = t("erro");
    } finally {
      botao.disabled = false; span.textContent = original;
    }
  });

  mostrar(0);
})();
