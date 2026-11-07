/* Implement — formulário da página Contacto.
   Os campos e a validação vêm de perguntas.js (CONTACTO), os mesmos que o Worker usa em /api/contacto. */
import { CONTACTO, validarCampo, validarContacto } from "./perguntas.js?v=881589d3f5";

const T = {
  opcional: { en: "optional", pt: "opcional" },
  enviar: { en: "Send message", pt: "Enviar mensagem" },
  aEnviar: { en: "Sending…", pt: "A enviar…" },
  corrija: { en: "Some fields need your attention.", pt: "Alguns campos precisam da sua atenção." },
  falhou: { en: "We couldn’t send your message. Please try again, or write to info@heyimplement.com.", pt: "Não conseguimos enviar a mensagem. Tente novamente ou escreva para info@heyimplement.com." },
  semRede: { en: "No connection. Please try again in a moment.", pt: "Sem ligação. Tente novamente daqui a pouco." },
  semPermissao: { en: "In this preview, only people with Contributor access can send messages. On heyimplement.com it works for everyone.", pt: "Nesta pré-visualização, só quem tem acesso de Contribuidor pode enviar mensagens. Em heyimplement.com funciona para todos." },
  obrigado: { en: (n) => `Thank you${n ? ", " + n : ""}.`, pt: (n) => `Obrigado${n ? ", " + n : ""}.` },
  recebido: { en: "Your message reached info@heyimplement.com. We’ll reply by email, usually within one working day.", pt: "A sua mensagem chegou a info@heyimplement.com. Respondemos por e-mail, normalmente no prazo de um dia útil." },
  whatsapp: { en: "Need a faster answer? Talk to us on WhatsApp", pt: "Precisa de uma resposta mais rápida? Fale connosco pelo WhatsApp" },
};

const forma = document.getElementById("contacto");
const caixaCampos = document.getElementById("contacto-campos");
const aviso = document.getElementById("contacto-aviso");
const botao = document.getElementById("contacto-enviar");
const inicio = Date.now();
let aEnviar = false;

const idioma = () => (window.implementIdioma ? window.implementIdioma() : "en");
const t = (k, ...a) => { const v = T[k][idioma()]; return typeof v === "function" ? v(...a) : v; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function htmlCampo(c) {
  const id = `k-${c.id}`;
  const rotulo = `${esc(c[idioma()])}${c.obrigatorio ? "" : ` <span class="opcional">(${t("opcional")})</span>`}`;
  const erro = `<p class="erro-campo" id="${id}-erro" role="alert"></p>`;
  const req = c.obrigatorio ? ' required aria-required="true"' : "";
  const classe = `campo${c.largo ? " campo--largo" : ""}`;
  if (c.tipo === "consentimento") {
    return `<div class="${classe}" data-campo="${c.id}"><label class="consentimento"><input type="checkbox" id="${id}" name="${c.id}" value="sim" aria-describedby="${id}-erro"${req}><span>${esc(c[idioma()])}</span></label>${erro}</div>`;
  }
  let controlo;
  if (c.tipo === "area") controlo = `<textarea class="entrada" id="${id}" name="${c.id}" rows="6" maxlength="${c.max}" aria-describedby="${id}-erro"${req}></textarea>`;
  else if (c.tipo === "lista") controlo = `<select class="entrada" id="${id}" name="${c.id}" aria-describedby="${id}-erro"${req}><option value="">—</option>${c.opcoes.map((x) => `<option value="${esc(x.v)}">${esc(x[idioma()])}</option>`).join("")}</select>`;
  else {
    const tipo = c.tipo === "texto" ? "text" : c.tipo;
    controlo = `<input class="entrada" id="${id}" name="${c.id}" type="${tipo}" maxlength="${c.max}"${c.autocomplete ? ` autocomplete="${c.autocomplete}"` : ""} aria-describedby="${id}-erro"${req}>`;
  }
  return `<div class="${classe}" data-campo="${c.id}"><label class="campo__rotulo" for="${id}">${rotulo}</label>${controlo}${erro}</div>`;
}

function ler() {
  const r = {};
  for (const c of CONTACTO) {
    const el = forma.elements[c.id];
    if (!el) continue;
    r[c.id] = c.tipo === "consentimento" ? el.checked : el.value;
  }
  return r;
}

function desenhar() {
  const antes = caixaCampos.children.length ? ler() : {};
  caixaCampos.innerHTML = CONTACTO.map(htmlCampo).join("");
  for (const [k, v] of Object.entries(antes)) {
    const el = forma.elements[k];
    if (!el) continue;
    if (el.type === "checkbox") el.checked = v === true; else el.value = v;
  }
  if (!aEnviar) document.getElementById("contacto-enviar-texto").textContent = t("enviar");
}

function mostrarErro(c, erro) {
  const caixa = forma.querySelector(`[data-campo="${c.id}"]`);
  caixa.classList.toggle("com-erro", Boolean(erro));
  document.getElementById(`k-${c.id}-erro`).textContent = erro ? erro[idioma()] : "";
  const el = forma.elements[c.id];
  if (erro) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
}

function novaReferencia() {
  const letras = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return "MSG-" + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => letras[b % letras.length]).join("");
}

