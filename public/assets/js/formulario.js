/* Implement — formulário «Start a Project» por etapas.
   As perguntas e as regras de validação vêm de perguntas.js (as mesmas que o Worker usa). */
import { ETAPAS, GRUPOS, visivel, validarCampo, validarTudo, textoResposta } from "./perguntas.js";

const CHAVE = "implement:projeto:v1";
const T = {
  passo: { en: (a, b) => `Step ${a} of ${b}`, pt: (a, b) => `Passo ${a} de ${b}` },
  continuar: { en: "Continue", pt: "Continuar" },
  enviar: { en: "Send my answers", pt: "Enviar respostas" },
  aEnviar: { en: "Sending…", pt: "A enviar…" },
  opcional: { en: "optional", pt: "opcional" },
  rever: { en: "Review your answers", pt: "Rever as respostas" },
  editar: { en: "Edit", pt: "Editar" },
  corrija: { en: "Some answers need your attention.", pt: "Algumas respostas precisam da sua atenção." },
  falhou: { en: "We couldn’t send your answers. Please try again, or write to info@heyimplement.com.", pt: "Não conseguimos enviar as respostas. Tente novamente ou escreva para info@heyimplement.com." },
  semPermissao: { en: "In this preview, only people with Contributor access or above can send the form. On heyimplement.com it works for everyone.", pt: "Nesta pré-visualização, só quem tem acesso de Contribuidor ou superior pode enviar o formulário. Em heyimplement.com funciona para todos." },
  semRede: { en: "No connection. Your answers are saved — try again in a moment.", pt: "Sem ligação. As respostas estão guardadas — tente novamente daqui a pouco." },
  obrigado: { en: (n) => `Thank you${n ? ", " + n : ""}.`, pt: (n) => `Obrigado${n ? ", " + n : ""}.` },
  recebido: { en: "Your answers are with us. Here is what happens next:", pt: "As suas respostas já estão connosco. Eis o que acontece a seguir:" },
  ref: { en: "Reference", pt: "Referência" },
  s1t: { en: "We review your answers", pt: "Analisamos as respostas" }, s1p: { en: "A person on our team reads everything you wrote.", pt: "Uma pessoa da equipa lê tudo o que escreveu." },
  s2t: { en: "We get in touch", pt: "Entramos em contacto" }, s2p: { en: "Using the contact method you chose, to arrange a short conversation.", pt: "Pelo meio que escolheu, para marcarmos uma conversa curta." },
  s3t: { en: "You receive a proposal", pt: "Recebe uma proposta" }, s3p: { en: "Clear, with what is included and what is not.", pt: "Clara, com o que está incluído e o que não está." },
  voltarInicio: { en: "Back to the homepage", pt: "Voltar ao início" },
};

const forma = document.getElementById("formulario");
const corpo = document.getElementById("form-corpo");
const botaoSeguinte = document.getElementById("seguinte");
const textoSeguinte = document.getElementById("seguinte-texto");
const botaoVoltar = document.getElementById("voltar");

let estado = carregar();
let etapa = Math.min(estado.etapa || 0, ETAPAS.length - 1);
let aEnviar = false;

const idioma = () => (window.implementIdioma ? window.implementIdioma() : "en");
const t = (chave, ...args) => { const v = T[chave][idioma()]; return typeof v === "function" ? v(...args) : v; };
const l = (obj, base = "") => obj[(base || "") + idioma()] ?? obj[(base || "") + "en"] ?? "";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function carregar() {
  try { const e = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (e && e.respostas) return e; } catch (_) {}
  return { respostas: {}, etapa: 0, inicio: Date.now() };
}
function guardar() {
  try { localStorage.setItem(CHAVE, JSON.stringify({ ...estado, etapa })); } catch (_) {}
}

