/* Implement — tarefas da equipa (#/tarefas).
   Três colunas: Por fazer, A fazer, Feitas. O círculo marca como feita; "Começar" passa para A fazer. */

const PESSOA = { isabelly: "Isabelly", jessica: "Jessica", ambas: "Ambas" };
const COLUNAS = [
  { k: "por_fazer", t: "Por fazer" },
  { k: "a_fazer", t: "A fazer" },
  { k: "feita", t: "Feitas" },
];
const CHAVE_FILTRO = "implement-tarefas-filtro";
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dataCurta = (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
const opPessoa = (sel) => Object.entries(PESSOA).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v}</option>`).join("");

export async function vistaTarefas({ app, api, aviso, esc }) {
  let tarefas = (await api("tarefas")).tarefas;
  let filtro = "todas";
  try { filtro = localStorage.getItem(CHAVE_FILTRO) || "todas"; } catch (_) {}
  let editar = null;

  const visivel = (t) => filtro === "todas" || t.para_quem === filtro || t.para_quem === "ambas";
  const chip = (p) => `<span class="fin-pessoa fin-pessoa--${p}">${PESSOA[p] || ""}</span>`;

  function prazo(t) {
    if (!t.prazo) return "";
    const h = hoje();
    const k = t.estado !== "feita" && t.prazo < h ? "atrasada" : t.prazo === h ? "hoje" : "";
    return `<span class="tar-prazo${k ? ` tar-prazo--${k}` : ""}">${k === "atrasada" ? "Atrasada · " : k === "hoje" ? "Hoje · " : ""}${dataCurta(t.prazo)}</span>`;
  }

  function cartao(t) {
    if (editar === t.id) {
      return `<li class="tar-cartao tar-cartao--editar"><form class="tar-editar" data-id="${t.id}">
        <label>Tarefa<input class="entrada" name="titulo" maxlength="200" required value="${esc(t.titulo)}"></label>
        <label>Notas<textarea class="entrada" name="notas" rows="3" maxlength="2000">${esc(t.notas)}</textarea></label>
        <div class="tar-editar__linha">
          <label>Para quem<select class="entrada" name="para_quem">${opPessoa(t.para_quem)}</select></label>
          <label>Prazo<input class="entrada" type="date" name="prazo" value="${esc(t.prazo || "")}"></label>
        </div>
        <label class="tar-check"><input type="checkbox" name="prioridade"${t.prioridade ? " checked" : ""}> Prioritária</label>
        <div class="tar-editar__acoes">
          <button class="botao botao--pequeno" type="submit"><span>Guardar</span></button>
          <button class="tar-link" type="button" data-cancelar>Cancelar</button>
          <button class="tar-link tar-link--perigo" type="button" data-apagar="${t.id}">Apagar</button>
        </div>
      </form></li>`;
    }
    const feita = t.estado === "feita";
    const mover = t.estado === "por_fazer" ? `<button type="button" class="tar-mover" data-estado="a_fazer" data-id="${t.id}">Começar →</button>`
      : t.estado === "a_fazer" ? `<button type="button" class="tar-mover" data-estado="por_fazer" data-id="${t.id}">← Voltar</button>` : "";
    return `<li class="tar-cartao${feita ? " tar-cartao--feita" : ""}${t.prioridade && !feita ? " tar-cartao--prioridade" : ""}">
      <button type="button" class="tar-circulo" data-feita="${t.id}" aria-pressed="${feita}" aria-label="${feita ? "Desmarcar" : "Marcar como feita"}: ${esc(t.titulo)}"></button>
      <div class="tar-cartao__corpo">
        <button type="button" class="tar-titulo" data-editar="${t.id}" title="Editar">${t.prioridade && !feita ? '<span class="tar-urgente" aria-label="Prioritária">!</span> ' : ""}${esc(t.titulo)}</button>
        ${t.notas ? `<p class="tar-notas">${esc(t.notas)}</p>` : ""}
        <div class="tar-meta">${chip(t.para_quem)}${prazo(t)}${mover}</div>
      </div>
    </li>`;
  }

  function desenhar() {
    const lista = tarefas.filter(visivel);
    const n = (p) => tarefas.filter((t) => t.estado !== "feita" && (p === "todas" || t.para_quem === p || t.para_quem === "ambas")).length;
    app.innerHTML = `
      <div class="admin-cabeca">
        <div><p class="legenda">Equipa</p><h1>Tarefas</h1><p class="admin-cabeca__nota">O que há para fazer, quem trata e em que ponto está. Clique no círculo para marcar como feita e no título para editar.</p></div>
      </div>
      <form class="tar-nova fin-cartao" id="tar-nova">
        <input class="entrada tar-nova__titulo" name="titulo" maxlength="200" required placeholder="Nova tarefa… (ex.: Publicar reel do cliente X)" aria-label="Nova tarefa">
        <label>Para quem<select class="entrada" name="para_quem">${opPessoa(filtro === "todas" ? "ambas" : filtro)}</select></label>
        <label><span>Prazo <span class="opcional">(opcional)</span></span><input class="entrada" type="date" name="prazo"></label>
        <button class="botao" type="submit"><span>Adicionar</span></button>
      </form>
      <div class="tar-filtros" role="group" aria-label="Mostrar tarefas de">
        ${[["todas", "Todas"], ["isabelly", "Isabelly"], ["jessica", "Jessica"]].map(([k, v]) => `<button type="button" data-filtro="${k}" aria-pressed="${filtro === k}">${v} <span>${n(k)}</span></button>`).join("")}
      </div>
      <div class="tar-quadro">
        ${COLUNAS.map((c) => {
          const l = lista.filter((t) => t.estado === c.k);
          return `<section class="tar-coluna tar-coluna--${c.k}" aria-labelledby="col-${c.k}">
            <h2 id="col-${c.k}">${c.t} <span>${l.length}</span></h2>
            ${l.length ? `<ul class="tar-lista">${l.map(cartao).join("")}</ul>` : `<p class="tar-vazio">${c.k === "feita" ? "Ainda nada concluído." : c.k === "a_fazer" ? "Nada em curso." : "Tudo em dia 🐝"}</p>`}
            ${c.k === "feita" && l.length ? `<p class="tar-rodape">As tarefas feitas há mais de 60 dias saem desta lista.</p>` : ""}
          </section>`;
        }).join("")}
      </div>`;
  }

  async function recarregar() { tarefas = (await api("tarefas")).tarefas; desenhar(); }
  async function mudar(id, dados) {
    const t = tarefas.find((x) => x.id === id);
    Object.assign(t, dados); desenhar(); // resposta imediata
    try { await api("tarefas/" + id, { method: "PUT", body: JSON.stringify(dados) }); }
    catch (e) { aviso(e.message, "erro"); }
    await recarregar();
  }

  app.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const d = Object.fromEntries(new FormData(f));
    try {
      if (f.id === "tar-nova") {
        await api("tarefas", { method: "POST", body: JSON.stringify(d) });
        aviso("Tarefa adicionada.");
        await recarregar();
        app.querySelector(".tar-nova__titulo").focus();
      } else if (f.classList.contains("tar-editar")) {
        d.prioridade = f.prioridade.checked;
        await api("tarefas/" + f.dataset.id, { method: "PUT", body: JSON.stringify(d) });
        editar = null; aviso("Guardado."); await recarregar();
      }
    } catch (e) { aviso(e.message, "erro"); }
  };

  app.onclick = async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.filtro) { filtro = b.dataset.filtro; try { localStorage.setItem(CHAVE_FILTRO, filtro); } catch (_) {} desenhar(); }
    else if (b.dataset.feita) { const t = tarefas.find((x) => x.id === b.dataset.feita); await mudar(t.id, { estado: t.estado === "feita" ? "por_fazer" : "feita" }); }
    else if (b.dataset.estado) await mudar(b.dataset.id, { estado: b.dataset.estado });
    else if (b.dataset.editar) { editar = b.dataset.editar; desenhar(); app.querySelector(".tar-editar [name=titulo]")?.focus(); }
    else if ("cancelar" in b.dataset) { editar = null; desenhar(); }
    else if (b.dataset.apagar) {
      if (!confirm("Apagar esta tarefa?")) return;
      try { await api("tarefas/" + b.dataset.apagar, { method: "DELETE" }); editar = null; aviso("Tarefa apagada."); await recarregar(); }
      catch (e) { aviso(e.message, "erro"); }
    }
  };

  desenhar();
}
