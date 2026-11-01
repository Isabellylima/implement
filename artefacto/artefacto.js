/* Só para a versão artefacto (claude.ai): navegação entre vistas por #hash e painel de pedidos.
   No site publicado no Cloudflare cada vista é uma página própria e este ficheiro não é usado. */
import { ETAPAS, textoResposta, visivel } from "./perguntas.js";

const VISTAS = ["inicio", "start-a-project", "em-breve", "pedidos"];
const vistas = Object.fromEntries(VISTAS.map((v) => [v, document.querySelector(`[data-vista="${v}"]`)]));
let podeVerPedidos = false;

function mostrar() {
  const alvo = decodeURIComponent(location.hash.slice(1));
  let vista = VISTAS.includes(alvo) ? alvo : "inicio";
  if (vista === "pedidos" && !podeVerPedidos) vista = "inicio";
  for (const [nome, el] of Object.entries(vistas)) if (el) el.hidden = nome !== vista;
  document.body.classList.toggle("pagina-projeto", vista === "start-a-project");
  document.querySelectorAll(".menu__lista a").forEach((a) => a.removeAttribute("aria-current"));
  if (vista === "inicio" && alvo && !VISTAS.includes(alvo)) {
    const el = document.getElementById(alvo);
    if (el) { requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" })); return; }
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (vista === "pedidos") carregarPedidos();
}
addEventListener("hashchange", mostrar);
mostrar();

/* ---------- Painel de pedidos (só dono e editores) ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const campos = ETAPAS.flatMap((e) => e.campos);
const campo = (id) => campos.find((c) => c.id === id);
const dataPT = (iso) => { try { return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }).format(new Date(iso)); } catch { return iso; } };

let db = null;
async function iniciar() {
  if (!window.claude || typeof window.claude.use !== "function") return;
  const user = await window.claude.use("user");
  podeVerPedidos = Boolean(user && (await user.canEdit()));
  if (!podeVerPedidos) return;
  db = await window.claude.use("db");
  document.querySelectorAll("[data-so-editores]").forEach((el) => { el.hidden = false; });
  if (location.hash === "#pedidos") mostrar();
}
iniciar();

async function carregarPedidos() {
  const lista = document.getElementById("pedidos-lista");
  const estado = document.getElementById("pedidos-estado");
  if (!lista) return;
  if (!db) { estado.textContent = "A base de dados não está disponível nesta vista."; return; }
  estado.textContent = "A carregar…";
  const espera = setTimeout(() => { estado.textContent = "Ainda não foi possível ler os pedidos. Tente Atualizar daqui a pouco."; }, 10000);
  try {
    const pessoas = await db.collection("pedidos").get();
    const envios = (await Promise.all(pessoas.docs.map((d) => db.doc(`pedidos/${d.id}`).collection("envios").get())))
      .flatMap((q) => q.docs.map((d) => d.data()))
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    clearTimeout(espera);
    estado.textContent = envios.length
      ? `${envios.length} ${envios.length === 1 ? "pedido" : "pedidos"}. O mais recente aparece primeiro.`
      : "Ainda não há pedidos. Quando alguém enviar o formulário, aparece aqui.";
    lista.innerHTML = envios.map(cartao).join("");
  } catch (e) {
    clearTimeout(espera);
    estado.textContent = "Não foi possível ler os pedidos (" + esc(e && e.code || "erro") + ").";
  }
}
document.addEventListener("click", (e) => { if (e.target.closest("#pedidos-atualizar")) carregarPedidos(); });

function cartao(p) {
  const r = p.respostas || {};
  const orcamento = [r.orcamento_mensal && textoResposta(campo("orcamento_mensal"), r.orcamento_mensal, "pt") + "/mês",
    r.orcamento_projeto && textoResposta(campo("orcamento_projeto"), r.orcamento_projeto, "pt") + " projeto"].filter(Boolean).join(" · ");
  const etiquetas = (r.servicos || []).map((s) => `<li>${esc(textoResposta(campo("servicos"), s, "pt"))}</li>`).join("");
  const blocos = ETAPAS.map((etapa) => {
    const linhas = etapa.campos.filter((c) => c.tipo !== "consentimento" && visivel(c, r) && r[c.id] !== undefined)
      .map((c) => `<dt>${esc(c.pt)}</dt><dd>${esc(textoResposta(c, r[c.id], "pt"))}</dd>`).join("");
    return linhas ? `<h3>${esc(etapa.pt)}</h3><dl>${linhas}</dl>` : "";
  }).join("");
  return `<details class="pedido">
    <summary>
      <span class="pedido__topo"><strong>${esc(r.empresa)}</strong><span class="pedido__ref">${esc(p.referencia)}</span></span>
      <span class="pedido__meta">${esc(r.nome)} · ${esc(r.email)} · ${esc(dataPT(p.criado_em))}</span>
      <span class="pedido__linha"><ul class="servico__etiquetas">${etiquetas}</ul>${orcamento ? `<span class="pedido__orcamento">${esc(orcamento)}</span>` : ""}</span>
    </summary>
    <div class="pedido__corpo">${blocos}</div>
  </details>`;
}