/* ---------- Desenhar campos ---------- */
function htmlCampo(c) {
  const id = `c-${c.id}`;
  const ajuda = l(c, "h");
  const opc = c.obrigatorio ? "" : ` <span class="opcional">(${t("opcional")})</span>`;
  const descr = `${ajuda ? `${id}-ajuda ` : ""}${id}-erro`;
  const rotulo = (tag) => `<${tag} class="campo__rotulo"${tag === "label" ? ` for="${id}"` : ""}>${esc(l(c))}${opc}</${tag}>`;
  const ajudaHtml = ajuda ? `<p class="campo__ajuda" id="${id}-ajuda">${esc(ajuda)}</p>` : "";
  const erro = `<p class="erro-campo" id="${id}-erro" role="alert"></p>`;
  const classes = `campo${c.largo ? " campo--largo" : ""}`;
  const attrs = `data-campo="${c.id}"${c.mostrarSe ? " data-condicional" : ""}`;
  const req = c.obrigatorio ? " required aria-required=\"true\"" : "";

  switch (c.tipo) {
    case "texto": case "email": case "tel": case "url": {
      const tipo = c.tipo === "texto" ? "text" : c.tipo;
      const marca = l(c, "a");
      return `<div class="${classes}" ${attrs}>${rotulo("label")}${ajudaHtml}
        <input class="entrada" id="${id}" name="${c.id}" type="${tipo}"${c.max ? ` maxlength="${c.max}"` : ""}${c.autocomplete ? ` autocomplete="${c.autocomplete}"` : ""}${marca ? ` placeholder="${esc(marca)}"` : ""}${c.tipo === "email" ? ' inputmode="email" spellcheck="false"' : ""}${c.tipo === "tel" ? ' inputmode="tel"' : ""} aria-describedby="${descr}"${req}>${erro}</div>`;
    }
    case "area":
      return `<div class="${classes}" ${attrs}>${rotulo("label")}${ajudaHtml}
        <textarea class="entrada" id="${id}" name="${c.id}" rows="${c.linhas || 4}"${c.max ? ` maxlength="${c.max}"` : ""} aria-describedby="${descr}"${req}></textarea>${erro}</div>`;
    case "lista":
      return `<div class="${classes}" ${attrs}>${rotulo("label")}${ajudaHtml}
        <select class="entrada" id="${id}" name="${c.id}" aria-describedby="${descr}"${req}><option value="">—</option>
        ${c.opcoes.map((x) => `<option value="${esc(x.v)}">${esc(x[idioma()])}</option>`).join("")}</select>${erro}</div>`;
    case "unica": case "multipla": {
      const tipo = c.tipo === "unica" ? "radio" : "checkbox";
      return `<fieldset class="${classes}" ${attrs} aria-describedby="${descr}">${rotulo("legend")}${ajudaHtml}
        <div class="opcoes">${c.opcoes.map((x, i) => `<label class="opcao"><input type="${tipo}" name="${c.id}" value="${esc(x.v)}" id="${id}-${i}"><span>${esc(x[idioma()])}</span></label>`).join("")}</div>${erro}</fieldset>`;
    }
    case "servicos":
      return `<fieldset class="${classes}" ${attrs} aria-describedby="${descr}">${rotulo("legend")}
        <div class="servicos-escolha">${c.opcoes.map((x, i) => `<label class="opcao"><input type="checkbox" name="${c.id}" value="${esc(x.v)}" id="${id}-${i}">
          <span><svg aria-hidden="true"><use href="assets/img/sprite.svg#${x.icone}"/></svg><strong>${esc(x[idioma()])}</strong><small>${esc(x["d" + idioma()])}</small></span></label>`).join("")}</div>${erro}</fieldset>`;
    case "consentimento":
      return `<div class="${classes}" ${attrs}><label class="consentimento"><input type="checkbox" id="${id}" name="${c.id}" value="sim" aria-describedby="${id}-erro"${req}><span>${esc(l(c))}</span></label>${erro}</div>`;
  }
  return "";
}

