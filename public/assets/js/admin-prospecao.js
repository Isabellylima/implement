/* Implement — prospeção (#/prospecao e #/prospecao/lista).
   Procura empresas no Google Maps por área e zona; a equipa contacta uma a uma (WhatsApp com mensagem pronta, chamada)
   e acompanha o estado de cada contacto na lista. Nada é enviado automaticamente. */

const ESTADOS = {
  por_contactar: "Por contactar", contactado: "Contactado", respondeu: "Respondeu",
  interessado: "Interessado", cliente: "Cliente", nao_quer: "Não quer",
};
const AREAS = ["Clínica de estética", "Restaurante", "Bar", "Café", "Cabeleireiro", "Barbearia", "Ginásio", "Dentista", "Fisioterapia", "Imobiliária", "Loja de roupa", "Alojamento local"];
const CHAVE = "implement-prospecao";
const MSG_SEM_SITE = "Olá! Sou a Isabelly, da Implement (heyimplement.com), uma agência de marketing digital no Algarve. Encontrei a {empresa} no Google e reparei que ainda não tem site. Fazemos sites profissionais prontos em 7 dias e podemos preparar uma prévia gratuita do seu, sem compromisso, para ver como ficaria. Quer que lhe envie? (Se preferir não receber mensagens nossas, diga-me e não voltamos a contactar.)";
const MSG_COM_SITE = "Olá! Sou a Isabelly, da Implement (heyimplement.com), uma agência de marketing digital no Algarve. Encontrei a {empresa} no Google e gostei do vosso trabalho. Ajudamos negócios como o vosso com gestão de redes sociais, identidade visual e sites. Posso enviar-lhe uma pequena análise gratuita da vossa presença online? (Se preferir não receber mensagens nossas, diga-me e não voltamos a contactar.)";

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...v })); } catch (_) {} };
const digitos = (t) => {
  let d = String(t || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1); else if (d.startsWith("00")) d = d.slice(2); else if (/^\d{9}$/.test(d)) d = "351" + d;
  return d;
};
// No WhatsApp só fazem sentido telemóveis (em Portugal começam por 9)
const temWhatsApp = (t) => { const d = digitos(t); return d.length >= 9 && (!d.startsWith("351") || d[3] === "9"); };
const mensagem = (e) => { const p = ler(); return ((e.site ? p.msgComSite || MSG_COM_SITE : p.msgSemSite || MSG_SEM_SITE)).replaceAll("{empresa}", e.nome).replaceAll("{zona}", e.zona || ""); };
const linkWA = (e) => `https://wa.me/${digitos(e.telefone)}?text=${encodeURIComponent(mensagem(e))}`;
const estrelas = (e) => e.avaliacao ? `<span class="pr-nota">★ ${Number(e.avaliacao).toFixed(1)}${e.avaliacoes ? ` <small>(${e.avaliacoes})</small>` : ""}</span>` : "";

