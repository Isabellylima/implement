/* Implement — gestão de clientes (#/clientes, #/clientes/novo, #/clientes/<id>).
   Cada cliente tem: dados e pacotes, acesso ao painel privado (/cliente/<endereço>, palavra-passe gerada aqui),
   checklist do mês, campanhas de anúncios (Meta, Google Ads…) com o valor investido e seguidores por rede. */

const REDES = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", google: "Google (perfil da empresa)", pinterest: "Pinterest", x: "X" };
const PLAT = { meta: "Meta (Facebook/Instagram)", google: "Google Ads", tiktok: "TikTok Ads", linkedin: "LinkedIn Ads", outra: "Outra" };
const PLAT_CURTA = { meta: "Meta", google: "Google Ads", tiktok: "TikTok", linkedin: "LinkedIn", outra: "Ads" };
const ESTADOS = { planeada: "Planeada", ativa: "Ativa", pausada: "Pausada", terminada: "Terminada" };
const eur = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("pt-PT", { style: "currency", currency: "EUR" }));
const num = (v) => Number(v || 0).toLocaleString("pt-PT");
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const mesAntes = (m) => { const [a, b] = m.split("-").map(Number); const d = new Date(Date.UTC(a, b - 2, 1)); return d.toISOString().slice(0, 7); };
const nomeMes = (m) => new Date(m + "-15T12:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
const dataCurta = (d) => (d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "");
const slugDe = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
const opcoes = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v}</option>`).join("");

export async function vistaClientes(h, ctx) {
  if (h === "/clientes" || h === "/clientes/") return lista(ctx);
  if (h === "/clientes/novo") return formulario(ctx, null);
  return detalhe(ctx, h.slice(10).split("?")[0]);
}

/* ---------- Lista ---------- */
async function lista({ app, api, esc }) {
  const { clientes, mes } = await api("clientes");
  const ativos = clientes.filter((c) => c.ativo);
  const totalMensal = ativos.reduce((s, c) => s + (Number(c.valor_mensal) || 0), 0);
  const comCampanha = ativos.filter((c) => c.campanhas_ativas > 0);
  app.innerHTML = `
    <div class="admin-cabeca">
      <div><p class="legenda">Clientes</p><h1>Gestão de clientes</h1>
      <p class="admin-cabeca__nota">Pacotes, checklist de ${esc(nomeMes(mes))}, campanhas de anúncios e o acesso de cada cliente ao seu painel.</p></div>
      <div class="admin-cabeca__acoes"><a class="botao" href="#/clientes/novo"><span>Novo cliente</span></a>
      <a class="botao botao--secundario" href="/cliente/modelo" target="_blank" rel="noopener"><span>Ver o modelo do painel ↗︎</span></a></div>
    </div>
    <div class="cl-resumo">
      <div class="fin-cartao"><span>Clientes ativos</span><strong>${ativos.length}</strong></div>
      <div class="fin-cartao"><span>Mensalidades</span><strong>${eur(totalMensal)}</strong></div>
      <div class="fin-cartao${comCampanha.length ? " cl-resumo--alerta" : ""}"><span>Com campanha ativa</span><strong>${comCampanha.length}</strong></div>
    </div>
    ${clientes.length ? `<ul class="cl-lista">${clientes.map((c) => {
      const pct = c.tarefas ? Math.round(c.feitas / c.tarefas * 100) : 0;
      return `<li><a class="cl-cartao${c.ativo ? "" : " cl-cartao--inativo"}" href="#/clientes/${c.id}">
        <div class="cl-cartao__topo"><strong>${esc(c.marca)}</strong>${c.ativo ? "" : '<span class="cl-etiqueta">Inativo</span>'}</div>
        ${c.nome ? `<span class="cl-cartao__nome">${esc(c.nome)}</span>` : ""}
        ${c.pacotes ? `<span class="cl-cartao__pacote">${esc(c.pacotes.split("\n")[0])}</span>` : ""}
        <div class="cl-cartao__meta">
          ${c.valor_mensal ? `<span>${eur(c.valor_mensal)}/mês</span>` : ""}
          <span>${c.tarefas ? `${c.feitas}/${c.tarefas} tarefas` : "Sem checklist este mês"}</span>
        </div>
        ${c.tarefas ? `<div class="pc-barra"><i data-pct="${pct}"></i></div>` : ""}
        ${c.campanhas_ativas ? `<span class="cl-campanha">📣 ${esc((c.plataformas_ativas || "").split(",").map((p) => PLAT_CURTA[p] || p).join(" + "))} · ${eur(c.investido_ativas)} investidos</span>` : ""}
        <span class="cl-cartao__acesso">${c.tem_senha ? (c.ultimo_acesso ? `Último acesso: ${dataCurta(c.ultimo_acesso)}` : "Acesso criado, ainda sem entradas") : "Sem palavra-passe"}</span>
      </a></li>`;
    }).join("")}</ul>` : `<div class="admin-vazio"><h2>Ainda não há clientes</h2><p>Crie o primeiro e gere a palavra-passe para lhe enviar.</p></div>`}`;
  app.querySelectorAll("[data-pct]").forEach((i) => { i.style.width = i.dataset.pct + "%"; });
}

/* ---------- Criar / editar dados ---------- */
function camposCliente(c, esc) {
  const redes = c.redes && c.redes.length ? c.redes : [{ rede: "instagram", conta: "", url: "" }];
  return `
    <div class="cl-campos">
      <label>Marca<input class="entrada" name="marca" required maxlength="120" value="${esc(c.marca || "")}"></label>
      <label>Pessoa de contacto<input class="entrada" name="nome" maxlength="120" value="${esc(c.nome || "")}"></label>
      <label>E-mail<input class="entrada" type="email" name="email" maxlength="200" value="${esc(c.email || "")}"></label>
      <label>Telefone<input class="entrada" name="telefone" maxlength="40" value="${esc(c.telefone || "")}"></label>
      <label>Endereço do painel<span class="cl-prefixo"><span>heyimplement.com/cliente/</span><input class="entrada" name="slug" required maxlength="50" pattern="[a-z0-9-]+" value="${esc(c.slug || "")}"></span></label>
      <label>Idioma do painel<select class="entrada" name="idioma">${opcoes({ pt: "Português", en: "English" }, c.idioma || "pt")}</select></label>
      <label class="cl-largo">Pacotes contratados <small>(uma linha por pacote; o cliente vê esta lista)</small><textarea class="entrada" name="pacotes" rows="3" maxlength="1000">${esc(c.pacotes || "")}</textarea></label>
      <label>Mensalidade (€)<input class="entrada" type="number" step="0.01" min="0" name="valor_mensal" value="${c.valor_mensal ?? ""}"></label>
      <label>Cliente desde<input class="entrada" type="date" name="inicio" value="${esc(c.inicio || "")}"></label>
      <label>ID da marca no Metricool <small>(opcional)</small><input class="entrada" name="metricool_id" maxlength="30" inputmode="numeric" value="${esc(c.metricool_id || "")}"></label>
      <label class="cl-check"><input type="checkbox" name="ativo"${c.ativo === 0 ? "" : " checked"}> Cliente ativo (desativar bloqueia o painel)</label>
      <fieldset class="cl-largo cl-redes"><legend>Redes que gerimos</legend>
        <div id="cl-redes-linhas">${redes.map((r, i) => linhaRede(r, i, esc)).join("")}</div>
        <button type="button" class="tar-link" data-mais-rede>+ Adicionar rede</button>
      </fieldset>
      <label class="cl-largo">Notas internas <small>(o cliente não vê)</small><textarea class="entrada" name="notas" rows="3" maxlength="4000">${esc(c.notas || "")}</textarea></label>
    </div>`;
}
const linhaRede = (r, i, esc) => `<div class="cl-rede-linha">
  <select class="entrada" name="rede_${i}" aria-label="Rede">${opcoes(REDES, r.rede)}</select>
  <input class="entrada" name="conta_${i}" placeholder="@conta ou nome" maxlength="120" value="${esc(r.conta || "")}" aria-label="Conta">
  <input class="entrada" name="url_${i}" placeholder="https://… (opcional)" maxlength="300" value="${esc(r.url || "")}" aria-label="Link">
  <button type="button" class="tar-link tar-link--perigo" data-tirar-rede aria-label="Tirar esta rede">✕</button>