function htmlEtapa(e, indice) {
  const partes = [];
  let grupoAtual = null;
  for (const c of e.campos) {
    if (c.grupo !== grupoAtual) {
      if (grupoAtual) partes.push("</div></div>");
      if (c.grupo) {
        const g = GRUPOS[c.grupo];
        partes.push(`<div class="grupo-condicional" data-grupo="${c.grupo}"><h3><svg aria-hidden="true"><use href="assets/img/sprite.svg#${g.icone}"/></svg>${esc(l(g))}</h3><div class="campos">`);
      }
      grupoAtual = c.grupo || null;
    }
    partes.push(htmlCampo(c));
  }
  if (grupoAtual) partes.push("</div></div>");
  const resumo = indice === ETAPAS.length - 1 ? `<div class="campo campo--largo"><p class="campo__rotulo">${t("rever")}</p><div class="resumo" id="resumo"></div></div>` : "";
  return `<fieldset class="etapa" data-etapa="${indice}" hidden aria-labelledby="t-etapa-${indice}">
    <legend class="etapa__titulo" id="t-etapa-${indice}" tabindex="-1">${esc(l(e))}</legend>
    <p class="etapa__intro">${esc(l(e, "i"))}</p>
    <div class="campos">${partes.join("")}${resumo}</div>
    <p class="aviso-erro" aria-live="polite"></p>
  </fieldset>`;
}

function desenhar() {
  corpo.innerHTML = ETAPAS.map(htmlEtapa).join("");
  document.getElementById("etapas-lista").innerHTML = ETAPAS.map((e) => `<li>${esc(l(e))}</li>`).join("");
  repor();
  atualizarCondicionais();
  mostrarEtapa(etapa, null, false);
}

/* ---------- Ler e repor valores ---------- */
function lerCampo(c) {
  if (c.tipo === "multipla" || c.tipo === "servicos") return [...forma.querySelectorAll(`[name="${c.id}"]:checked`)].map((x) => x.value);
  if (c.tipo === "unica") { const x = forma.querySelector(`[name="${c.id}"]:checked`); return x ? x.value : ""; }
  if (c.tipo === "consentimento") return forma.querySelector(`[name="${c.id}"]`).checked;
  const el = forma.querySelector(`[name="${c.id}"]`);
  return el ? el.value : "";
}
function repor() {
  for (const e of ETAPAS) for (const c of e.campos) {
    const v = estado.respostas[c.id];
    if (v === undefined) continue;
    if (Array.isArray(v) || c.tipo === "unica") {
      const lista = Array.isArray(v) ? v : [v];
      forma.querySelectorAll(`[name="${c.id}"]`).forEach((x) => { x.checked = lista.includes(x.value); });
    } else if (c.tipo === "consentimento") {
      const x = forma.querySelector(`[name="${c.id}"]`); if (x) x.checked = v === true;
    } else {
      const x = forma.querySelector(`[name="${c.id}"]`); if (x) x.value = v;
    }
  }
}
function campoPorNome(nome) { for (const e of ETAPAS) for (const c of e.campos) if (c.id === nome) return c; return null; }

/* ---------- Condicionais ---------- */
function atualizarCondicionais() {
  forma.querySelectorAll("[data-grupo]").forEach((g) => {
    g.hidden = !visivel({ grupo: g.dataset.grupo }, estado.respostas);
  });
  forma.querySelectorAll("[data-condicional]").forEach((el) => {
    el.hidden = !visivel(campoPorNome(el.dataset.campo), estado.respostas);
  });
}

