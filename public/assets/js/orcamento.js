/* Implement — gerador de orçamentos (só no preçário).
   Os preços vêm de precos-dados.js, gerado por scripts/servicos.py a partir do mesmo catálogo das páginas.
   As perguntas do formulário vêm de perguntas.js, para ler o e-mail «Novo pedido IMP-…» sem regras duplicadas.
   Tudo corre no browser: nada é enviado para lado nenhum. O rascunho e os orçamentos gerados ficam no localStorage. */
import { DADOS } from "./precos-dados.js?v=4528677fbe";
import { ETAPAS } from "./perguntas.js?v=881589d3f5";

const $ = (id) => document.getElementById(id);
const raiz = $("orcamento");
if (raiz && $("calc")) iniciar();

function iniciar() {
  const ITENS = Object.fromEntries(DADOS.itens.map((i) => [i.id, i]));
  const ADIC = Object.fromEntries(DADOS.adicionais.filter((a) => a.valor != null).map((a) => [a.id, a]));
  const CHAVE_RASCUNHO = "implement-orcamento-rascunho";
  const CHAVE_GUARDADOS = "implement-orcamentos";

  /* ---------- Utilitários ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v, padrao = 0) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : padrao; };
  const red = (n) => Math.round(n * 100) / 100;
  const moeda = (n, idioma = "pt") => new Intl.NumberFormat(idioma === "en" ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  const uid = () => Math.random().toString(36).slice(2, 9);
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } };
  const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

  /* ---------- Estado ---------- */
  const novoEstado = () => ({
    cliente: { nome: "", empresa: "", email: "", telefone: "", referencia: "", idioma: "pt" },
    linhas: [],
    desconto: { valor: 0, tipo: "pct", nome: "Desconto de pacote" },
    meses: 3, validade: 30, sinal: 50, iva: false, ivaTaxa: 23, urgencia: false, notas: "",
    numero: "", pedido: null,
  });
  let E = Object.assign(novoEstado(), ler(CHAVE_RASCUNHO, {}));
  let guardarDepois;
  const guardar = () => { clearTimeout(guardarDepois); guardarDepois = setTimeout(() => gravar(CHAVE_RASCUNHO, E), 300); };

  /* ---------- Linhas ---------- */
  function linhaDoCatalogo(id, qtd) {
    const it = ITENS[id];
    if (it) {
      const individual = it.componentes.length ? it.componentes.reduce((s, c) => s + (ITENS[c.id].valor || 0) * c.qtd, 0) : null;
      return { uid: uid(), ref: id, nome: { ...it.nome }, desc: { ...it.desc }, qtd: qtd ?? it.min ?? 1, valor: it.valor ?? 0,
        desconto: 0, mensal: it.por === "mes", por: it.por, aDefinir: it.valor == null, individual };
    }
    const a = ADIC[id];
    return { uid: uid(), ref: id, nome: { ...a.nome }, desc: { pt: "", en: "" }, qtd: qtd ?? 1, valor: a.valor, desconto: 0, mensal: false, por: null, aDefinir: false, individual: null };
  }
  const linhaLivre = () => ({ uid: uid(), ref: null, nome: { pt: "", en: "" }, desc: { pt: "", en: "" }, qtd: 1, valor: 0, desconto: 0, mensal: false, por: null, aDefinir: true, individual: null, livre: true });
  const totalLinha = (l) => red(num(l.qtd) * num(l.valor) * (1 - Math.min(100, num(l.desconto)) / 100));

  function adicionar(id, qtd) {
    const existente = E.linhas.find((l) => l.ref === id && ITENS[id]?.por === "foto");
    if (existente && qtd) existente.qtd = num(existente.qtd) + qtd;
    else E.linhas.push(linhaDoCatalogo(id, qtd));
  }

  /* ---------- Contas ---------- */
  function contas() {
    const projeto = red(E.linhas.filter((l) => !l.mensal).reduce((s, l) => s + totalLinha(l), 0));
    const mensal = red(E.linhas.filter((l) => l.mensal).reduce((s, l) => s + totalLinha(l), 0));
    const d = Math.max(0, num(E.desconto.valor));
    const descP = E.desconto.tipo === "pct" ? red(projeto * Math.min(d, 100) / 100) : Math.min(red(d), projeto);
    const descM = E.desconto.tipo === "pct" ? red(mensal * Math.min(d, 100) / 100) : 0;
    const urgencia = E.urgencia ? red((projeto - descP) * 0.25) : 0;
    const baseP = red(projeto - descP + urgencia);
    const baseM = red(mensal - descM);
    const taxa = E.iva ? Math.max(0, num(E.ivaTaxa)) / 100 : 0;
    const ivaP = red(baseP * taxa), ivaM = red(baseM * taxa);
    const meses = Math.max(1, Math.round(num(E.meses, 3)));
    const totalP = red(baseP + ivaP), totalM = red(baseM + ivaM);
    const individual = red(E.linhas.reduce((s, l) => s + (l.individual ? (l.individual - num(l.valor)) * num(l.qtd) : 0), 0));
    return { projeto, mensal, descP, descM, urgencia, baseP, baseM, ivaP, ivaM, totalP, totalM, meses,
      totalCompromisso: red(totalM * meses), sinal: red(totalP * Math.min(100, Math.max(0, num(E.sinal))) / 100),
      geral: red(totalP + totalM * meses), poupanca: red(individual + descP + descM * meses) };
  }

  /* ---------- Ler o e-mail do pedido ---------- */
  const CAMPOS = ETAPAS.flatMap((e) => e.campos).filter((c) => c.tipo !== "consentimento");
  const ROTULOS = CAMPOS.flatMap((c) => [{ r: norm(c.pt), c }, { r: norm(c.en), c }])
    .concat([{ r: "referência", c: { id: "referencia" } }, { r: "reference", c: { id: "referencia" } }])
    .sort((a, b) => b.r.length - a.r.length);
  const TITULOS = new Set(ETAPAS.flatMap((e) => [norm(e.pt), norm(e.en)]));
  const IGNORAR = /^(==.*==|responder a este e-mail.*|novo pedido no formulário.*|recebido:.*|idioma do formulário:.*|país:.*|implement · start a project)$/i;

  function lerEmail(texto) {
    const brutos = {};
    let atual = null;
    for (const original of String(texto).split(/\r?\n/)) {
      const linha = original.replace(/\u00a0/g, " ").trim();
      if (!linha) continue;
      const n = norm(linha);
      if (IGNORAR.test(n) || TITULOS.has(n)) { atual = null; continue; }
      const m = ROTULOS.find(({ r }) => n.startsWith(r) && (n.length === r.length || /[\s:\t]/.test(n[r.length])));
      if (m) {
        const resto = linha.slice(m.r.length).replace(/^[\s:\t–-]+/, "");
        atual = { id: m.c.id, partes: resto ? [resto] : [] };
        brutos[m.c.id] = atual;
      } else if (atual) atual.partes.push(linha);
    }
    const r = {};
    for (const [id, v] of Object.entries(brutos)) {
      const texto = v.partes.join("\n").trim();
      if (!texto) continue;
      const campo = CAMPOS.find((c) => c.id === id);
      r[id] = campo && campo.opcoes ? opcoesDe(campo, texto) : texto;
    }
    if (!r.referencia) { const m = String(texto).match(/\bIMP-[A-Z0-9]{6}\b/); if (m) r.referencia = m[0]; }
    else { const m = r.referencia.match(/IMP-[A-Z0-9]{6}/); if (m) r.referencia = m[0]; }
    if (!r.email) { const m = String(texto).match(/[\w.+-]+@[\w-]+\.[\w.-]+/g); const m2 = (m || []).find((x) => !/heyimplement\.com$/i.test(x)); if (m2) r.email = m2; }
    return r;
  }

  function opcoesDe(campo, texto) {
    const multipla = campo.tipo === "multipla" || campo.tipo === "servicos";
    let resto = norm(texto);
    const ops = campo.opcoes.flatMap((o) => [{ o, r: norm(o.pt) }, { o, r: norm(o.en) }]).sort((a, b) => b.r.length - a.r.length);
    if (!multipla) {
      const exata = ops.find((x) => x.r === resto);
      if (exata) return exata.o.v;
      const parcial = ops.find((x) => resto.includes(x.r));
      return parcial ? parcial.o.v : undefined;
    }
    const achadas = [];
    for (const x of ops) {
      if (achadas.includes(x.o.v)) continue;
      if (resto.includes(x.r)) { achadas.push(x.o.v); resto = resto.replace(x.r, " "); }
    }
    return achadas;
  }

  function sugerir(r) {
    const s = Array.isArray(r.servicos) ? r.servicos : [];
    const sug = [];
    const pecas = r.marca_pecas || [];
    const tipos = r.conteudo_tipo || [];
    if (s.includes("estrategia")) sug.push(["estrategia"]);
    if (s.includes("marca")) {
      if (pecas.includes("manual")) sug.push(["id-completa"]);
      else if (pecas.includes("identidade") || r.marca_logo === "renovar") sug.push(["id-base"]);
      else if (r.marca_logo !== "manter" || pecas.includes("logotipo")) sug.push(["logo"]);
      if (pecas.includes("papelaria")) sug.push(["cartao"]);
      if (pecas.includes("flyers")) sug.push(["flyer-1"]);
      if (pecas.includes("menus")) sug.push(["menu-2"]);
    }
    if (s.includes("conteudo")) {
      if (tipos.includes("produto")) sug.push([r.setor === "restauracao" ? "foto-estilo" : "foto-neutro"]);
      if (tipos.includes("espaco")) sug.push(["foto-espaco"]);
      if (tipos.includes("evento")) sug.push(["foto-evento"]);
      if (tipos.includes("reels")) sug.push(["video-30", 2]);
      if (tipos.includes("promo")) sug.push(["video-60"]);
    }
    if (s.includes("redes")) {
      const redes = (r.redes_quais || []).length;
      const plano = r.redes_material === "nao" ? "presenca" : redes >= 2 ? "crescimento" : "essencial";
      sug.push([plano]);
      if (r.redes_estado === "sem-contas") sug.push(["ad3"]);
    }
    if (s.includes("website")) sug.push(["website"]);
    if (s.includes("google")) sug.push(["google"]);
    return sug;
  }

  const FAIXAS = {
    "ate-300": [0, 300], "300-500": [300, 500], "500-800": [500, 800], "800-1200": [800, 1200], "1200+": [1200, Infinity],
    "ate-500": [0, 500], "500-1000": [500, 1000], "1000-2000": [1000, 2000], "2000+": [2000, Infinity],
  };

  function resumoPedido(r) {
    const linhas = [];
    const mostrar = ["empresa", "setor", "localizacao", "servicos", "objetivo", "tipo_trabalho", "orcamento_mensal", "orcamento_projeto", "prazo", "data_limite", "preferencia", "idioma_contacto"];
    for (const id of mostrar) {
      const c = CAMPOS.find((x) => x.id === id);
      if (!c || r[id] === undefined || (Array.isArray(r[id]) && !r[id].length)) continue;
      const nome = (v) => (c.opcoes || []).find((o) => o.v === v)?.pt ?? v;
      linhas.push([c.pt, Array.isArray(r[id]) ? r[id].map(nome).join(", ") : nome(r[id])]);
    }
    return { linhas, mensal: r.orcamento_mensal || null, projeto: r.orcamento_projeto || null, rotuloMensal: rotuloOp("orcamento_mensal", r.orcamento_mensal), rotuloProjeto: rotuloOp("orcamento_projeto", r.orcamento_projeto) };
  }
  const rotuloOp = (id, v) => (v ? CAMPOS.find((c) => c.id === id).opcoes.find((o) => o.v === v)?.pt : null);

  $("calc-ler").addEventListener("click", () => {
    const texto = $("calc-email").value;
    const estado = $("calc-leitura");
    if (!texto.trim()) { estado.textContent = "Cole primeiro o texto do e-mail do pedido."; return; }
    const r = lerEmail(texto);
    const encontrados = Object.keys(r).length;
    if (!encontrados) { estado.textContent = "Não encontrei respostas do formulário neste texto. Confirme que copiou o e-mail «Novo pedido IMP-…» inteiro."; return; }
    for (const k of ["nome", "empresa", "email", "telefone", "referencia"]) if (r[k]) E.cliente[k] = r[k].split("\n")[0].slice(0, 160);
    if (r.idioma_contacto === "en" || r.idioma_contacto === "pt") E.cliente.idioma = r.idioma_contacto;
    E.pedido = resumoPedido(r);
    const sug = sugerir(r);
    const antes = E.linhas.length;
    for (const [id, qtd] of sug) if (!E.linhas.some((l) => l.ref === id)) adicionar(id, qtd);
    const novos = E.linhas.length - antes;
    estado.textContent = `Li ${encontrados} respostas${r.referencia ? ` do pedido ${r.referencia}` : ""}. ${novos ? `Acrescentei ${novos} ${novos === 1 ? "serviço sugerido" : "serviços sugeridos"}: reveja quantidades e preços.` : "Não acrescentei serviços novos."}`;
    desenharTudo();
  });
  $("calc-limpar-email").addEventListener("click", () => { $("calc-email").value = ""; $("calc-leitura").textContent = ""; });

  /* ---------- Desenho ---------- */
  function desenharCatalogo() {
    const grupos = {};
    for (const it of DADOS.itens) {
      if (it.componentes.length) continue;
      (grupos[it.cat] ||= { titulo: it.categoria.pt, itens: [] }).itens.push(it);
    }
    let html = '<option value="">Escolher um serviço do preçário…</option>';
    for (const g of Object.values(grupos)) html += `<optgroup label="${esc(g.titulo)}">${g.itens.map((i) => `<option value="${i.id}">${esc(i.nome.pt)} · ${esc(i.rotuloPreco.pt)}</option>`).join("")}</optgroup>`;
    html += `<optgroup label="Serviços adicionais">${Object.values(ADIC).map((a) => `<option value="${a.id}">${esc(a.nome.pt)} · ${esc(a.rotuloPreco.pt)}</option>`).join("")}</optgroup>`;
    $("calc-catalogo").innerHTML = html;
    $("calc-pacotes").innerHTML = DADOS.itens.filter((i) => i.componentes.length)
      .map((i) => `<button type="button" class="calc__pacote" data-pacote="${i.id}"><strong>${esc(i.nome.pt)}</strong><span>${esc(i.rotuloPreco.pt)}</span></button>`).join("");
  }

  function desenharCliente() {
    for (const el of raiz.querySelectorAll("[data-cliente]")) el.value = E.cliente[el.dataset.cliente] ?? "";
    $("calc-desc-valor").value = E.desconto.valor;
    $("calc-desc-tipo").value = E.desconto.tipo;
    $("calc-desc-nome").value = E.desconto.nome;
    $("calc-meses").value = E.meses;
    $("calc-validade").value = E.validade;
    $("calc-sinal").value = E.sinal;
    $("calc-iva").checked = E.iva;
    $("calc-iva-taxa").value = E.ivaTaxa;
    $("calc-urgencia").checked = E.urgencia;
    $("calc-notas").value = E.notas;
  }

  function desenharPedido() {
    const caixa = $("calc-pedido");
    if (!E.pedido || !E.pedido.linhas.length) { caixa.hidden = true; return; }
    caixa.hidden = false;
    caixa.innerHTML = `<h4>Do pedido</h4><dl>${E.pedido.linhas.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }

  function desenharLinhas() {
    const lingua = E.cliente.idioma;
    $("calc-vazio").hidden = E.linhas.length > 0;
    $("calc-linhas").innerHTML = E.linhas.map((l, i) => {
      const sufixo = l.mensal ? " / mês" : l.por === "foto" ? " / foto" : "";
      return `<div class="calc__linha${l.aDefinir && !num(l.valor) ? " calc__linha--definir" : ""}" data-uid="${l.uid}">
        <div class="calc__linha-nome">
          <label class="sr-only" for="n-${l.uid}">Serviço ${i + 1}</label>
          <input class="entrada" id="n-${l.uid}" data-f="nome" value="${esc(l.nome[lingua] || l.nome.pt)}" placeholder="Descrição do serviço">
          ${l.livre ? `<input class="entrada calc__linha-desc" data-f="desc" value="${esc(l.desc[lingua] || l.desc.pt)}" placeholder="Detalhe (opcional)" aria-label="Detalhe do serviço ${i + 1}">
            <label class="calc__marcar calc__marcar--pequeno"><input type="checkbox" data-f="mensal"${l.mensal ? " checked" : ""}> Valor mensal</label>`
            : `<p class="calc__linha-info">${esc(l.desc.pt)}${l.individual ? ` · <strong>Em separado: ${moeda(l.individual)}</strong>` : ""}${l.aDefinir ? " · <strong>Preço a definir</strong>" : ""}</p>`}
        </div>
        <label class="calc__mini"><span>Qtd.</span><input class="entrada" type="number" min="0" step="1" inputmode="decimal" data-f="qtd" value="${esc(l.qtd)}"></label>
        <label class="calc__mini"><span>Preço${sufixo}</span><input class="entrada" type="number" min="0" step="1" inputmode="decimal" data-f="valor" value="${esc(l.valor)}"></label>
        <label class="calc__mini"><span>Desc. %</span><input class="entrada" type="number" min="0" max="100" step="1" inputmode="decimal" data-f="desconto" value="${esc(l.desconto)}"></label>
        <p class="calc__linha-total"><span>Total</span><output data-total>${moeda(totalLinha(l))}${l.mensal ? "<small> / mês</small>" : ""}</output></p>
        <div class="calc__linha-acoes">
          <button type="button" data-acao="cima" aria-label="Subir ${esc(l.nome.pt)}"${i === 0 ? " disabled" : ""}>↑</button>
          <button type="button" data-acao="remover" aria-label="Remover ${esc(l.nome.pt)}">×</button>
        </div>
      </div>`;
    }).join("");
    desenharSugestaoPacote();
  }

  function pacoteFormado() {
    for (const p of DADOS.itens.filter((i) => i.componentes.length)) {
      const ok = p.componentes.every((c) => E.linhas.some((l) => l.ref === c.id && num(l.qtd) >= c.qtd));
      if (ok) return p;
    }
    return null;
  }

  function desenharSugestaoPacote() {
    const caixa = $("calc-sugestao");
    const p = pacoteFormado();
    if (!p) { caixa.hidden = true; caixa.innerHTML = ""; return; }
    const separado = p.componentes.reduce((s, c) => s + ITENS[c.id].valor * c.qtd, 0);
    caixa.hidden = false;
    caixa.innerHTML = `Estes serviços formam o pacote <strong>${esc(p.nome.pt)}</strong>: ${moeda(p.valor)} em vez de ${moeda(separado)}. <button type="button" data-usar-pacote="${p.id}">Usar o pacote</button>`;
  }

  function usarPacote(id) {
    const p = ITENS[id];
    for (const c of p.componentes) {
      const l = E.linhas.find((x) => x.ref === c.id);
      l.qtd = num(l.qtd) - c.qtd;
    }
    E.linhas = E.linhas.filter((l) => !(p.componentes.some((c) => c.id === l.ref) && num(l.qtd) <= 0));
    adicionar(id);
  }

  function desenharTotais() {
    const c = contas();
    const L = [];
    if (c.projeto || !c.mensal) {
      L.push(["Projeto (pagamento único)", moeda(c.projeto)]);
      if (c.descP) L.push([`${E.desconto.nome || "Desconto"}${E.desconto.tipo === "pct" ? ` (${num(E.desconto.valor)}%)` : ""}`, "− " + moeda(c.descP), "desconto"]);
      if (c.urgencia) L.push(["Urgência (+25%)", "+ " + moeda(c.urgencia)]);
      if (E.iva) L.push([`IVA ${num(E.ivaTaxa)}%`, "+ " + moeda(c.ivaP)]);
      L.push([E.iva ? "Total do projeto c/ IVA" : "Total do projeto s/ IVA", moeda(c.totalP), "forte"]);
      if (c.totalP && num(E.sinal)) L.push([`Sinal (${num(E.sinal)}%)`, moeda(c.sinal)]);
    }
    if (c.mensal) {
      L.push(["Mensalidade", moeda(c.mensal), "separar"]);
      if (c.descM) L.push([`${E.desconto.nome || "Desconto"} (${num(E.desconto.valor)}%)`, "− " + moeda(c.descM), "desconto"]);
      if (E.iva) L.push([`IVA ${num(E.ivaTaxa)}%`, "+ " + moeda(c.ivaM)]);
      L.push([E.iva ? "Por mês c/ IVA" : "Por mês s/ IVA", moeda(c.totalM), "forte"]);
      L.push([`${c.meses} ${c.meses === 1 ? "mês" : "meses"} de compromisso`, moeda(c.totalCompromisso)]);
    }
    if (c.projeto && c.mensal) L.push(["Valor total da proposta", moeda(c.geral), "geral"]);
    if (c.poupanca > 0) L.push(["O cliente poupa", moeda(c.poupanca), "poupanca"]);
    $("calc-totais").innerHTML = L.map(([k, v, cl]) => `<div class="${cl ? "t-" + cl : ""}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

    // Comparação com o orçamento indicado pelo cliente (valores sem IVA)
    const caixa = $("calc-orc-cliente");
    const partes = [];
    const comparar = (rotulo, faixa, valor, onde) => {
      const f = FAIXAS[faixa];
      if (!f) { partes.push(`${onde}: ${rotulo}`); return; }
      const estado = valor > f[1] ? `acima em ${moeda(red(valor - f[1]))}` : valor < f[0] ? "abaixo da faixa" : "dentro da faixa";
      partes.push(`${onde}: <strong>${esc(rotulo)}</strong> · a proposta está ${estado}`);
    };
    if (E.pedido?.projeto) comparar(E.pedido.rotuloProjeto, E.pedido.projeto, c.baseP, "Projeto indicado pelo cliente");
    if (E.pedido?.mensal) comparar(E.pedido.rotuloMensal, E.pedido.mensal, c.baseM, "Mensal indicado pelo cliente");
    caixa.hidden = !partes.length;
    caixa.innerHTML = partes.join("<br>");

    // Totais por linha (sem redesenhar os campos, para não perder o foco)
    for (const l of E.linhas) {
      const el = raiz.querySelector(`[data-uid="${l.uid}"]`);
      if (!el) continue;
      el.querySelector("[data-total]").innerHTML = moeda(totalLinha(l)) + (l.mensal ? "<small> / mês</small>" : "");
      el.classList.toggle("calc__linha--definir", Boolean(l.aDefinir && !num(l.valor)));
    }
    $("calc-aviso").textContent = "";
  }

  function desenharGuardados() {
    const lista = ler(CHAVE_GUARDADOS, []);
    $("calc-guardados-caixa").hidden = !lista.length;
    $("calc-guardados").innerHTML = lista.map((g, i) => `<li><button type="button" data-guardado="${i}"><strong>${esc(g.numero)}</strong> · ${esc(g.empresa || g.nome || "sem nome")}<span>${esc(new Date(g.data).toLocaleDateString("pt-PT"))} · ${esc(g.total)}</span></button></li>`).join("");
  }

  function desenharTudo() {
    desenharCliente();
    desenharPedido();
    desenharLinhas();
    desenharTotais();
    guardar();
  }

  /* ---------- Eventos ---------- */
  raiz.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.dataset.cliente) {
      E.cliente[el.dataset.cliente] = el.value;
      if (el.dataset.cliente === "idioma") desenharLinhas();
    } else if (el.dataset.f) {
      const l = E.linhas.find((x) => x.uid === el.closest("[data-uid]").dataset.uid);
      const f = el.dataset.f;
      if (f === "nome" || f === "desc") { l[f] = { ...l[f], [E.cliente.idioma]: el.value }; if (!l[f].pt) l[f].pt = el.value; }
      else if (f === "mensal") l.mensal = el.checked;
      else { l[f] = el.value; if (f === "qtd") desenharSugestaoPacote(); }
    } else {
      const mapa = { "calc-desc-valor": ["desconto", "valor"], "calc-desc-tipo": ["desconto", "tipo"], "calc-desc-nome": ["desconto", "nome"] };
      if (mapa[el.id]) E.desconto[mapa[el.id][1]] = el.value;
      else if (el.id === "calc-meses") E.meses = el.value;
      else if (el.id === "calc-validade") E.validade = el.value;
      else if (el.id === "calc-sinal") E.sinal = el.value;
      else if (el.id === "calc-iva") E.iva = el.checked;
      else if (el.id === "calc-iva-taxa") E.ivaTaxa = el.value;
      else if (el.id === "calc-urgencia") E.urgencia = el.checked;
      else if (el.id === "calc-notas") E.notas = el.value;
      else return;
    }
    desenharTotais();
    guardar();
  });
  raiz.addEventListener("change", (ev) => { if (ev.target.type === "checkbox" || ev.target.tagName === "SELECT") ev.target.dispatchEvent(new Event("input", { bubbles: true })); });

  raiz.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.id === "calc-adicionar") {
      const id = $("calc-catalogo").value;
      if (!id) { $("calc-catalogo").focus(); return; }
      adicionar(id);
      $("calc-catalogo").value = "";
    } else if (b.id === "calc-livre") {
      E.linhas.push(linhaLivre());
      desenharLinhas(); desenharTotais(); guardar();
      raiz.querySelector(`[data-uid="${E.linhas.at(-1).uid}"] input`).focus();
      return;
    } else if (b.dataset.pacote) adicionar(b.dataset.pacote);
    else if (b.dataset.usarPacote) usarPacote(b.dataset.usarPacote);
    else if (b.dataset.pct !== undefined) { E.desconto.tipo = "pct"; E.desconto.valor = Number(b.dataset.pct); desenharCliente(); }
    else if (b.dataset.acao) {
      const i = E.linhas.findIndex((x) => x.uid === b.closest("[data-uid]").dataset.uid);
      if (b.dataset.acao === "remover") E.linhas.splice(i, 1);
      else if (i > 0) [E.linhas[i - 1], E.linhas[i]] = [E.linhas[i], E.linhas[i - 1]];
    } else if (b.dataset.guardado !== undefined) {
      const g = ler(CHAVE_GUARDADOS, [])[Number(b.dataset.guardado)];
      if (!g) return;
      E = Object.assign(novoEstado(), g.estado);
      desenharTudo();
      gerar();
      return;
    } else if (b.id === "calc-novo") {
      if (E.linhas.length && !confirmarNovo()) return;
      E = novoEstado();
      $("calc-email").value = ""; $("calc-leitura").textContent = "";
      $("calc-resultado").hidden = true;
    } else if (b.id === "calc-gerar") { gerar(); return; }
    else if (b.id === "calc-imprimir") { imprimir(); return; }
    else if (b.id === "calc-copiar") { copiar(); return; }
    else return;
    desenharTudo();
  });

  // Confirmação sem janelas do browser: o primeiro clique pede confirmação, o segundo (até 4 s) apaga.
  let armado = 0;
  function confirmarNovo() {
    const b = $("calc-novo");
    if (Date.now() - armado < 4000) { armado = 0; b.textContent = "Começar um orçamento novo"; return true; }
    armado = Date.now();
    b.textContent = "Carregue outra vez para apagar este rascunho";
    setTimeout(() => { if (armado && Date.now() - armado >= 4000) { armado = 0; b.textContent = "Começar um orçamento novo"; } }, 4100);
    return false;
  }

  /* ---------- Orçamento final ---------- */
  const Q = {
    pt: { titulo: "Orçamento", numero: "N.º", data: "Data", validade: "Válido até", para: "Para", pedido: "Pedido", servico: "Serviço", qtd: "Qtd.", preco: "Preço", desc: "Desc.", total: "Total",
      projeto: "Projeto · pagamento único", mensal: "Gestão mensal", porMes: "/ mês", porFoto: "/ foto", subtotal: "Subtotal", urgencia: "Urgência (+25%)", iva: "IVA", semIva: "Valores sem IVA.",
      totalP: "Total do projeto", totalM: "Total por mês", compromisso: (m) => `Compromisso mínimo de ${m} ${m === 1 ? "mês" : "meses"}`, geral: "Valor total da proposta",
      sinal: (p) => `Sinal para iniciar (${p}%)`, poupa: "Poupança incluída", separado: "Em separado", notas: "Notas", condicoes: "Condições", notasRedes: "Sobre os planos mensais",
      ola: (n) => `Olá${n ? " " + n : ""},`, intro: "Obrigado pelo seu pedido. Segue a nossa proposta:", fecho: "Qualquer dúvida, é só responder a este e-mail ou falar connosco pelo WhatsApp.", assina: "Equipa Implement",
      assunto: (n, e) => `Orçamento ${n}${e ? " · " + e : ""} · Implement`, aDefinir: "a definir" },
    en: { titulo: "Quote", numero: "No.", data: "Date", validade: "Valid until", para: "For", pedido: "Request", servico: "Service", qtd: "Qty", preco: "Price", desc: "Disc.", total: "Total",
      projeto: "Project · one-off payment", mensal: "Monthly management", porMes: "/ month", porFoto: "/ photo", subtotal: "Subtotal", urgencia: "Rush (+25%)", iva: "VAT", semIva: "Prices exclude VAT.",
      totalP: "Project total", totalM: "Total per month", compromisso: (m) => `Minimum commitment of ${m} ${m === 1 ? "month" : "months"}`, geral: "Total proposal value",
      sinal: (p) => `Deposit to start (${p}%)`, poupa: "Savings included", separado: "Separately", notas: "Notes", condicoes: "Terms", notasRedes: "About the monthly plans",
      ola: (n) => `Hi${n ? " " + n : ""},`, intro: "Thank you for your request. Here is our proposal:", fecho: "If you have any questions, just reply to this email or message us on WhatsApp.", assina: "The Implement team",
      assunto: (n, e) => `Quote ${n}${e ? " · " + e : ""} · Implement`, aDefinir: "to be confirmed" },
  };

  function novoNumero() {
    const d = new Date();
    const letras = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    return `ORC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${[...crypto.getRandomValues(new Uint8Array(3))].map((b) => letras[b % 32]).join("")}`;
  }

  function validar() {
    if (!E.linhas.length) return "Acrescente pelo menos um serviço.";
    const sem = E.linhas.filter((l) => !String(l.nome[E.cliente.idioma] || l.nome.pt).trim());
    if (sem.length) return "Há uma linha sem descrição do serviço.";
    const definir = E.linhas.filter((l) => !num(l.valor));
    if (definir.length) return `Falta o preço de: ${definir.map((l) => l.nome.pt || "linha livre").join(", ")}.`;
    return "";
  }

  function gerar() {
    const erro = validar();
    if (erro) { $("calc-aviso").textContent = erro; return; }
    if (!E.numero) E.numero = novoNumero();
    E.geradoEm = new Date().toISOString();
    const lingua = E.cliente.idioma === "en" ? "en" : "pt";
    const q = Q[lingua];
    const c = contas();
    const m = (n) => moeda(n, lingua);
    const hoje = new Date(E.geradoEm);
    const ate = new Date(hoje.getTime() + Math.max(1, num(E.validade, 30)) * 86400000);
    const dataTxt = (d) => d.toLocaleDateString(lingua === "en" ? "en-GB" : "pt-PT", { day: "numeric", month: "long", year: "numeric" });
    const nome = (l) => l.nome[lingua] || l.nome.pt;
    const desc = (l) => l.desc[lingua] || l.desc.pt;
    const unidade = (l) => (l.mensal ? ` ${q.porMes}` : l.por === "foto" ? ` ${q.porFoto}` : "");

    const linhasHtml = (lista) => lista.map((l) => `<tr>
        <td><strong>${esc(nome(l))}</strong>${desc(l) ? `<small>${esc(desc(l))}</small>` : ""}${l.individual ? `<small>${esc(q.separado)}: <s>${m(l.individual * num(l.qtd))}</s></small>` : ""}</td>
        <td class="n">${esc(num(l.qtd))}</td><td class="n"${num(l.qtd) !== 1 ? ` data-qtd="${esc(num(l.qtd))} × "` : ""}>${m(num(l.valor))}${esc(unidade(l))}</td>
        <td class="n">${num(l.desconto) ? `${num(l.desconto)}%` : "—"}</td><td class="n"><strong>${m(totalLinha(l))}</strong></td></tr>`).join("");
    const cab = `<thead><tr><th>${q.servico}</th><th class="n">${q.qtd}</th><th class="n">${q.preco}</th><th class="n">${q.desc}</th><th class="n">${q.total}</th></tr></thead>`;
    const projeto = E.linhas.filter((l) => !l.mensal), mensal = E.linhas.filter((l) => l.mensal);
    const descNome = (pct) => `${esc(E.desconto.nome || (lingua === "en" ? "Discount" : "Desconto"))}${pct ? ` (${num(E.desconto.valor)}%)` : ""}`;

    let tot = "";
    if (projeto.length) {
      tot += `<div class="folha__bloco"><h3>${q.projeto}</h3><dl>
        <div><dt>${q.subtotal}</dt><dd>${m(c.projeto)}</dd></div>
        ${c.descP ? `<div class="desc"><dt>${descNome(E.desconto.tipo === "pct")}</dt><dd>− ${m(c.descP)}</dd></div>` : ""}
        ${c.urgencia ? `<div><dt>${q.urgencia}</dt><dd>+ ${m(c.urgencia)}</dd></div>` : ""}
        ${E.iva ? `<div><dt>${q.iva} ${num(E.ivaTaxa)}%</dt><dd>+ ${m(c.ivaP)}</dd></div>` : ""}
        <div class="forte"><dt>${q.totalP}</dt><dd>${m(c.totalP)}</dd></div>
        ${num(E.sinal) ? `<div><dt>${q.sinal(num(E.sinal))}</dt><dd>${m(c.sinal)}</dd></div>` : ""}</dl></div>`;
    }
    if (mensal.length) {
      tot += `<div class="folha__bloco"><h3>${q.mensal}</h3><dl>
        <div><dt>${q.subtotal}</dt><dd>${m(c.mensal)} ${q.porMes}</dd></div>
        ${c.descM ? `<div class="desc"><dt>${descNome(true)}</dt><dd>− ${m(c.descM)}</dd></div>` : ""}
        ${E.iva ? `<div><dt>${q.iva} ${num(E.ivaTaxa)}%</dt><dd>+ ${m(c.ivaM)}</dd></div>` : ""}
        <div class="forte"><dt>${q.totalM}</dt><dd>${m(c.totalM)}</dd></div>
        <div><dt>${q.compromisso(c.meses)}</dt><dd>${m(c.totalCompromisso)}</dd></div></dl></div>`;
    }

    const cliente = E.cliente;
    $("calc-folha").innerHTML = `
      <header class="folha__topo">
        <div class="folha__marca"><svg aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg><span>implement</span></div>
        <div class="folha__num"><p class="folha__tipo">${q.titulo}</p><p><strong>${esc(E.numero)}</strong></p><p>${q.data}: ${dataTxt(hoje)}</p><p>${q.validade}: ${dataTxt(ate)}</p></div>
      </header>
      <section class="folha__cliente"><p class="folha__rotulo">${q.para}</p>
        <p><strong>${esc(cliente.empresa || cliente.nome)}</strong></p>
        ${cliente.empresa && cliente.nome ? `<p>${esc(cliente.nome)}</p>` : ""}
        <p>${[cliente.email, cliente.telefone].filter(Boolean).map(esc).join(" · ")}</p>
        ${cliente.referencia ? `<p class="folha__ref">${q.pedido}: ${esc(cliente.referencia)}</p>` : ""}</section>
      ${projeto.length ? `<h2 class="folha__sub">${q.projeto}</h2><table class="folha__tabela">${cab}<tbody>${linhasHtml(projeto)}</tbody></table>` : ""}
      ${mensal.length ? `<h2 class="folha__sub">${q.mensal}</h2><table class="folha__tabela">${cab}<tbody>${linhasHtml(mensal)}</tbody></table>` : ""}
      <div class="folha__totais">${tot}
        ${projeto.length && mensal.length ? `<p class="folha__geral"><span>${q.geral}</span><strong>${m(c.geral)}</strong></p>` : ""}
        ${c.poupanca > 0 ? `<p class="folha__poupa">${q.poupa}: ${m(c.poupanca)}</p>` : ""}
        ${E.iva ? "" : `<p class="folha__iva">${q.semIva}</p>`}</div>
      ${E.notas.trim() ? `<section class="folha__texto"><h3>${q.notas}</h3><p>${esc(E.notas)}</p></section>` : ""}
      ${mensal.length ? `<section class="folha__texto"><h3>${q.notasRedes}</h3><ul>${DADOS.notasRedes.map((n) => `<li>${esc(n[lingua])}</li>`).join("")}</ul></section>` : ""}
      <section class="folha__texto"><h3>${q.condicoes}</h3><p>${esc(DADOS.condicoes[lingua])}</p></section>
      <footer class="folha__rodape">info@heyimplement.com · +351 962 951 161 · heyimplement.com</footer>`;

    // Texto simples (e-mail ou WhatsApp)
    const tl = (lista) => lista.map((l) => `• ${nome(l)}${num(l.qtd) !== 1 ? ` × ${num(l.qtd)}` : ""}${num(l.desconto) ? ` (−${num(l.desconto)}%)` : ""}: ${m(totalLinha(l))}${l.mensal ? " " + q.porMes : ""}`).join("\n");
    const t = [q.ola((cliente.nome || "").split(/\s+/)[0]), "", q.intro, "", `${q.titulo} ${E.numero}${cliente.empresa ? " · " + cliente.empresa : ""}`, ""];
    if (projeto.length) {
      t.push(q.projeto.toUpperCase(), tl(projeto));
      if (c.descP) t.push(`${E.desconto.nome || "Desconto"}: −${m(c.descP)}`);
      if (c.urgencia) t.push(`${q.urgencia}: +${m(c.urgencia)}`);
      if (E.iva) t.push(`${q.iva} ${num(E.ivaTaxa)}%: +${m(c.ivaP)}`);
      t.push(`${q.totalP}: ${m(c.totalP)}`);
      if (num(E.sinal)) t.push(`${q.sinal(num(E.sinal))}: ${m(c.sinal)}`);
      t.push("");
    }
    if (mensal.length) {
      t.push(q.mensal.toUpperCase(), tl(mensal));
      if (c.descM) t.push(`${E.desconto.nome || "Desconto"}: −${m(c.descM)} ${q.porMes}`);
      if (E.iva) t.push(`${q.iva} ${num(E.ivaTaxa)}%: +${m(c.ivaM)} ${q.porMes}`);
      t.push(`${q.totalM}: ${m(c.totalM)}`, `${q.compromisso(c.meses)}: ${m(c.totalCompromisso)}`, "");
    }
    if (projeto.length && mensal.length) t.push(`${q.geral}: ${m(c.geral)}`);
    if (!E.iva) t.push(q.semIva);
    t.push(`${q.validade}: ${dataTxt(ate)}`, "");
    if (E.notas.trim()) t.push(E.notas.trim(), "");
    t.push(`${q.condicoes}: ${DADOS.condicoes[lingua]}`, "", q.fecho, "", q.assina, "info@heyimplement.com · +351 962 951 161");
    E.texto = t.join("\n");
    $("calc-mailto").href = `mailto:${encodeURIComponent(cliente.email || "")}?subject=${encodeURIComponent(q.assunto(E.numero, cliente.empresa))}&body=${encodeURIComponent(E.texto)}`;

    // Guarda na lista deste browser (substitui se o número já existir)
    const lista = ler(CHAVE_GUARDADOS, []).filter((g) => g.numero !== E.numero);
    lista.unshift({ numero: E.numero, data: E.geradoEm, empresa: cliente.empresa, nome: cliente.nome, total: m(c.geral), estado: JSON.parse(JSON.stringify(E)) });
    gravar(CHAVE_GUARDADOS, lista.slice(0, 25));
    desenharGuardados();
    guardar();

    $("calc-resultado").hidden = false;
    $("calc-copiado").textContent = "";
    $("calc-folha").scrollIntoView({ behavior: "smooth", block: "start" });
    $("calc-folha").focus({ preventScroll: true });
  }

  function imprimir() {
    document.documentElement.classList.add("a-imprimir");
    const fim = () => { document.documentElement.classList.remove("a-imprimir"); window.removeEventListener("afterprint", fim); };
    window.addEventListener("afterprint", fim);
    window.print();
  }

  async function copiar() {
    const estado = $("calc-copiado");
    try { await navigator.clipboard.writeText(E.texto || ""); estado.textContent = "Texto copiado."; }
    catch {
      const t = document.createElement("textarea");
      t.value = E.texto || ""; document.body.append(t); t.select();
      const ok = document.execCommand("copy"); t.remove();
      estado.textContent = ok ? "Texto copiado." : "Não consegui copiar. Selecione o texto do orçamento à mão.";
    }
  }

  desenharCatalogo();
  desenharGuardados();
  desenharTudo();
}