</div>`;

function lerCliente(f) {
  const d = Object.fromEntries(new FormData(f));
  const redes = [];
  f.querySelectorAll(".cl-rede-linha").forEach((l) => {
    const [s, c, u] = l.querySelectorAll("select, input");
    redes.push({ rede: s.value, conta: c.value, url: u.value });
  });
  return { ...d, ativo: f.ativo.checked, redes };
}

function ligarRedes(app, esc) {
  return (ev) => {
    const b = ev.target.closest("button");
    if (!b) return false;
    if ("maisRede" in b.dataset) {
      const caixa = app.querySelector("#cl-redes-linhas");
      caixa.insertAdjacentHTML("beforeend", linhaRede({ rede: "facebook" }, caixa.children.length + Date.now() % 1000, esc));
      return true;
    }
    if ("tirarRede" in b.dataset) { b.closest(".cl-rede-linha").remove(); return true; }
    return false;
  };
}

async function formulario({ app, api, aviso, esc }) {
  app.innerHTML = `
    <div class="admin-cabeca"><div><p class="legenda"><a href="#/clientes">Clientes</a></p><h1>Novo cliente</h1>
    <p class="admin-cabeca__nota">Depois de guardar, gere a palavra-passe e envie-a ao cliente por e-mail.</p></div></div>
    <form class="fin-cartao cl-forma" id="cl-forma">${camposCliente({}, esc)}
      <div class="cl-acoes"><button class="botao" type="submit"><span>Criar cliente</span></button><a class="tar-link" href="#/clientes">Cancelar</a></div>
    </form>`;
  const f = app.querySelector("#cl-forma");
  f.marca.addEventListener("input", () => { if (!f.slug.dataset.mexido) f.slug.value = slugDe(f.marca.value); });
  f.slug.addEventListener("input", () => { f.slug.dataset.mexido = "1"; });
  const redes = ligarRedes(app, esc);
  app.onclick = (ev) => { redes(ev); };
  app.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const r = await api("clientes", { method: "POST", body: JSON.stringify(lerCliente(f)) });
      aviso("Cliente criado.");
      location.hash = "#/clientes/" + r.id;
    } catch (e) { aviso(e.message, "erro"); }
  };
}

/* ---------- Ficha do cliente ---------- */
async function detalhe({ app, api, aviso, esc }, id) {
  let mes = new URLSearchParams(location.hash.split("?")[1] || "").get("mes") || null;
  let d;
  let editarCampanha = null;
  let editarDados = false;
  let senhaNova = null;

  async function carregar() { d = await api(`clientes/${id}${mes ? "?mes=" + mes : ""}`); mes = d.mes; }

  function emailSenha() {
    const c = d.cliente;
    const link = `https://heyimplement.com/cliente/${c.slug}`;
    const primeiro = (c.nome || "").split(" ")[0];
    const [assunto, corpo] = c.idioma === "en"
      ? [`Your client area at Implement`, `Hello${primeiro ? " " + primeiro : ""},\n\nYour private client area is ready. There you can follow your social media followers, any ad campaigns we run and the progress of each month.\n\nLink: ${link}\nPassword: ${senhaNova}\n\nPlease keep the link and the password private.\n\nBest regards,\nImplement Digital Marketing`]
      : [`A sua área de cliente na Implement`, `Olá${primeiro ? " " + primeiro : ""},\n\nA sua área de cliente já está disponível. Lá pode acompanhar os seguidores das suas redes, as campanhas de anúncios que gerimos e o progresso de cada mês.\n\nLink: ${link}\nPalavra-passe: ${senhaNova}\n\nPor favor, não partilhe o link nem a palavra-passe.\n\nObrigada,\nImplement Digital Marketing`];
    return `mailto:${encodeURIComponent(c.email || "")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  }

  function blocoAcesso() {
    const c = d.cliente;
    const link = `${location.origin}/cliente/${c.slug}`;
    return `<section class="fin-cartao cl-bloco" aria-labelledby="cl-t-acesso">
      <h2 id="cl-t-acesso">Acesso do cliente</h2>
      <div class="cl-link"><a href="/cliente/${esc(c.slug)}" target="_blank" rel="noopener">${esc(link.replace(/^https?:\/\//, ""))} ↗︎</a>
        <button type="button" class="admin-grupo__copiar" data-copiar-texto="${esc(link)}">Copiar link</button></div>
      ${senhaNova ? `<div class="cl-senha">
          <p>Nova palavra-passe (só aparece agora):</p>
          <code>${esc(senhaNova)}</code>
          <div class="cl-acoes"><button type="button" class="botao botao--pequeno" data-copiar-texto="${esc(senhaNova)}"><span>Copiar</span></button>
          <a class="botao botao--pequeno botao--secundario" href="${esc(emailSenha())}"><span>Escrever e-mail ao cliente</span></a></div>
          ${c.email ? "" : '<p class="cl-nota">Este cliente ainda não tem e-mail na ficha.</p>'}
        </div>` : `<p class="cl-nota">${c.tem_senha ? `Palavra-passe criada a ${dataCurta(c.senha_criada)}. ${c.ultimo_acesso ? `Último acesso: ${dataCurta(c.ultimo_acesso)}.` : "O cliente ainda não entrou."}` : "Ainda sem palavra-passe: o cliente não consegue entrar."}</p>
        <button type="button" class="botao botao--pequeno" data-senha><span>${c.tem_senha ? "Gerar nova palavra-passe" : "Gerar palavra-passe"}</span></button>`}
    </section>`;
  }

  function blocoChecklist() {
    const l = d.checklist;
    const feitas = l.filter((x) => x.feita).length;
    return `<section class="fin-cartao cl-bloco" aria-labelledby="cl-t-check">
      <div class="cl-bloco__cabeca"><h2 id="cl-t-check">Checklist de ${esc(nomeMes(mes))}</h2>
        <label class="cl-mes"><span class="sr-only">Mês</span><input class="entrada" type="month" id="cl-mes" value="${esc(mes)}"></label></div>
      ${l.length ? `<p class="cl-nota">${feitas} de ${l.length} feitas · o cliente vê só a percentagem.</p><div class="pc-barra"><i data-pct="${Math.round(feitas / l.length * 100)}"></i></div>` : ""}
      <ul class="cl-check-lista">${l.map((x) => `<li class="${x.feita ? "cl-feita" : ""}">
        <label><input type="checkbox" data-check="${x.id}"${x.feita ? " checked" : ""}> <span>${esc(x.titulo)}</span></label>
        <button type="button" class="tar-link tar-link--perigo" data-tirar-check="${x.id}" aria-label="Apagar: ${esc(x.titulo)}">✕</button></li>`).join("")}</ul>
      <form class="cl-check-nova" id="cl-check-nova"><input class="entrada" name="titulo" maxlength="200" required placeholder="Ex.: 8 publicações + 4 reels; Reunião de alinhamento; Sessão de captação" aria-label="Nova tarefa do mês"><button class="botao botao--pequeno" type="submit"><span>Adicionar</span></button></form>
      <button type="button" class="tar-link" data-copiar-mes>Copiar a lista de ${esc(nomeMes(mesAntes(mes)))}</button>
    </section>`;
  }

  function formCampanha(x = {}) {
    return `<form class="cl-camp-forma" data-campanha="${x.id || ""}">
      <div class="cl-campos">
        <label>Plataforma<select class="entrada" name="plataforma">${opcoes(PLAT, x.plataforma || "meta")}</select></label>
        <label>Estado<select class="entrada" name="estado">${opcoes(ESTADOS, x.estado || "ativa")}</select></label>
        <label class="cl-largo">Nome da campanha<input class="entrada" name="nome" required maxlength="160" value="${esc(x.nome || "")}"></label>
        <label class="cl-largo">Objetivo<input class="entrada" name="objetivo" maxlength="200" placeholder="Ex.: Mensagens no WhatsApp, visitas ao site" value="${esc(x.objetivo || "")}"></label>
        <label>Início<input class="entrada" type="date" name="inicio" value="${esc(x.inicio || hoje())}"></label>
        <label>Fim<input class="entrada" type="date" name="fim" value="${esc(x.fim || "")}"></label>
        <label>Orçamento total (€)<input class="entrada" type="number" step="0.01" min="0" name="orcamento" value="${x.orcamento ?? ""}"></label>
        <label>Investido até agora (€)<input class="entrada" type="number" step="0.01" min="0" name="investido" value="${x.investido ?? ""}"></label>
        <label>Alcance<input class="entrada" type="number" min="0" name="alcance" value="${x.alcance ?? ""}"></label>
        <label>Cliques<input class="entrada" type="number" min="0" name="cliques" value="${x.cliques ?? ""}"></label>
        <label class="cl-largo">Resultados <small>(o cliente vê)</small><input class="entrada" name="resultados" maxlength="1000" placeholder="Ex.: 38 conversas iniciadas, 12 reservas" value="${esc(x.resultados || "")}"></label>
      </div>
      <div class="cl-acoes"><button class="botao botao--pequeno" type="submit"><span>${x.id ? "Guardar" : "Adicionar campanha"}</span></button>
        <button type="button" class="tar-link" data-cancelar-campanha>Cancelar</button>
        ${x.id ? `<button type="button" class="tar-link tar-link--perigo" data-apagar-campanha="${x.id}">Apagar</button>` : ""}</div>
    </form>`;
  }

  function blocoCampanhas() {
    const c = d.campanhas;
    const ativas = c.filter((x) => x.estado === "ativa");
    return `<section class="fin-cartao cl-bloco" aria-labelledby="cl-t-camp">
      <div class="cl-bloco__cabeca"><h2 id="cl-t-camp">Campanhas de anúncios</h2>
      ${editarCampanha === "nova" ? "" : '<button type="button" class="botao botao--pequeno" data-nova-campanha><span>Nova campanha</span></button>'}</div>
      ${ativas.length ? `<p class="cl-alerta">📣 ${ativas.length} campanha${ativas.length > 1 ? "s" : ""} ativa${ativas.length > 1 ? "s" : ""} · ${eur(ativas.reduce((s, x) => s + (Number(x.investido) || 0), 0))} investidos</p>` : '<p class="cl-nota">Sem campanhas ativas. Quando lançar uma, registe-a aqui: o cliente vê-a no painel.</p>'}
      ${editarCampanha === "nova" ? formCampanha() : ""}
      <ul class="cl-camp-lista">${c.map((x) => editarCampanha === x.id ? `<li>${formCampanha(x)}</li>` : `<li class="cl-camp">
        <div><span class="pc-camp__plat">${esc(PLAT_CURTA[x.plataforma] || "Ads")}</span> <span class="pc-camp__estado pc-camp__estado--${esc(x.estado)}">${esc(ESTADOS[x.estado])}</span></div>
        <strong>${esc(x.nome)}</strong>
        <span class="cl-nota">${[x.inicio ? dataCurta(x.inicio) + (x.fim ? " → " + dataCurta(x.fim) : "") : "", `Investido ${eur(x.investido)}${x.orcamento ? ` de ${eur(x.orcamento)}` : ""}`, x.alcance ? `${num(x.alcance)} alcance` : "", x.cliques ? `${num(x.cliques)} cliques` : ""].filter(Boolean).join(" · ")}</span>
        ${x.resultados ? `<span>${esc(x.resultados)}</span>` : ""}
        <button type="button" class="tar-link" data-editar-campanha="${x.id}">Editar / atualizar valores</button>
      </li>`).join("")}</ul>
    </section>`;
  }

  function blocoSeguidores() {
    const redes = d.cliente.redes;
    if (!redes.length) return `<section class="fin-cartao cl-bloco"><h2>Seguidores</h2><p class="cl-nota">Adicione as redes nos dados do cliente para registar os seguidores.</p></section>`;
    return `<section class="fin-cartao cl-bloco" aria-labelledby="cl-t-seg">
      <h2 id="cl-t-seg">Seguidores</h2>
      <p class="cl-nota">Registe os números (do Metricool ou da própria rede). O painel mostra o último valor e a variação dos últimos 30 dias.</p>
      <form id="cl-seg" class="cl-seg">
        ${redes.map((r) => { const s = d.seguidores[r.rede]; return `<label><span>${esc(REDES[r.rede] || r.rede)}${r.conta ? ` · ${esc(r.conta)}` : ""}</span>
          <input class="entrada" type="number" min="0" name="${esc(r.rede)}" placeholder="${s ? num(s.seguidores) : "Seguidores"}">
          <small>${s ? `Último: ${num(s.seguidores)} a ${dataCurta(s.data)}${s.variacao !== null ? ` (${s.variacao > 0 ? "+" : ""}${num(s.variacao)} em 30 dias)` : ""}` : "Ainda sem registos"}</small></label>`; }).join("")}
        <label><span>Data</span><input class="entrada" type="date" name="data" value="${hoje()}"></label>
        <div class="cl-acoes"><button class="botao botao--pequeno" type="submit"><span>Guardar números</span></button></div>
      </form>
    </section>`;
  }

  function blocoDados() {
    const c = d.cliente;
    if (editarDados) return `<section class="fin-cartao cl-bloco"><h2>Dados do cliente</h2>
      <form class="cl-forma" id="cl-forma">${camposCliente(c, esc)}
        <div class="cl-acoes"><button class="botao botao--pequeno" type="submit"><span>Guardar</span></button><button type="button" class="tar-link" data-cancelar-dados>Cancelar</button>
        <button type="button" class="tar-link tar-link--perigo" data-apagar-cliente>Apagar cliente</button></div></form></section>`;
    return `<section class="fin-cartao cl-bloco" aria-labelledby="cl-t-dados">
      <div class="cl-bloco__cabeca"><h2 id="cl-t-dados">Dados e pacotes</h2><button type="button" class="tar-link" data-editar-dados>Editar</button></div>
      <dl class="cl-dados">
        <div><dt>Contacto</dt><dd>${esc(c.nome || "—")}${c.email ? `<br><a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}${c.telefone ? `<br>${esc(c.telefone)}` : ""}</dd></div>
        <div><dt>Pacotes</dt><dd>${c.pacotes ? esc(c.pacotes).replace(/\n/g, "<br>") : "—"}</dd></div>
        <div><dt>Mensalidade</dt><dd>${c.valor_mensal ? eur(c.valor_mensal) : "—"}</dd></div>
        <div><dt>Cliente desde</dt><dd>${c.inicio ? dataCurta(c.inicio) : "—"}</dd></div>
        <div><dt>Redes</dt><dd>${c.redes.length ? c.redes.map((r) => `${esc(REDES[r.rede] || r.rede)}${r.conta ? ` (${esc(r.conta)})` : ""}`).join("<br>") : "—"}</dd></div>
        <div><dt>Painel</dt><dd>${c.idioma === "en" ? "English" : "Português"}${c.metricool_id ? ` · Metricool ${esc(c.metricool_id)}` : ""}</dd></div>
        ${c.notas ? `<div class="cl-largo"><dt>Notas internas</dt><dd>${esc(c.notas).replace(/\n/g, "<br>")}</dd></div>` : ""}
      </dl>
    </section>`;
  }

  function desenhar() {
    const c = d.cliente;
    app.innerHTML = `
      <div class="admin-cabeca"><div><p class="legenda"><a href="#/clientes">Clientes</a></p><h1>${esc(c.marca)}${c.ativo ? "" : ' <span class="cl-etiqueta">Inativo</span>'}</h1>
      ${c.pacotes ? `<p class="admin-cabeca__nota">${esc(c.pacotes.split("\n").join(" · "))}</p>` : ""}</div></div>
      <div class="cl-grelha">
        <div class="cl-coluna">${blocoChecklist()}${blocoCampanhas()}</div>
        <div class="cl-coluna">${blocoAcesso()}${blocoSeguidores()}${blocoDados()}</div>
      </div>`;
    app.querySelectorAll("[data-pct]").forEach((i) => { i.style.width = i.dataset.pct + "%"; });
    const m = app.querySelector("#cl-mes");
    m.onchange = async () => { if (/^\d{4}-\d{2}$/.test(m.value)) { mes = m.value; await recarregar(); } };
  }
  async function recarregar() { await carregar(); desenhar(); }

  const redes = ligarRedes(app, esc);
  app.onclick = async (ev) => {
    if (redes(ev)) return;
    const b = ev.target.closest("button");
    if (!b) return;
    try {
      if (b.dataset.copiarTexto) { await navigator.clipboard.writeText(b.dataset.copiarTexto); aviso("Copiado."); }
      else if ("senha" in b.dataset) {
        if (d.cliente.tem_senha && !confirm("Gerar uma nova palavra-passe? A antiga deixa de funcionar.")) return;
        senhaNova = (await api(`clientes/${id}/senha`, { method: "POST", body: "{}" })).senha;
        await recarregar();
      }
      else if ("novaCampanha" in b.dataset) { editarCampanha = "nova"; desenhar(); }
      else if (b.dataset.editarCampanha) { editarCampanha = b.dataset.editarCampanha; desenhar(); }
      else if ("cancelarCampanha" in b.dataset) { editarCampanha = null; desenhar(); }
      else if (b.dataset.apagarCampanha) {
        if (!confirm("Apagar esta campanha?")) return;
        await api(`clientes/${id}/campanhas/${b.dataset.apagarCampanha}`, { method: "DELETE" });
        editarCampanha = null; aviso("Campanha apagada."); await recarregar();
      }
      else if (b.dataset.tirarCheck) { await api(`clientes/${id}/checklist/${b.dataset.tirarCheck}`, { method: "DELETE" }); await recarregar(); }
      else if ("copiarMes" in b.dataset) {
        const r = await api(`clientes/${id}/checklist`, { method: "POST", body: JSON.stringify({ mes, copiar_de: mesAntes(mes) }) });
        aviso(r.copiadas ? `${r.copiadas} tarefa${r.copiadas > 1 ? "s" : ""} copiada${r.copiadas > 1 ? "s" : ""}.` : "Não havia nada novo para copiar.");
        await recarregar();
      }
      else if ("editarDados" in b.dataset) { editarDados = true; desenhar(); }
      else if ("cancelarDados" in b.dataset) { editarDados = false; desenhar(); }
      else if ("apagarCliente" in b.dataset) {
        if (!confirm(`Apagar ${d.cliente.marca}? Apaga também a checklist, as campanhas e os seguidores registados. Não dá para desfazer.`)) return;
        await api(`clientes/${id}`, { method: "DELETE" });
        aviso("Cliente apagado."); location.hash = "#/clientes";
      }
    } catch (e) { aviso(e.message, "erro"); }
  };
  app.onchange = async (ev) => {
    const i = ev.target;
    if (i.dataset.check) {
      try { await api(`clientes/${id}/checklist/${i.dataset.check}`, { method: "PUT", body: JSON.stringify({ feita: i.checked }) }); await recarregar(); }
      catch (e) { aviso(e.message, "erro"); }
    }
  };
  app.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      if (f.id === "cl-check-nova") {
        await api(`clientes/${id}/checklist`, { method: "POST", body: JSON.stringify({ mes, titulo: f.titulo.value }) });
        await recarregar(); app.querySelector("#cl-check-nova [name=titulo]").focus();
      } else if (f.classList.contains("cl-camp-forma")) {
        const dados = Object.fromEntries(new FormData(f));
        const cid = f.dataset.campanha;
        await api(`clientes/${id}/campanhas${cid ? "/" + cid : ""}`, { method: cid ? "PUT" : "POST", body: JSON.stringify(dados) });
        editarCampanha = null; aviso("Campanha guardada."); await recarregar();
      } else if (f.id === "cl-seg") {
        const dados = Object.fromEntries(new FormData(f));
        const valores = d.cliente.redes.map((r) => ({ rede: r.rede, seguidores: dados[r.rede] })).filter((v) => v.seguidores !== "" && v.seguidores !== undefined);
        await api(`clientes/${id}/seguidores`, { method: "POST", body: JSON.stringify({ data: dados.data, valores }) });
        aviso("Seguidores guardados."); await recarregar();
      } else if (f.id === "cl-forma") {
        await api(`clientes/${id}`, { method: "PUT", body: JSON.stringify(lerCliente(f)) });
        editarDados = false; aviso("Dados guardados."); await recarregar();
      }
    } catch (e) { aviso(e.message, "erro"); }
  };

  await carregar();
  desenhar();
}