/* ---------- Validação de uma etapa ---------- */
function mostrarErro(c, erro) {
  const caixa = forma.querySelector(`[data-campo="${c.id}"]`);
  const p = document.getElementById(`c-${c.id}-erro`);
  if (!caixa || !p) return;
  caixa.classList.toggle("com-erro", Boolean(erro));
  p.textContent = erro ? erro[idioma()] : "";
  forma.querySelectorAll(`[name="${c.id}"]`).forEach((x) => (erro ? x.setAttribute("aria-invalid", "true") : x.removeAttribute("aria-invalid")));
}
function validarEtapa(indice) {
  let primeiro = null;
  for (const c of ETAPAS[indice].campos) {
    if (!visivel(c, estado.respostas)) { mostrarErro(c, null); continue; }
    const r = validarCampo(c, estado.respostas[c.id]);
    mostrarErro(c, r.erro);
    if (r.erro && !primeiro) primeiro = c;
  }
  const aviso = forma.querySelector(`[data-etapa="${indice}"] .aviso-erro`);
  aviso.textContent = primeiro ? t("corrija") : "";
  if (primeiro) {
    const alvo = forma.querySelector(`[name="${primeiro.id}"]`);
    alvo && alvo.focus({ preventScroll: true });
    forma.querySelector(`[data-campo="${primeiro.id}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return !primeiro;
}

/* ---------- Navegação ---------- */
function mostrarEtapa(nova, direcao, focar = true) {
  etapa = nova;
  forma.querySelectorAll(".etapa").forEach((f) => {
    const ativa = Number(f.dataset.etapa) === nova;
    f.hidden = !ativa;
    f.classList.remove("a-entrar", "a-voltar");
    if (ativa && direcao) { void f.offsetWidth; f.classList.add(direcao === "frente" ? "a-entrar" : "a-voltar"); }
  });
  const ultima = nova === ETAPAS.length - 1;
  if (ultima) desenharResumo();
  textoSeguinte.textContent = ultima ? t("enviar") : t("continuar");
  botaoVoltar.hidden = nova === 0;
  document.getElementById("progresso-nome").textContent = l(ETAPAS[nova]);
  document.getElementById("progresso-passo").textContent = t("passo", nova + 1, ETAPAS.length);
  const fracao = nova / (ETAPAS.length - 1);
  document.getElementById("progresso-enchido").style.width = `${Math.max(fracao * 100, 3)}%`;
  document.getElementById("progresso-abelha").style.left = `${Math.max(fracao * 100, 3)}%`;
  document.querySelectorAll("#etapas-lista li").forEach((li, i) => { li.dataset.estado = i < nova ? "feito" : i === nova ? "atual" : ""; });
  guardar();
  if (focar) {
    document.getElementById("cartao").scrollIntoView({ behavior: "smooth", block: "start" });
    const titulo = document.getElementById(`t-etapa-${nova}`);
    titulo && titulo.focus({ preventScroll: true });
  }
}

function desenharResumo() {
  const caixa = document.getElementById("resumo");
  if (!caixa) return;
  caixa.innerHTML = ETAPAS.slice(0, -1).map((e, i) => {
    const linhas = e.campos.filter((c) => visivel(c, estado.respostas)).map((c) => {
      const v = textoResposta(c, estado.respostas[c.id], idioma());
      return v ? `<dt>${esc(l(c))}</dt><dd>${esc(v)}</dd>` : "";
    }).join("");
    return `<details><summary>${esc(l(e))}<button type="button" data-ir="${i}">${t("editar")}</button></summary><dl>${linhas}</dl></details>`;
  }).join("");
}

/* ---------- Envio ---------- */
async function enviar() {
  if (aEnviar) return;
  for (let i = 0; i < ETAPAS.length; i++) {
    if (!validarEtapa(i)) { if (i !== etapa) { mostrarEtapa(i, "tras"); validarEtapa(i); } return; }
  }
  aEnviar = true;
  botaoSeguinte.disabled = true;
  textoSeguinte.textContent = t("aEnviar");
  const aviso = forma.querySelector(`[data-etapa="${etapa}"] .aviso-erro`);
  aviso.textContent = "";
  try {
    const payload = { respostas: estado.respostas, idioma: idioma(), inicio: estado.inicio, site_empresa: forma.elements.site_empresa.value };
    const r = await enviarPedido(payload);
    if (r.ok) { sucesso(r.referencia); return; }
    if (r.erros) {
      for (const [id, erro] of Object.entries(r.erros)) {
        const c = campoPorNome(id); if (!c) continue;
        const i = ETAPAS.findIndex((e) => e.campos.includes(c));
        mostrarEtapa(i, "tras"); mostrarErro(c, erro); break;
      }
      return;
    }
    aviso.textContent = r.semPermissao ? t("semPermissao") : t("falhou");
  } catch (_) {
    aviso.textContent = navigator.onLine === false ? t("semRede") : t("falhou");
  } finally {
    aEnviar = false;
    botaoSeguinte.disabled = false;
    if (etapa === ETAPAS.length - 1) textoSeguinte.textContent = t("enviar");
  }
}

/* ---------- Para onde vão as respostas ----------
   No site publicado (Cloudflare): para a API do Worker, que guarda na base de dados D1.
   Dentro do artefacto do claude.ai (pré-visualização): para a base de dados do próprio artefacto. */
function novaReferencia() {
  const letras = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return "IMP-" + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => letras[b % letras.length]).join("");
}
async function enviarPedido(payload) {
  if (window.claude && typeof window.claude.use === "function") {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) return { ok: false, semPermissao: true };
    const { limpas, erros, valido } = validarTudo(payload.respostas);
    if (!valido) return { ok: false, erros };
    const referencia = novaReferencia();
    const agora = new Date().toISOString();
    try {
      const pessoa = db.doc(`pedidos/${uid}`);
      await pessoa.set({ atualizado: agora, empresa: limpas.empresa || "" });
      await pessoa.collection("envios").doc(referencia).set({ referencia, criado_em: agora, idioma: payload.idioma, respostas: limpas });
      return { ok: true, referencia };
    } catch (e) {
      return { ok: false, semPermissao: e && e.code === "invalid_argument" };
    }
  }
  const r = await fetch("/api/start-a-project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const dados = await r.json().catch(() => ({}));
  if (r.ok && dados.ok) return { ok: true, referencia: dados.referencia };
  if (r.status === 400 && dados.erros) return { ok: false, erros: dados.erros };
  return { ok: false };
}

function sucesso(referencia) {
  const nome = String(estado.respostas.nome || "").trim().split(/\s+/)[0] || "";
  try { localStorage.removeItem(CHAVE); } catch (_) {}
  const cartao = document.getElementById("cartao");
  cartao.innerHTML = `<div class="sucesso" tabindex="-1" id="sucesso">
    <svg class="abelha-grande" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
    <h2>${esc(t("obrigado", nome))}</h2>
    <p>${esc(t("recebido"))}</p>
    <ol class="depois">
      <li><span><strong>${esc(t("s1t"))}</strong>${esc(t("s1p"))}</span></li>
      <li><span><strong>${esc(t("s2t"))}</strong>${esc(t("s2p"))}</span></li>
      <li><span><strong>${esc(t("s3t"))}</strong>${esc(t("s3p"))}</span></li>
    </ol>
    ${referencia ? `<p class="referencia">${esc(t("ref"))}: ${esc(referencia)}</p>` : ""}
    <p><a class="ligacao-seta" href="index.html">${esc(t("voltarInicio"))}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a></p>
  </div>`;
  cartao.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("sucesso").focus({ preventScroll: true });
}

/* ---------- Eventos ---------- */
forma.addEventListener("input", (ev) => {
  const c = campoPorNome(ev.target.name);
  if (!c) return;
  estado.respostas[c.id] = lerCampo(c);
  if (forma.querySelector(`[data-campo="${c.id}"].com-erro`)) mostrarErro(c, validarCampo(c, estado.respostas[c.id]).erro);
  atualizarCondicionais();
  guardar();
});

forma.addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (etapa === ETAPAS.length - 1) { enviar(); return; }
  if (validarEtapa(etapa)) mostrarEtapa(etapa + 1, "frente");
});
botaoVoltar.addEventListener("click", () => { if (etapa > 0) mostrarEtapa(etapa - 1, "tras"); });
corpo.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-ir]");
  if (!b) return;
  ev.preventDefault();
  mostrarEtapa(Number(b.dataset.ir), "tras");
});
document.addEventListener("implement:idioma", desenhar);

/* Primeiro desenho: site.js já aplicou o idioma antes deste módulo correr */
desenhar();