async function enviar(respostas) {
  const payload = { respostas, idioma: idioma(), inicio, site_empresa: forma.elements.site_empresa.value };
  if (window.claude && typeof window.claude.use === "function") {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) return { ok: false, semPermissao: true };
    const { limpas, erros, valido } = validarContacto(respostas);
    if (!valido) return { ok: false, erros };
    const referencia = novaReferencia();
    const agora = new Date().toISOString();
    try {
      const pessoa = db.doc(`mensagens/${uid}`);
      await pessoa.set({ atualizado: agora, nome: limpas.nome });
      await pessoa.collection("envios").doc(referencia).set({ referencia, criado_em: agora, idioma: payload.idioma, respostas: limpas });
      return { ok: true, referencia };
    } catch (e) {
      return { ok: false, semPermissao: e && e.code === "invalid_argument" };
    }
  }
  const r = await fetch("/api/contacto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const dados = await r.json().catch(() => ({}));
  if (r.ok && dados.ok) return { ok: true, referencia: dados.referencia };
  if (r.status === 400 && dados.erros) return { ok: false, erros: dados.erros };
  return { ok: false };
}

forma.addEventListener("input", (ev) => {
  const c = CONTACTO.find((x) => x.id === ev.target.name);
  if (c && forma.querySelector(`[data-campo="${c.id}"].com-erro`)) mostrarErro(c, validarCampo(c, ler()[c.id]).erro);
});

forma.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (aEnviar) return;
  const respostas = ler();
  let primeiro = null;
  for (const c of CONTACTO) {
    const r = validarCampo(c, respostas[c.id]);
    mostrarErro(c, r.erro);
    if (r.erro && !primeiro) primeiro = c;
  }
  aviso.textContent = primeiro ? t("corrija") : "";
  if (primeiro) { forma.elements[primeiro.id].focus(); return; }

  aEnviar = true;
  botao.disabled = true;
  document.getElementById("contacto-enviar-texto").textContent = t("aEnviar");
  try {
    const r = await enviar(respostas);
    if (r.ok) { sucesso(respostas.nome); return; }
    if (r.erros) {
      for (const [id, erro] of Object.entries(r.erros)) { const c = CONTACTO.find((x) => x.id === id); if (c) mostrarErro(c, erro); }
      aviso.textContent = t("corrija");
      return;
    }
    aviso.textContent = r.semPermissao ? t("semPermissao") : t("falhou");
  } catch (_) {
    aviso.textContent = navigator.onLine === false ? t("semRede") : t("falhou");
  } finally {
    aEnviar = false;
    botao.disabled = false;
    const texto = document.getElementById("contacto-enviar-texto");
    if (texto) texto.textContent = t("enviar");
  }
});

function sucesso(nome) {
  const primeiro = String(nome || "").trim().split(/\s+/)[0] || "";
  const cartao = document.getElementById("cartao");
  cartao.innerHTML = `<div class="sucesso" tabindex="-1" id="sucesso">
    <svg class="abelha-grande" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
    <h2>${esc(t("obrigado", primeiro))}</h2>
    <p>${esc(t("recebido"))}</p>
    <p><a class="ligacao-seta" href="https://wa.me/351962951161" rel="noopener" data-whatsapp>${esc(t("whatsapp"))}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a></p>
  </div>`;
  document.getElementById("sucesso").focus();
}

document.addEventListener("implement:idioma", desenhar);
desenhar();