export async function vistaProspecao(h, { app, api, aviso, esc }) {
  const modo = h.startsWith("/prospecao/lista") ? "lista" : "procurar";
  const { google } = await api("prospecao/estado");
  let leads = (await api("leads")).leads;
  let resultados = [], proxima = null, ultima = null, filtroEstado = "todos";
  const pref = ler();
  let soSemSite = pref.soSemSite ?? false;

  const contagem = () => leads.filter((l) => !["cliente", "nao_quer"].includes(l.estado)).length;
  const cabeca = () => `
    <div class="admin-cabeca">
      <div><p class="legenda">Vendas</p><h1>Prospeção</h1><p class="admin-cabeca__nota">Encontre empresas no Google Maps e contacte-as uma a uma, com a mensagem já escrita. Cada contacto fica na sua lista, com o estado.</p></div>
    </div>
    <div class="pr-abas" role="tablist">
      <a href="#/prospecao" role="tab" aria-selected="${modo === "procurar"}">Procurar empresas</a>
      <a href="#/prospecao/lista" role="tab" aria-selected="${modo === "lista"}">A minha lista <span>${contagem()}</span></a>
    </div>`;

  function semChave() {
    return `<div class="fin-cartao pr-config">
      <h2>Falta ligar o Google Maps</h2>
      <p>Para procurar empresas é preciso uma chave da <strong>Places API (New)</strong> do Google:</p>
      <ol>
        <li>Em <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a>, crie um projeto (ex.: «Implement Prospeção») e ative a faturação.</li>
        <li>Em <em>APIs e serviços → Biblioteca</em>, ative a <strong>Places API (New)</strong>.</li>
        <li>Em <em>Credenciais → Criar credenciais → Chave de API</em>, copie a chave. Em «Restrições da API», escolha só a Places API (New).</li>
        <li>No Cloudflare: <em>Workers → implement → Definições → Variáveis e segredos → Adicionar</em>, tipo <strong>Segredo</strong>, nome <code>GOOGLE_PLACES_KEY</code>, cole a chave e guarde.</li>
      </ol>
      <p class="pr-config__nota">Depois é só voltar a esta página. Enquanto isso, pode já usar «A minha lista» para registar contactos à mão.</p>
    </div>`;
  }

  function cartao(e) {
    const lead = e.lead;
    const naoQuer = lead && lead.estado === "nao_quer";
    return `<li class="pr-empresa${e.site ? "" : " pr-empresa--sem-site"}">
      <div class="pr-empresa__topo">
        <div><h3>${esc(e.nome)}</h3><p class="pr-empresa__tipo">${esc(e.tipo || "")}${e.tipo && e.avaliacao ? " · " : ""}${estrelas(e)}</p></div>
        ${e.site ? `<a class="pr-selo pr-selo--site" href="${esc(e.site)}" target="_blank" rel="noopener">Tem site ↗&#xFE0E;</a>` : `<span class="pr-selo pr-selo--sem">Sem site</span>`}
      </div>
      <p class="pr-empresa__morada">${esc(e.morada)}</p>
      <p class="pr-empresa__tel">${e.telefone ? esc(e.telefone) : "<em>Sem telefone no Google</em>"}${e.fechado_temp ? ' · <span class="pr-aviso">Temporariamente fechado</span>' : ""}</p>
      ${lead ? `<p class="pr-empresa__lead">Na sua lista: <strong>${ESTADOS[lead.estado]}</strong></p>` : ""}
      <div class="pr-acoes">
        ${naoQuer ? '<span class="pr-aviso">Pediu para não ser contactado</span>' : e.telefone && temWhatsApp(e.telefone) ? `<a class="botao botao--pequeno pr-wa" href="${linkWA(e)}" target="_blank" rel="noopener" data-contactar="${esc(e.place_id)}"><span>WhatsApp</span></a>` : ""}
        ${e.telefone && !naoQuer ? `<a class="pr-link" href="tel:${digitos(e.telefone) ? "+" + digitos(e.telefone) : ""}" data-contactar="${esc(e.place_id)}">Ligar</a>` : ""}
        ${e.maps_url ? `<a class="pr-link" href="${esc(e.maps_url)}" target="_blank" rel="noopener">Ver no Maps ↗&#xFE0E;</a>` : ""}
        ${!naoQuer ? `<button type="button" class="pr-link" data-copiar-msg="${esc(e.place_id)}">Copiar mensagem</button>` : ""}
        ${lead ? "" : `<button type="button" class="pr-link pr-link--forte" data-guardar="${esc(e.place_id)}">+ Guardar na lista</button>`}
      </div>
    </li>`;
  }

  function procurarHTML() {
    const lista = soSemSite ? resultados.filter((e) => !e.site) : resultados;
    const semSite = resultados.filter((e) => !e.site).length;
    return `
      <form class="fin-cartao pr-busca" id="pr-busca">
        <div class="pr-busca__campos">
          <label>Área ou tipo de negócio<input class="entrada" name="area" list="pr-areas" required maxlength="80" value="${esc(pref.area || "")}" placeholder="ex.: Clínica de estética"><datalist id="pr-areas">${AREAS.map((a) => `<option value="${a}">`).join("")}</datalist></label>
          <label>Zona<input class="entrada" name="zona" maxlength="80" value="${esc(pref.zona ?? "Faro")}" placeholder="ex.: Faro, Albufeira, Lisboa"></label>
          <button class="botao" type="submit"><span>Procurar</span></button>
        </div>
        <div class="pr-chips">${AREAS.slice(0, 8).map((a) => `<button type="button" data-area="${a}">${a}</button>`).join("")}</div>
      </form>
      ${resultados.length ? `
        <div class="pr-resumo">
          <p><strong>${resultados.length}</strong> empresas · <strong>${semSite}</strong> sem site</p>
          <label class="tar-check"><input type="checkbox" id="pr-so-sem-site"${soSemSite ? " checked" : ""}> Mostrar só as sem site</label>
        </div>
        <ul class="pr-grelha">${lista.map(cartao).join("") || '<li class="pc-vazio">Todas as empresas desta pesquisa já têm site.</li>'}</ul>
        ${proxima ? '<p class="pr-mais"><button type="button" class="botao botao--secundario" data-mais><span>Mostrar mais empresas</span></button></p>' : ""}`
      : ultima ? `<p class="pc-vazio">Não encontrámos empresas para «${esc(ultima.area)}»${ultima.zona ? ` em ${esc(ultima.zona)}` : ""}. Experimente outra zona ou outro nome.</p>` : ""}
      <details class="fin-cartao pr-msgs">
        <summary>Mensagens do WhatsApp</summary>
        <p class="pr-msgs__nota">Use <code>{empresa}</code> para o nome. Inclua sempre a frase para a pessoa poder recusar mais contactos.</p>
        <label>Para empresas <strong>sem site</strong><textarea class="entrada" rows="5" id="pr-msg-sem">${esc(pref.msgSemSite || MSG_SEM_SITE)}</textarea></label>
        <label>Para empresas <strong>com site</strong><textarea class="entrada" rows="5" id="pr-msg-com">${esc(pref.msgComSite || MSG_COM_SITE)}</textarea></label>
        <div class="pr-msgs__acoes"><button type="button" class="botao botao--pequeno" data-guardar-msgs><span>Guardar mensagens</span></button><button type="button" class="tar-link" data-repor-msgs>Repor as originais</button></div>
      </details>`;
  }

  function listaHTML() {
    const filtradas = filtroEstado === "todos" ? leads : leads.filter((l) => l.estado === filtroEstado);
    const n = (k) => leads.filter((l) => l.estado === k).length;
    return `
      <div class="tar-filtros" role="group" aria-label="Estado">
        <button type="button" data-filtro="todos" aria-pressed="${filtroEstado === "todos"}">Todos <span>${leads.length}</span></button>
        ${Object.entries(ESTADOS).map(([k, v]) => `<button type="button" data-filtro="${k}" aria-pressed="${filtroEstado === k}">${v} <span>${n(k)}</span></button>`).join("")}
      </div>
      ${filtradas.length ? `<ul class="pr-lista">${filtradas.map((l) => `<li class="pr-lead pr-lead--${l.estado}">
        <div class="pr-lead__info">
          <h3>${esc(l.nome)}</h3>
          <p>${[l.area, l.zona].filter(Boolean).map(esc).join(" · ")}${l.telefone ? ` · ${esc(l.telefone)}` : ""}${l.site ? "" : ' · <span class="pr-selo pr-selo--sem">Sem site</span>'}</p>
          ${l.contactado_em ? `<p class="pr-lead__data">Contactado a ${new Date(l.contactado_em).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</p>` : ""}
        </div>
        <label class="pr-lead__estado"><span class="sr-only">Estado</span><select class="entrada" data-estado="${l.id}">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}"${k === l.estado ? " selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="pr-lead__notas"><span class="sr-only">Notas</span><input class="entrada" data-notas="${l.id}" value="${esc(l.notas)}" maxlength="2000" placeholder="Notas (ex.: falar com a dona à tarde)"></label>
        <div class="pr-acoes">
          ${l.estado === "nao_quer" ? '<span class="pr-aviso">Não contactar</span>' : l.telefone && temWhatsApp(l.telefone) ? `<a class="botao botao--pequeno pr-wa" href="${linkWA(l)}" target="_blank" rel="noopener"><span>WhatsApp</span></a>` : ""}
          ${l.telefone && l.estado !== "nao_quer" ? `<a class="pr-link" href="tel:+${digitos(l.telefone)}">Ligar</a>` : ""}
          ${l.maps_url ? `<a class="pr-link" href="${esc(l.maps_url)}" target="_blank" rel="noopener">Maps ↗&#xFE0E;</a>` : ""}
          <button type="button" class="pr-link pr-link--perigo" data-remover="${l.id}">Remover</button>
        </div>
      </li>`).join("")}</ul>` : `<div class="fin-cartao"><p class="pc-vazio">${leads.length ? "Nenhum contacto neste estado." : "A lista está vazia. Procure empresas e carregue em «WhatsApp», «Ligar» ou «Guardar na lista»."}</p></div>`}
      <form class="fin-cartao pr-manual" id="pr-manual">
        <h2>Adicionar à mão</h2>
        <div class="pr-busca__campos">
          <label>Empresa<input class="entrada" name="nome" required maxlength="160"></label>
          <label>Telefone<input class="entrada" name="telefone" maxlength="40" inputmode="tel"></label>
          <label>Área<input class="entrada" name="area" maxlength="80" list="pr-areas"></label>
          <button class="botao botao--secundario" type="submit"><span>Adicionar</span></button>
        </div>
      </form>`;
  }

  function desenhar() {
    app.innerHTML = cabeca() + (modo === "lista" ? listaHTML() : google ? procurarHTML() : semChave());
  }

  async function pesquisar(area, zona, mais = false) {
    const botao = app.querySelector("#pr-busca button[type=submit]");
    if (botao) { botao.disabled = true; botao.querySelector("span").textContent = "A procurar…"; }
    try {
      const d = await api("prospecao/procurar", { method: "POST", body: JSON.stringify({ area, zona, pagina: mais ? proxima : undefined }) });
      resultados = mais ? resultados.concat(d.empresas) : d.empresas;
      proxima = d.proxima; ultima = { area, zona };
      Object.assign(pref, { area, zona }); gravar({ area, zona });
      desenhar();
    } catch (e) { aviso(e.message, "erro"); desenhar(); }
  }

  async function guardar(e, estado) {
    const d = await api("leads", { method: "POST", body: JSON.stringify({ ...e, area: ultima?.area, zona: ultima?.zona, estado }) });
    leads = (await api("leads")).leads;
    e.lead = { id: d.id, estado: leads.find((l) => l.id === d.id)?.estado || estado };
  }

  app.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    if (f.id === "pr-busca") pesquisar(f.area.value.trim(), f.zona.value.trim());
    else if (f.id === "pr-manual") {
      try {
        await api("leads", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(f))) });
        leads = (await api("leads")).leads; aviso("Adicionado à lista."); desenhar();
      } catch (e) { aviso(e.message, "erro"); }
    }
  };

  app.onclick = async (ev) => {
    const el = ev.target.closest("a, button");
    if (!el) return;
    const empresa = (id) => resultados.find((e) => e.place_id === id);
    if (el.dataset.area) { const f = app.querySelector("#pr-busca"); f.area.value = el.dataset.area; pesquisar(el.dataset.area, f.zona.value.trim()); }
    else if ("mais" in el.dataset && ultima) pesquisar(ultima.area, ultima.zona, true);
    else if (el.dataset.contactar) {
      // Abre o WhatsApp / a chamada (sem impedir o link) e regista como contactado
      const e = empresa(el.dataset.contactar);
      if (e) guardar(e, "contactado").then(() => { aviso(`${e.nome}: marcado como contactado.`); desenhar(); }).catch((x) => aviso(x.message, "erro"));
    }
    else if (el.dataset.guardar) {
      const e = empresa(el.dataset.guardar);
      try { await guardar(e, "por_contactar"); aviso("Guardado na lista."); desenhar(); } catch (x) { aviso(x.message, "erro"); }
    }
    else if (el.dataset.copiarMsg) {
      const e = empresa(el.dataset.copiarMsg);
      try { await navigator.clipboard.writeText(mensagem(e)); aviso("Mensagem copiada (para Instagram, e-mail…)."); } catch { aviso("Não foi possível copiar.", "erro"); }
    }
    else if ("guardarMsgs" in el.dataset) {
      gravar({ msgSemSite: app.querySelector("#pr-msg-sem").value, msgComSite: app.querySelector("#pr-msg-com").value });
      Object.assign(pref, ler()); aviso("Mensagens guardadas neste navegador."); desenhar();
    }
    else if ("reporMsgs" in el.dataset) { gravar({ msgSemSite: "", msgComSite: "" }); Object.assign(pref, ler()); desenhar(); }
    else if (el.dataset.filtro) { filtroEstado = el.dataset.filtro; desenhar(); }
    else if (el.dataset.remover) {
      if (!confirm("Remover este contacto da lista?")) return;
      try { await api("leads/" + el.dataset.remover, { method: "DELETE" }); leads = leads.filter((l) => l.id !== el.dataset.remover); desenhar(); } catch (x) { aviso(x.message, "erro"); }
    }
  };

  app.onchange = async (ev) => {
    const t = ev.target;
    if (t.id === "pr-so-sem-site") { soSemSite = t.checked; gravar({ soSemSite }); desenhar(); return; }
    const id = t.dataset.estado || t.dataset.notas;
    if (!id) return;
    const corpo = t.dataset.estado ? { estado: t.value } : { notas: t.value };
    try {
      await api("leads/" + id, { method: "PUT", body: JSON.stringify(corpo) });
      leads = (await api("leads")).leads;
      if (t.dataset.estado) { aviso("Estado atualizado."); desenhar(); } else aviso("Nota guardada.");
    } catch (x) { aviso(x.message, "erro"); }
  };

  desenhar();
}
