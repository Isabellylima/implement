/* Implement — finanças na área da equipa.
   Rotas: #/financas (painel), #/financas/mes/AAAA-MM, #/financas/fixos, #/financas/clientes.
   Tudo é calculado aqui a partir de três listas: recorrentes (assinaturas, custos fixos, avenças),
   movimentos (gastos variáveis, serviços pontuais, ajustes de um fixo num mês) e clientes. */

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CAT_VARIAVEIS = ["Material", "Publicidade e anúncios", "Software e apps", "Equipamento", "Deslocações", "Alimentação", "Formação", "Impostos e taxas", "Serviços de terceiros", "Outros"];
const CAT_REC = { assinatura: "Assinatura", fixo: "Custo fixo", avenca: "Avença de cliente" };
const PERIODO = { mensal: "por mês", trimestral: "por trimestre", anual: "por ano" };
const COR = { entrada: "#7A45D8", saida: "#E0A126" };
const TAXAS_IVA = [0, 23, 13, 6];
const opIva = (sel, tipo) => TAXAS_IVA.map((t) => `<option value="${t}"${Number(sel || 0) === t ? " selected" : ""}>${t ? (tipo === "saida" ? `Fatura com IVA ${t}%` : `Com IVA ${t}%`) : "Sem IVA"}</option>`).join("");
const trimestreDe = (mes) => Math.floor((Number(mes.slice(5)) - 1) / 3);
const mesesTrimestre = (mes) => { const q = trimestreDe(mes); return [0, 1, 2].map((i) => `${mes.slice(0, 4)}-${String(q * 3 + i + 1).padStart(2, "0")}`); };

const euros = (c, casas = true) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: casas ? 2 : 0, maximumFractionDigits: casas ? 2 : 0 }).format((c || 0) / 100);
const paraInput = (c) => ((c || 0) / 100).toFixed(2).replace(".", ",");
const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => hoje().slice(0, 7);
const mesNome = (m) => `${MESES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const somaMes = (m, n) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const mesesEntre = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5)) - Number(a.slice(5));

/* IVA de uma linha. Entradas: o valor escrito é sem IVA e o IVA soma-se por cima (é o que o cliente paga a mais).
   Saídas: o valor escrito é o total pago na fatura e o IVA está lá dentro (é o que se pode deduzir). */
export const ivaDe = (tipo, valor, taxa) => (!taxa ? 0 : tipo === "entrada" ? Math.round((valor * taxa) / 100) : Math.round((valor * taxa) / (100 + taxa)));

const notaIva = (tipo, valor, taxa) => {
  if (!taxa) return tipo === "entrada" ? " · sem IVA" : "";
  const i = ivaDe(tipo, valor, taxa);
  return tipo === "entrada" ? ` · <span class="fin-iva">+ IVA ${taxa}% (${euros(i)}) · cliente paga ${euros(valor + i)}</span>` : ` · <span class="fin-iva">IVA dedutível ${euros(i)}</span>`;
};

/* Valor total de um fixo (quantidade × preço unitário) */
export const totalRec = (r) => r.valor_c * (r.qtd || 1);

/* ---------- Motor de cálculo ---------- */
export function motor(dados) {
  const { recorrentes, movimentos } = dados;
  const ajustes = new Map(movimentos.filter((m) => m.recorrente_id).map((m) => [`${m.recorrente_id}|${m.data.slice(0, 7)}`, m]));
  const aplica = (r, mes) => {
    if (r.inicio > mes || (r.fim && r.fim < mes)) return false;
    const d = mesesEntre(r.inicio, mes);
    return r.periodicidade === "anual" ? d % 12 === 0 : r.periodicidade === "trimestral" ? d % 3 === 0 : true;
  };
  function linhas(mes) {
    const fixas = recorrentes.filter((r) => aplica(r, mes)).map((r) => {
      const aj = ajustes.get(`${r.id}|${mes}`);
      return { r, valor: aj ? aj.valor_c : totalRec(r), ajuste: aj || null };
    });
    const pontuais = movimentos.filter((m) => !m.recorrente_id && m.data.slice(0, 7) === mes);
    return { fixas, pontuais };
  }
  function totais(mes) {
    const { fixas, pontuais } = linhas(mes);
    const soma = (l) => l.reduce((t, x) => t + (x.valor ?? x.valor_c), 0);
    const t = {
      avencas: soma(fixas.filter((x) => x.r.tipo === "entrada")),
      servicos: soma(pontuais.filter((x) => x.tipo === "entrada")),
      assinaturas: soma(fixas.filter((x) => x.r.categoria === "assinatura")),
      fixos: soma(fixas.filter((x) => x.r.categoria === "fixo")),
      variaveis: soma(pontuais.filter((x) => x.tipo === "saida")),
      ivaCobrado: 0, ivaDedutivel: 0,
    };
    for (const x of fixas) t[x.r.tipo === "entrada" ? "ivaCobrado" : "ivaDedutivel"] += ivaDe(x.r.tipo, x.valor, x.r.iva);
    for (const x of pontuais) t[x.tipo === "entrada" ? "ivaCobrado" : "ivaDedutivel"] += ivaDe(x.tipo, x.valor_c, x.iva);
    return fechar(t);
  }
  // Entradas = o que o cliente paga (valor + IVA); Saídas = o que se paga; Resultado = o que fica depois de entregar o IVA
  function fechar(t) {
    t.entradasBase = t.avencas + t.servicos;
    t.entradas = t.entradasBase + t.ivaCobrado;
    t.saidas = t.assinaturas + t.fixos + t.variaveis;
    t.ivaPagar = t.ivaCobrado - t.ivaDedutivel;
    t.resultado = t.entradas - t.saidas - t.ivaPagar;
    return t;
  }
  // Previsão: meses futuros = fixos + média dos 3 meses anteriores ao mês atual (variáveis e serviços pontuais, sem IVA)
  function medias() {
    const atual = mesAtual();
    const ms = [1, 2, 3].map((n) => somaMes(atual, -n));
    const ts = ms.map(totais);
    return { variaveis: Math.round(ts.reduce((t, x) => t + x.variaveis, 0) / 3), servicos: Math.round(ts.reduce((t, x) => t + x.servicos, 0) / 3) };
  }
  function previsto(mes, comMedias = true) {
    const t = totais(mes);
    if (mes <= mesAtual() || !comMedias) return { ...t, previsao: mes > mesAtual() };
    const md = medias();
    const v = Math.max(t.variaveis, md.variaveis), s = Math.max(t.servicos, md.servicos);
    return fechar({ ...t, variaveis: v, servicos: s, previsao: true, estimado: { variaveis: v - t.variaveis, servicos: s - t.servicos } });
  }
  return { aplica, linhas, totais, previsto, medias };
}

/* ---------- Vista ---------- */
export async function vistaFinancas(caminho, { app, api, aviso, esc, $, $$ }) {
  const partes = caminho.split("/").filter(Boolean); // ["financas", ...]
  const sub = partes[1] || "painel";
  let ano = Number(sessionStorage.getItem("implement-fin-ano")) || new Date().getFullYear();
  if (sub === "mes" && /^\d{4}-\d{2}$/.test(partes[2] || "")) ano = Number(partes[2].slice(0, 4));
  sessionStorage.setItem("implement-fin-ano", ano);
  let dados = await api(`financas/ano?ano=${ano}`);
  let M = motor(dados);
  const cliente = (id) => dados.clientes.find((c) => c.id === id);
  const enviar = (rota, metodo, corpo) => api(`financas/${rota}`, { method: metodo, body: corpo ? JSON.stringify(corpo) : undefined });
  const recarregar = async () => { dados = await api(`financas/ano?ano=${ano}`); M = motor(dados); };

  const separadores = (ativo) => `
    <div class="admin-cabeca fin-cabeca">
      <div><p class="legenda">Gestão</p><h1>Finanças</h1></div>
      ${ativo === "painel" ? `<div class="fin-ano"><a href="#/financas" data-ano="${ano - 1}" aria-label="Ano anterior">‹</a><strong>${ano}</strong><a href="#/financas" data-ano="${ano + 1}" aria-label="Ano seguinte">›</a></div>` : ""}
    </div>
    <nav class="fin-separadores" aria-label="Finanças">
      <a href="#/financas"${ativo === "painel" ? ' aria-current="page"' : ""}>Painel</a>
      <a href="#/financas/mes/${ano === new Date().getFullYear() ? mesAtual() : `${ano}-01`}"${ativo === "mes" ? ' aria-current="page"' : ""}>Mês a mês</a>
      <a href="#/financas/fixos"${ativo === "fixos" ? ' aria-current="page"' : ""}>Fixos e assinaturas</a>
      <a href="#/financas/clientes"${ativo === "clientes" ? ' aria-current="page"' : ""}>Clientes</a>
    </nav>`;

  app.onclick = async (ev) => {
    const a = ev.target.closest("[data-ano]");
    if (a) { ev.preventDefault(); sessionStorage.setItem("implement-fin-ano", a.dataset.ano); vistaFinancas("financas", { app, api, aviso, esc, $, $$ }); }
  };

  if (sub === "mes") return vistaMes(partes[2] || mesAtual());
  if (sub === "fixos") return vistaFixos();
  if (sub === "clientes") return vistaClientes();
  return vistaPainel();

  /* ===== Painel ===== */
  function vistaPainel() {
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
    const ts = meses.map((m) => ({ mes: m, ...M.previsto(m) }));
    const atual = mesAtual();
    const mesFoco = meses.includes(atual) ? atual : meses[0];
    const tf = ts.find((t) => t.mes === mesFoco);
    const anterior = M.totais(somaMes(mesFoco, -1));
    const real = ts.filter((t) => !t.previsao);
    const soma = (l, k) => l.reduce((s, t) => s + t[k], 0);
    const trimestres = [0, 1, 2, 3].map((q) => {
      const l = ts.slice(q * 3, q * 3 + 3);
      return { q: q + 1, l, entradas: soma(l, "entradas"), saidas: soma(l, "saidas"), resultado: soma(l, "resultado"), ivaCobrado: soma(l, "ivaCobrado"), ivaDedutivel: soma(l, "ivaDedutivel"), ivaPagar: soma(l, "ivaPagar"), previsao: l.some((t) => t.previsao), fechados: l.filter((t) => dados.fechos.some((f) => f.mes === t.mes)).length };
    });
    const qAtual = Math.floor((Number(atual.slice(5)) - 1) / 3) + 1;
    const qFoco = trimestres[trimestreDe(mesFoco)];
    const ivaAteAgora = mesesTrimestre(mesFoco).filter((m) => m <= mesFoco).reduce((t, m) => t + M.totais(m).ivaPagar, 0);
    const delta = (a, b) => { if (!b) return ""; const p = Math.round(((a - b) / Math.abs(b)) * 100); return `<span class="fin-delta ${p >= 0 ? "sobe" : "desce"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}% vs. mês anterior</span>`; };
    const porCliente = {};
    for (const m of meses.filter((x) => x <= atual)) {
      const { fixas, pontuais } = M.linhas(m);
      fixas.filter((x) => x.r.tipo === "entrada").forEach((x) => (porCliente[x.r.cliente_id] = (porCliente[x.r.cliente_id] || 0) + x.valor));
      pontuais.filter((x) => x.tipo === "entrada").forEach((x) => (porCliente[x.cliente_id] = (porCliente[x.cliente_id] || 0) + x.valor_c));
    }
    const topo = Object.entries(porCliente).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxCli = topo[0]?.[1] || 1;
    const vazio = !dados.recorrentes.length && !dados.movimentos.length;

    app.innerHTML = `${separadores("painel")}
      ${vazio ? `<div class="fin-boas-vindas"><h2>Comece por aqui</h2><ol>
        <li><a href="#/financas/clientes">Registe os clientes</a>.</li>
        <li>Em <a href="#/financas/fixos">Fixos e assinaturas</a>, acrescente as assinaturas, os custos fixos e as avenças mensais dos clientes. Contam sozinhos todos os meses.</li>
        <li>Em <a href="#/financas/mes/${atual}">Mês a mês</a>, vá lançando os gastos variáveis e os serviços pontuais. No fim do mês, feche-o.</li></ol></div>` : ""}
      <section class="fin-mes-resumo" aria-labelledby="fin-t-mes">
        <div class="fin-mes-resumo__cabeca"><h2 id="fin-t-mes">${mesNome(mesFoco)}</h2><a class="ligacao-seta" href="#/financas/mes/${mesFoco}">Ver o mês</a></div>
        <div class="fin-kpis">
          <div class="fin-kpi"><p>Entradas</p><strong>${euros(tf.entradas)}</strong>${delta(tf.entradas, anterior.entradas)}<small>Avenças ${euros(tf.avencas)} · pontuais ${euros(tf.servicos)}${tf.ivaCobrado ? ` · IVA cobrado ${euros(tf.ivaCobrado)}` : ""}</small></div>
          <div class="fin-kpi"><p>Saídas</p><strong>${euros(tf.saidas)}</strong>${delta(tf.saidas, anterior.saidas)}<small>Fixos e assinaturas ${euros(tf.fixos + tf.assinaturas)} · variáveis ${euros(tf.variaveis)}</small></div>
          <div class="fin-kpi fin-kpi--${tf.resultado >= 0 ? "pos" : "neg"}"><p>Resultado</p><strong>${euros(tf.resultado)}</strong><small>${tf.entradasBase ? `Já sem o IVA a entregar · margem ${Math.round((tf.resultado / tf.entradasBase) * 100)}%` : "Sem entradas registadas"}</small></div>
          <div class="fin-kpi fin-kpi--iva"><p>Separar para o IVA</p><strong>${euros(Math.max(0, ivaAteAgora))}</strong><small>${qFoco.q}.º trimestre até ${MESES[Number(mesFoco.slice(5)) - 1].toLowerCase()}${ivaAteAgora < 0 ? ` · crédito de ${euros(-ivaAteAgora)}` : ""} · previsão do trimestre ${euros(qFoco.ivaPagar)}</small></div>
        </div>
      </section>

      <section class="fin-cartao" aria-labelledby="fin-t-ano">
        <div class="fin-cartao__cabeca"><h2 id="fin-t-ano">Entradas e saídas em ${ano}</h2>
          <div class="fin-legenda"><span><i class="fin-cor fin-cor--entrada"></i>Entradas</span><span><i class="fin-cor fin-cor--saida"></i>Saídas</span><span><i class="fin-cor fin-cor--previsao"></i>Previsão</span></div></div>
        <div class="fin-grafico" id="grafico"></div>
        <p class="fin-nota">A previsão soma os fixos, as assinaturas e as avenças de cada mês com a média dos últimos três meses de gastos variáveis (${euros(M.medias().variaveis)}) e de serviços pontuais (${euros(M.medias().servicos)}).</p>
        <details class="fin-tabela-anual"><summary>Ver os valores em tabela</summary>
          <div class="fin-rolar"><table class="fin-tabela"><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>IVA a entregar</th><th>Resultado</th><th></th></tr></thead><tbody>
          ${ts.map((t) => `<tr${t.previsao ? ' class="previsao"' : ""}><td><a href="#/financas/mes/${t.mes}">${MESES[Number(t.mes.slice(5)) - 1]}</a></td><td>${euros(t.entradas)}</td><td>${euros(t.saidas)}</td><td>${euros(t.ivaPagar)}</td><td class="${t.resultado < 0 ? "neg" : ""}">${euros(t.resultado)}</td><td>${t.previsao ? "Previsão" : dados.fechos.some((f) => f.mes === t.mes) ? "Fechado" : ""}</td></tr>`).join("")}
          </tbody><tfoot><tr><th>${ano}</th><th>${euros(soma(ts, "entradas"))}</th><th>${euros(soma(ts, "saidas"))}</th><th>${euros(soma(ts, "ivaPagar"))}</th><th>${euros(soma(ts, "resultado"))}</th><th></th></tr></tfoot></table></div></details>
      </section>

      <section aria-labelledby="fin-t-tri">
        <h2 id="fin-t-tri" class="fin-titulo">Trimestres <small>para a declaração de 3 em 3 meses</small></h2>
        <div class="fin-trimestres">${trimestres.map((t) => `
          <article class="fin-trimestre${ano === new Date().getFullYear() && t.q === qAtual ? " fin-trimestre--atual" : ""}">
            <header><h3>${t.q}.º trimestre</h3><p>${MESES_CURTOS[(t.q - 1) * 3]} – ${MESES_CURTOS[(t.q - 1) * 3 + 2]}</p>
              <span class="selo ${t.previsao ? "selo--agendado" : t.fechados === 3 ? "selo--publicado" : "selo--rascunho"}">${t.previsao ? (t.l.every((x) => x.previsao) ? "Previsão" : "Em curso") : t.fechados === 3 ? "Fechado" : `${t.fechados}/3 meses fechados`}</span></header>
            <dl><div><dt>Entradas</dt><dd>${euros(t.entradas)}</dd></div><div><dt>Saídas</dt><dd>${euros(t.saidas)}</dd></div>
              <div class="fin-iva-bloco"><dt>IVA cobrado</dt><dd>${euros(t.ivaCobrado)}</dd></div><div class="fin-iva-bloco"><dt>IVA dedutível</dt><dd>− ${euros(t.ivaDedutivel)}</dd></div>
              <div class="fin-iva-total"><dt>${t.ivaPagar >= 0 ? "IVA a entregar" : "IVA a recuperar"}</dt><dd>${euros(Math.abs(t.ivaPagar))}</dd></div>
              <div class="fin-res"><dt>Resultado</dt><dd class="${t.resultado < 0 ? "neg" : ""}">${euros(t.resultado)}</dd></div></dl>
            <button type="button" class="fin-exportar" data-exportar="${t.q}">Exportar para o contabilista (CSV)</button>
          </article>`).join("")}
        </div>
        <p class="fin-total-ano">Total de ${ano}${ts.some((t) => t.previsao) ? " (com previsão)" : ""}: entradas <strong>${euros(soma(ts, "entradas"))}</strong> · saídas <strong>${euros(soma(ts, "saidas"))}</strong> · resultado <strong>${euros(soma(ts, "resultado"))}</strong>${real.length && real.length < 12 ? ` · até agora: resultado <strong>${euros(soma(real, "resultado"))}</strong>` : ""}</p>
      </section>

      ${topo.length ? `<section class="fin-cartao" aria-labelledby="fin-t-cli"><div class="fin-cartao__cabeca"><h2 id="fin-t-cli">Receita por cliente em ${ano}</h2><a class="ligacao-seta" href="#/financas/clientes">Clientes</a></div>
        <ul class="fin-barras">${topo.map(([id, v]) => `<li><span>${esc(cliente(id)?.nome || "—")}</span><span class="fin-barras__barra"><i data-largura="${Math.max(2, Math.round((v / maxCli) * 100))}"></i></span><strong>${euros(v)}</strong></li>`).join("")}</ul></section>` : ""}`;
    $$(".fin-barras i").forEach((i) => (i.style.width = i.dataset.largura + "%"));
    desenharGrafico($("#grafico"), ts);
    app.onclick = async (ev) => {
      const a = ev.target.closest("[data-ano]");
      if (a) { ev.preventDefault(); sessionStorage.setItem("implement-fin-ano", a.dataset.ano); return vistaFinancas("financas", { app, api, aviso, esc, $, $$ }); }
      const ex = ev.target.closest("[data-exportar]");
      if (ex) exportarTrimestre(Number(ex.dataset.exportar));
    };
  }

  function desenharGrafico(caixa, ts) {
    const W = 900, Hh = 300, m = { t: 16, r: 8, b: 30, l: 64 };
    const max = Math.max(1, ...ts.map((t) => Math.max(t.entradas, t.saidas)));
    const passo = [1, 2, 2.5, 5, 10].map((x) => x * 10 ** Math.floor(Math.log10(max / 4))).find((x) => max / x <= 5) || max / 4;
    const topo = Math.ceil(max / passo) * passo;
    const y = (v) => m.t + (Hh - m.t - m.b) * (1 - v / topo);
    const grupo = (W - m.l - m.r) / 12, bw = Math.min(22, grupo * 0.32);
    const atual = mesAtual();
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Entradas e saídas por mês em ${ano}">`;
    for (let v = 0; v <= topo + 1; v += passo) svg += `<line class="fin-g-grelha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="fin-g-eixo" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${euros(v, false)}</text>`;
    const barra = (x, v, tipo, prev) => { const h = Math.max(0, y(0) - y(v)); const r = Math.min(4, h / 2); return v > 0 ? `<path class="fin-g-barra fin-g-barra--${tipo}${prev ? " prev" : ""}" d="M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>` : ""; };
    ts.forEach((t, i) => {
      const cx = m.l + grupo * i + grupo / 2;
      svg += `<g class="fin-g-mes${t.mes === atual ? " atual" : ""}" data-i="${i}"><rect class="fin-g-alvo" x="${m.l + grupo * i}" y="${m.t}" width="${grupo}" height="${Hh - m.t - m.b}"/>`;
      svg += barra(cx - bw - 1, t.entradas, "entrada", t.previsao) + barra(cx + 1, t.saidas, "saida", t.previsao);
      svg += `<text class="fin-g-eixo${t.mes === atual ? " forte" : ""}" x="${cx}" y="${Hh - 8}" text-anchor="middle">${MESES_CURTOS[i]}</text></g>`;
    });
    svg += `<line class="fin-g-zero" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/></svg><div class="fin-dica" role="status" hidden></div>`;
    caixa.innerHTML = svg;
    const dica = $(".fin-dica", caixa);
    const mostrar = (g) => {
      const t = ts[Number(g.dataset.i)];
      $$(".fin-g-mes", caixa).forEach((x) => x.classList.toggle("ativo", x === g));
      dica.innerHTML = `<strong>${mesNome(t.mes)}${t.previsao ? " · previsão" : ""}</strong><span><i class="fin-cor fin-cor--entrada"></i>Entradas <b>${euros(t.entradas)}</b></span><span><i class="fin-cor fin-cor--saida"></i>Saídas <b>${euros(t.saidas)}</b></span><span>Resultado <b>${euros(t.resultado)}</b></span>`;
      dica.hidden = false;
      const caixaR = caixa.getBoundingClientRect(), gr = g.getBoundingClientRect();
      const x = gr.left - caixaR.left + gr.width / 2;
      dica.style.left = Math.min(caixaR.width - 190, Math.max(0, x - 95)) + "px";
    };
    caixa.addEventListener("pointermove", (ev) => { const g = ev.target.closest(".fin-g-mes"); if (g) mostrar(g); });
    caixa.addEventListener("pointerleave", () => { dica.hidden = true; $$(".fin-g-mes", caixa).forEach((x) => x.classList.remove("ativo")); });
    caixa.addEventListener("click", (ev) => { const g = ev.target.closest(".fin-g-mes"); if (g) location.hash = `#/financas/mes/${ts[Number(g.dataset.i)].mes}`; });
  }

  function exportarTrimestre(q) {
    const meses = [0, 1, 2].map((i) => `${ano}-${String((q - 1) * 3 + i + 1).padStart(2, "0")}`);
    const linhasCsv = [["Data", "Tipo", "Categoria", "Descrição", "Cliente", "Valor sem IVA (EUR)", "Taxa IVA", "IVA (EUR)", "Total (EUR)"]];
    const num = (c) => (c / 100).toFixed(2).replace(".", ",");
    const valores = (tipo, valor, taxa) => { const i = ivaDe(tipo, valor, taxa); const base = tipo === "entrada" ? valor : valor - i; return [num(base), taxa ? `${taxa}%` : "Sem IVA", num(i), num(base + i)]; };
    for (const mes of meses) {
      const { fixas, pontuais } = M.linhas(mes);
      fixas.filter((x) => x.valor > 0).forEach((x) => linhasCsv.push([x.ajuste?.data || `${mes}-01`, x.r.tipo === "entrada" ? "Entrada" : "Saída", CAT_REC[x.r.categoria], x.r.descricao, cliente(x.r.cliente_id)?.nome || "", ...valores(x.r.tipo, x.valor, x.r.iva)]));
      pontuais.forEach((x) => linhasCsv.push([x.data, x.tipo === "entrada" ? "Entrada" : "Saída", x.tipo === "entrada" ? "Serviço" : x.categoria || "Variável", x.descricao, cliente(x.cliente_id)?.nome || "", ...valores(x.tipo, x.valor_c, x.iva)]));
    }
    const cab = linhasCsv.shift();
    linhasCsv.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const tq = [0, 1, 2].map((i) => M.totais(meses[i])).reduce((a, t) => ({ c: a.c + t.ivaCobrado, d: a.d + t.ivaDedutivel }), { c: 0, d: 0 });
    linhasCsv.unshift(cab);
    linhasCsv.push([], ["", "", "", "IVA cobrado (liquidado)", "", "", "", num(tq.c), ""], ["", "", "", "IVA dedutível", "", "", "", num(tq.d), ""], ["", "", "", tq.c - tq.d >= 0 ? "IVA a entregar" : "IVA a recuperar", "", "", "", num(Math.abs(tq.c - tq.d)), ""]);
    const csv = "﻿" + linhasCsv.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `implement-${ano}-T${q}.csv`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function lerIva(tipo) { try { return Number(localStorage.getItem(`implement-fin-iva-${tipo}`) || 0); } catch { return 0; } }

  /* ===== Mês ===== */
  async function vistaMes(mes) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) mes = mesAtual();
    if (Number(mes.slice(0, 4)) !== ano) { ano = Number(mes.slice(0, 4)); sessionStorage.setItem("implement-fin-ano", ano); await recarregar(); }
    const desenhar = () => {
      const { fixas, pontuais } = M.linhas(mes);
      const t = M.previsto(mes, false);
      const fecho = dados.fechos.find((f) => f.mes === mes);
      const futuro = mes > mesAtual();
      const diaPadrao = mes === mesAtual() ? hoje() : `${mes}-01`;
      const clientesAtivos = dados.clientes.filter((c) => c.ativo);
      const opClientes = (sel) => `<option value="">Cliente…</option>${clientesAtivos.map((c) => `<option value="${c.id}"${c.id === sel ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}<option value="__novo">+ Novo cliente…</option>`;
      const linhaFixa = (x) => `<li class="fin-linha${x.valor === 0 ? " fin-linha--saltado" : ""}" data-rec="${x.r.id}">
          <div class="fin-linha__desc"><strong>${esc(x.r.descricao)}${(x.r.qtd || 1) > 1 ? ` <span class="fin-qtd">× ${x.r.qtd}</span>` : ""}</strong><span>${x.r.tipo === "entrada" ? esc(cliente(x.r.cliente_id)?.nome || "") : CAT_REC[x.r.categoria]}${x.r.periodicidade !== "mensal" ? ` · ${PERIODO[x.r.periodicidade]}` : ""}${x.ajuste ? (x.valor === 0 ? " · <em>não houve este mês</em>" : " · <em>ajustado este mês</em>") : ""}${x.valor ? notaIva(x.r.tipo, x.valor, x.r.iva) : ""}</span></div>
          <label class="sr-only" for="aj-${x.r.id}">Valor em ${mesNome(mes)}</label>
          <input class="entrada fin-valor" id="aj-${x.r.id}" data-ajustar inputmode="decimal" value="${paraInput(x.valor)}" ${fecho ? "disabled" : ""}>
          <div class="fin-linha__acoes">${fecho ? "" : x.ajuste ? `<button type="button" data-repor title="Voltar ao valor habitual (${euros(totalRec(x.r))})">Repor</button>` : `<button type="button" data-saltar title="Não conta neste mês">Não houve</button>`}</div></li>`;
      const linhaPontual = (x) => `<li class="fin-linha" data-mov="${x.id}">
          <div class="fin-linha__desc"><strong>${esc(x.descricao)}</strong><span>${new Date(x.data + "T12:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} · ${x.tipo === "entrada" ? esc(cliente(x.cliente_id)?.nome || "") : esc(x.categoria || "Variável")}${notaIva(x.tipo, x.valor_c, x.iva)}</span></div>
          <span class="fin-linha__valor">${euros(x.valor_c)}</span>
          <div class="fin-linha__acoes">${fecho ? "" : `<button type="button" data-apagar-mov aria-label="Apagar ${esc(x.descricao)}">×</button>`}</div></li>`;
      const fixasSaida = fixas.filter((x) => x.r.tipo === "saida"), fixasEntrada = fixas.filter((x) => x.r.tipo === "entrada");
      const varSaida = pontuais.filter((x) => x.tipo === "saida"), pontEntrada = pontuais.filter((x) => x.tipo === "entrada");
      app.innerHTML = `${separadores("mes")}
        <div class="fin-mes-nav"><a href="#/financas/mes/${somaMes(mes, -1)}" aria-label="Mês anterior">‹</a><h2>${mesNome(mes)}</h2><a href="#/financas/mes/${somaMes(mes, 1)}" aria-label="Mês seguinte">›</a>
          ${fecho ? `<span class="selo selo--publicado">Fechado</span>` : futuro ? `<span class="selo selo--agendado">Mês futuro</span>` : `<span class="selo selo--rascunho">Em aberto</span>`}</div>
        <div class="fin-kpis">
          <div class="fin-kpi"><p>Entradas</p><strong>${euros(t.entradas)}</strong><small>${t.ivaCobrado ? `${euros(t.entradasBase)} + IVA cobrado ${euros(t.ivaCobrado)}` : "Sem IVA cobrado"}</small></div>
          <div class="fin-kpi"><p>Saídas</p><strong>${euros(t.saidas)}</strong><small>${t.ivaDedutivel ? `Inclui IVA dedutível ${euros(t.ivaDedutivel)}` : "Sem IVA dedutível"}</small></div>
          <div class="fin-kpi fin-kpi--iva"><p>Separar para o IVA</p><strong>${euros(Math.max(0, t.ivaPagar))}</strong><small>${t.ivaPagar < 0 ? `Crédito de ${euros(-t.ivaPagar)} · ` : ""}${trimestreDe(mes) + 1}.º trimestre até agora: ${euros(mesesTrimestre(mes).filter((m) => m <= mes).reduce((s, m) => s + M.totais(m).ivaPagar, 0))}</small></div>
          <div class="fin-kpi fin-kpi--${t.resultado >= 0 ? "pos" : "neg"}"><p>Resultado</p><strong>${euros(t.resultado)}</strong><small>O que fica, já sem o IVA a entregar</small></div>
        </div>
        <div class="fin-colunas">
          <section class="fin-cartao" aria-labelledby="fin-t-saidas">
            <div class="fin-cartao__cabeca"><h2 id="fin-t-saidas">Saídas <span>${euros(t.saidas)}</span></h2></div>
            <h3 class="fin-sub">Fixos e assinaturas <span>${euros(t.fixos + t.assinaturas)}</span></h3>
            ${fixasSaida.length ? `<ul class="fin-linhas">${fixasSaida.map(linhaFixa).join("")}</ul>` : `<p class="fin-vazio">Sem fixos neste mês. <a href="#/financas/fixos">Acrescentar assinaturas e custos fixos</a></p>`}
            <h3 class="fin-sub">Gastos variáveis <span>${euros(t.variaveis)}</span></h3>
            ${fecho ? "" : `<form class="fin-nova" data-nova="saida">
              <input class="entrada" type="date" name="data" value="${diaPadrao}" min="${mes}-01" max="${mes}-31" aria-label="Data" required>
              <input class="entrada" name="descricao" placeholder="O que foi?" aria-label="Descrição" maxlength="160" required>
              <select class="entrada" name="categoria" aria-label="Categoria">${CAT_VARIAVEIS.map((c) => `<option>${c}</option>`).join("")}</select>
              <select class="entrada fin-nova__iva" name="iva" aria-label="IVA da fatura">${opIva(lerIva("saida"), "saida")}</select>
              <input class="entrada fin-valor" name="valor" inputmode="decimal" placeholder="Total pago €" aria-label="Valor pago (com IVA, se houver)" required>
              <button class="botao botao--pequeno" type="submit"><span>Adicionar</span></button></form>`}
            ${varSaida.length ? `<ul class="fin-linhas">${varSaida.map(linhaPontual).join("")}</ul>` : `<p class="fin-vazio">Ainda sem gastos variáveis.</p>`}
          </section>
          <section class="fin-cartao" aria-labelledby="fin-t-entradas">
            <div class="fin-cartao__cabeca"><h2 id="fin-t-entradas">Entradas <span>${euros(t.entradas)}</span></h2></div>
            <h3 class="fin-sub">Avenças de clientes <span>${euros(t.avencas)}</span></h3>
            ${fixasEntrada.length ? `<ul class="fin-linhas">${fixasEntrada.map(linhaFixa).join("")}</ul>` : `<p class="fin-vazio">Sem avenças neste mês. <a href="#/financas/fixos">Acrescentar uma avença</a></p>`}
            <h3 class="fin-sub">Serviços pontuais <span>${euros(t.servicos)}</span></h3>
            ${fecho ? "" : `<form class="fin-nova" data-nova="entrada">
              <input class="entrada" type="date" name="data" value="${diaPadrao}" min="${mes}-01" max="${mes}-31" aria-label="Data" required>
              <select class="entrada" name="cliente_id" aria-label="Cliente" required>${opClientes("")}</select>
              <input class="entrada" name="descricao" placeholder="Serviço feito" aria-label="Serviço" maxlength="160" required>
              <select class="entrada fin-nova__iva" name="iva" aria-label="IVA">${opIva(lerIva("entrada"), "entrada")}</select>
              <input class="entrada fin-valor" name="valor" inputmode="decimal" placeholder="Valor sem IVA €" aria-label="Valor sem IVA" required>
              <button class="botao botao--pequeno" type="submit"><span>Adicionar</span></button></form>`}
            ${pontEntrada.length ? `<ul class="fin-linhas">${pontEntrada.map(linhaPontual).join("")}</ul>` : `<p class="fin-vazio">Ainda sem serviços pontuais.</p>`}
          </section>
        </div>
        <section class="fin-fecho">
          ${fecho ? `<p><strong>Mês fechado</strong> em ${new Date(fecho.fechado_em).toLocaleDateString("pt-PT")} por ${esc(fecho.por)}: entradas ${euros(fecho.entradas_c)}, saídas ${euros(fecho.saidas_c)}, resultado ${euros(fecho.entradas_c - fecho.saidas_c)}.${fecho.entradas_c !== t.entradas || fecho.saidas_c !== t.saidas ? " <em>Os valores mudaram depois do fecho.</em>" : ""}</p><button type="button" class="botao botao--secundario botao--pequeno" data-reabrir><span>Reabrir o mês</span></button>`
            : futuro ? `<p>Pode lançar já gastos ou serviços combinados para este mês; contam na previsão.</p>`
            : `<p>Quando tudo estiver lançado, feche o mês: os valores ficam bloqueados e o trimestre fica pronto para a declaração.</p><button type="button" class="botao botao--pequeno" data-fechar><span>Fechar ${MESES[Number(mes.slice(5)) - 1].toLowerCase()}</span></button>`}
        </section>`;
    };
    desenhar();
    const repintar = async () => { await recarregar(); desenhar(); };
    app.onclick = async (ev) => {
      const li = ev.target.closest(".fin-linha");
      try {
        if (ev.target.closest("[data-saltar]")) { await enviar("movimentos", "POST", { tipo: dados.recorrentes.find((r) => r.id === li.dataset.rec).tipo, data: `${mes}-01`, descricao: "Não houve neste mês", valor: 0, recorrente_id: li.dataset.rec }); return repintar(); }
        if (ev.target.closest("[data-repor]")) { const aj = M.linhas(mes).fixas.find((x) => x.r.id === li.dataset.rec).ajuste; await enviar(`movimentos/${aj.id}`, "DELETE"); return repintar(); }
        if (ev.target.closest("[data-apagar-mov]")) { if (!confirm("Apagar esta linha?")) return; await enviar(`movimentos/${li.dataset.mov}`, "DELETE"); aviso("Linha apagada."); return repintar(); }
        if (ev.target.closest("[data-fechar]")) { const t = M.totais(mes); await enviar(`fechos/${mes}`, "PUT", { entradas: t.entradas / 100, saidas: t.saidas / 100 }); aviso(`${mesNome(mes)} fechado.`); return repintar(); }
        if (ev.target.closest("[data-reabrir]")) { await enviar(`fechos/${mes}`, "DELETE"); return repintar(); }
      } catch (e) { aviso(e.message, "erro", 6000); }
    };
    app.onchange = async (ev) => {
      if (ev.target.name === "cliente_id" && ev.target.value === "__novo") {
        const nome = prompt("Nome do novo cliente:");
        if (!nome || !nome.trim()) { ev.target.value = ""; return; }
        try { const r = await enviar("clientes", "POST", { nome }); await recarregar(); const sel = ev.target; sel.innerHTML = `<option value="">Cliente…</option>${dados.clientes.filter((c) => c.ativo).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}<option value="__novo">+ Novo cliente…</option>`; sel.value = r.id; aviso("Cliente criado."); }
        catch (e) { aviso(e.message, "erro"); ev.target.value = ""; }
        return;
      }
      if (ev.target.name === "cliente_id" && ev.target.closest("[data-nova]")) {
        const c = cliente(ev.target.value);
        if (c) ev.target.closest("form").elements.iva.value = String(c.iva || 0);
        return;
      }
      if (ev.target.matches("[data-ajustar]")) {
        const li = ev.target.closest(".fin-linha");
        const r = dados.recorrentes.find((x) => x.id === li.dataset.rec);
        try { await enviar("movimentos", "POST", { tipo: r.tipo, data: `${mes}-01`, descricao: `${r.descricao} (ajuste)`, valor: ev.target.value, recorrente_id: r.id }); aviso("Valor deste mês atualizado."); await repintar(); }
        catch (e) { aviso(e.message, "erro", 6000); }
      }
    };
    app.onsubmit = async (ev) => {
      const f = ev.target.closest("[data-nova]");
      if (!f) return;
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      try {
        await enviar("movimentos", "POST", { ...d, tipo: f.dataset.nova });
        try { localStorage.setItem(`implement-fin-iva-${f.dataset.nova}`, d.iva); } catch { /* sem armazenamento */ }
        aviso(f.dataset.nova === "entrada" ? "Serviço registado." : "Gasto registado.");
        await repintar();
        $(`[data-nova="${f.dataset.nova}"] [name="descricao"]`)?.focus();
      } catch (e) { aviso(e.message, "erro", 6000); }
    };
  }

  /* ===== Fixos e assinaturas ===== */
  function vistaFixos() {
    const equivalenteMes = (r) => (r.periodicidade === "anual" ? totalRec(r) / 12 : r.periodicidade === "trimestral" ? totalRec(r) / 3 : totalRec(r));
    const ativo = (r) => !r.fim || r.fim >= mesAtual();
    const grupos = [["assinatura", "Assinaturas", "Canva, Adobe, Google Workspace, apps…"], ["fixo", "Custos fixos", "Contabilista, internet, telemóvel, renda, seguros…"], ["avenca", "Avenças de clientes", "O que cada cliente paga todos os meses"]];
    const opClientes = (sel) => dados.clientes.filter((c) => c.ativo || c.id === sel).map((c) => `<option value="${c.id}"${c.id === sel ? " selected" : ""}>${esc(c.nome)}</option>`).join("");
    const formulario = (r = {}) => `
      <form class="fin-form" data-rec-form="${r.id || ""}">
        <div class="fin-form__grelha">
          <label>Tipo<select class="entrada" name="categoria">${Object.entries(CAT_REC).map(([k, v]) => `<option value="${k}"${r.categoria === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
          <label class="fin-form__cliente"${r.categoria === "avenca" ? "" : " hidden"}>Cliente<select class="entrada" name="cliente_id"><option value="">Escolher…</option>${opClientes(r.cliente_id)}</select></label>
          <label class="fin-form__largo">Descrição<input class="entrada" name="descricao" maxlength="140" required value="${esc(r.descricao || "")}" placeholder="ex.: Canva Pro"></label>
          <label class="fin-form__qtd">Quantidade<input class="entrada" name="qtd" type="number" min="1" max="999" step="1" inputmode="numeric" value="${r.qtd || 1}"></label>
          <label><span data-rotulo-valor>${r.categoria === "avenca" ? "Valor sem IVA (€)" : "Valor pago por unidade (€)"}</span><input class="entrada" name="valor" inputmode="decimal" required value="${r.valor_c ? paraInput(r.valor_c) : ""}" placeholder="0,00"></label>
          <label><span data-rotulo-iva>${r.categoria === "avenca" ? "IVA cobrado ao cliente" : "IVA na fatura"}</span><select class="entrada" name="iva">${opIva(r.iva, r.categoria === "avenca" ? "entrada" : "saida")}</select></label>
          <label>Repete<select class="entrada" name="periodicidade">${Object.entries(PERIODO).map(([k, v]) => `<option value="${k}"${(r.periodicidade || "mensal") === k ? " selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></label>
          <label>Desde<input class="entrada" type="month" name="inicio" required value="${r.inicio || mesAtual()}"></label>
          <label><span>Até <span class="opcional">(opcional)</span></span><input class="entrada" type="month" name="fim" value="${r.fim || ""}"></label>
        </div>
        <div class="fin-form__acoes"><button class="botao botao--pequeno" type="submit"><span>${r.id ? "Guardar" : "Acrescentar"}</span></button>${r.id ? '<button type="button" class="fin-cancelar" data-cancelar>Cancelar</button>' : ""}</div>
      </form>`;
    const desenhar = (editar = null) => {
      const totalMes = (k) => dados.recorrentes.filter((r) => r.categoria === k && ativo(r)).reduce((t, r) => t + equivalenteMes(r), 0);
      app.innerHTML = `${separadores("fixos")}
        <div class="fin-kpis fin-kpis--mes">
          <div class="fin-kpi"><p>Assinaturas por mês</p><strong>${euros(totalMes("assinatura"))}</strong><small>${euros(totalMes("assinatura") * 12)} por ano</small></div>
          <div class="fin-kpi"><p>Custos fixos por mês</p><strong>${euros(totalMes("fixo"))}</strong><small>${euros(totalMes("fixo") * 12)} por ano</small></div>
          <div class="fin-kpi fin-kpi--pos"><p>Avenças por mês</p><strong>${euros(totalMes("avenca"))}</strong><small>${euros(totalMes("avenca") * 12)} por ano</small></div>
        </div>
        <section class="fin-cartao"><h2 class="fin-titulo">Acrescentar</h2>${formulario()}</section>
        ${grupos.map(([k, t, dica]) => {
          const l = dados.recorrentes.filter((r) => r.categoria === k).sort((a, b) => Number(ativo(b)) - Number(ativo(a)) || a.descricao.localeCompare(b.descricao));
          return `<section class="fin-cartao"><div class="fin-cartao__cabeca"><h2>${t} <span>${euros(totalMes(k))} / mês</span></h2></div>
            ${l.length ? `<ul class="fin-linhas">${l.map((r) => editar === r.id ? `<li class="fin-linha fin-linha--editar">${formulario(r)}</li>` : `<li class="fin-linha${ativo(r) ? "" : " fin-linha--terminado"}" data-rec="${r.id}">
              <div class="fin-linha__desc"><strong>${esc(r.descricao)}</strong><span>${k === "avenca" ? esc(cliente(r.cliente_id)?.nome || "") + " · " : ""}desde ${MESES_CURTOS[Number(r.inicio.slice(5)) - 1]} ${r.inicio.slice(0, 4)}${r.fim ? ` até ${MESES_CURTOS[Number(r.fim.slice(5)) - 1]} ${r.fim.slice(0, 4)}` : ""}${ativo(r) ? "" : " · terminado"}</span></div>
              <span class="fin-linha__valor">${(r.qtd || 1) > 1 ? `<small class="fin-qtd">${r.qtd} × ${euros(r.valor_c)} =</small> ` : ""}${euros(totalRec(r))} <small>${PERIODO[r.periodicidade]}</small><small class="fin-linha__iva">${r.iva ? (r.tipo === "entrada" ? `+ IVA ${r.iva}%` : `IVA ${r.iva}% dedutível`) : r.tipo === "entrada" ? "sem IVA" : ""}</small></span>
              <div class="fin-linha__acoes"><button type="button" data-editar>Editar</button>${ativo(r) && !r.fim ? '<button type="button" data-terminar title="Deixa de contar a partir do próximo mês">Terminar</button>' : ""}<button type="button" data-apagar-rec aria-label="Apagar">×</button></div></li>`).join("")}</ul>`
              : `<p class="fin-vazio">${dica}</p>`}</section>`;
        }).join("")}`;
    };
    desenhar();
    app.onchange = (ev) => {
      const f = ev.target.closest("form");
      if (ev.target.name === "categoria") {
        const av = ev.target.value === "avenca";
        $(".fin-form__cliente", f).hidden = !av;
        $("[data-rotulo-iva]", f).textContent = av ? "IVA cobrado ao cliente" : "IVA na fatura";
        $("[data-rotulo-valor]", f).textContent = av ? "Valor sem IVA (€)" : "Valor pago por unidade (€)";
        const v = f.elements.iva.value;
        f.elements.iva.innerHTML = opIva(v, av ? "entrada" : "saida");
      }
      if (ev.target.name === "cliente_id" && f) { const c = cliente(ev.target.value); if (c) f.elements.iva.value = String(c.iva || 0); }
    };
    app.onclick = async (ev) => {
      const li = ev.target.closest("[data-rec]");
      try {
        if (ev.target.closest("[data-editar]")) return desenhar(li.dataset.rec);
        if (ev.target.closest("[data-cancelar]")) return desenhar();
        if (ev.target.closest("[data-terminar]")) {
          const r = dados.recorrentes.find((x) => x.id === li.dataset.rec);
          await enviar(`recorrentes/${r.id}`, "PUT", { ...r, valor: r.valor_c / 100, fim: mesAtual() < r.inicio ? r.inicio : mesAtual() });
          aviso(`«${r.descricao}» deixa de contar a partir do próximo mês.`); await recarregar(); return desenhar();
        }
        if (ev.target.closest("[data-apagar-rec]")) {
          const r = dados.recorrentes.find((x) => x.id === li.dataset.rec);
          if (!confirm(`Apagar «${r.descricao}» de todos os meses, incluindo os passados? Para deixar de contar daqui para a frente, use «Terminar».`)) return;
          await enviar(`recorrentes/${r.id}`, "DELETE"); aviso("Apagado."); await recarregar(); return desenhar();
        }
      } catch (e) { aviso(e.message, "erro", 6000); }
    };
    app.onsubmit = async (ev) => {
      const f = ev.target.closest("[data-rec-form]");
      if (!f) return;
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      d.tipo = d.categoria === "avenca" ? "entrada" : "saida";
      if (d.categoria !== "avenca") d.cliente_id = "";
      try {
        if (f.dataset.recForm) await enviar(`recorrentes/${f.dataset.recForm}`, "PUT", d); else await enviar("recorrentes", "POST", d);
        aviso("Guardado."); await recarregar(); desenhar();
      } catch (e) { aviso(e.message, "erro", 6000); }
    };
  }

  /* ===== Clientes ===== */
  function vistaClientes() {
    const atual = mesAtual();
    const resumo = (c) => {
      const avenca = dados.recorrentes.filter((r) => r.cliente_id === c.id && r.inicio <= atual && (!r.fim || r.fim >= atual)).reduce((t, r) => t + (r.periodicidade === "anual" ? totalRec(r) / 12 : r.periodicidade === "trimestral" ? totalRec(r) / 3 : totalRec(r)), 0);
      let ano_ = 0, servicos = 0;
      for (let i = 1; i <= 12; i++) {
        const mes = `${ano}-${String(i).padStart(2, "0")}`;
        if (mes > atual) break;
        const { fixas, pontuais } = M.linhas(mes);
        ano_ += fixas.filter((x) => x.r.cliente_id === c.id).reduce((t, x) => t + x.valor, 0);
        const p = pontuais.filter((x) => x.tipo === "entrada" && x.cliente_id === c.id);
        servicos += p.length; ano_ += p.reduce((t, x) => t + x.valor_c, 0);
      }
      return { avenca, ano: ano_, servicos };
    };
    const formulario = (c = {}) => `<form class="fin-form" data-cli-form="${c.id || ""}"><div class="fin-form__grelha">
        <label class="fin-form__largo">Nome<input class="entrada" name="nome" required maxlength="120" value="${esc(c.nome || "")}" placeholder="ex.: Tasca do Mar"></label>
        <label><span>Contacto <span class="opcional">(opcional)</span></span><input class="entrada" name="contacto" maxlength="200" value="${esc(c.contacto || "")}" placeholder="e-mail ou telefone"></label>
        <label><span>NIF <span class="opcional">(opcional)</span></span><input class="entrada" name="nif" maxlength="20" value="${esc(c.nif || "")}"></label>
        <label>Faturação<select class="entrada" name="iva">${opIva(c.iva, "entrada")}</select></label>
        <label class="fin-form__largo"><span>Notas <span class="opcional">(opcional)</span></span><input class="entrada" name="notas" maxlength="600" value="${esc(c.notas || "")}"></label>
      </div><div class="fin-form__acoes"><button class="botao botao--pequeno" type="submit"><span>${c.id ? "Guardar" : "Acrescentar cliente"}</span></button>${c.id ? '<button type="button" class="fin-cancelar" data-cancelar>Cancelar</button>' : ""}</div></form>`;
    const desenhar = (editar = null) => {
      const lista = dados.clientes.map((c) => ({ c, ...resumo(c) })).sort((a, b) => b.c.ativo - a.c.ativo || b.ano - a.ano);
      app.innerHTML = `${separadores("clientes")}
        <section class="fin-cartao"><h2 class="fin-titulo">Novo cliente</h2>${formulario()}</section>
        <section class="fin-cartao"><div class="fin-cartao__cabeca"><h2>Clientes <span>${dados.clientes.filter((c) => c.ativo).length} ativos</span></h2></div>
        ${lista.length ? `<div class="fin-rolar"><table class="fin-tabela fin-tabela--clientes"><thead><tr><th>Cliente</th><th>Faturação</th><th>Avença / mês</th><th>Serviços pontuais em ${ano}</th><th>Faturado em ${ano} <small>(sem IVA)</small></th><th></th></tr></thead><tbody>
          ${lista.map(({ c, avenca, ano: total, servicos }) => editar === c.id ? `<tr><td colspan="6">${formulario(c)}</td></tr>` : `<tr data-cli="${c.id}"${c.ativo ? "" : ' class="inativo"'}>
            <td><strong>${esc(c.nome)}</strong>${c.contacto || c.nif ? `<small>${esc([c.contacto, c.nif && "NIF " + c.nif].filter(Boolean).join(" · "))}</small>` : ""}${c.ativo ? "" : "<small>Inativo</small>"}</td>
            <td>${c.iva ? `Com IVA ${c.iva}%` : "Sem IVA"}</td><td>${avenca ? euros(avenca) : "—"}</td><td>${servicos || "—"}</td><td><strong>${euros(total)}</strong></td>
            <td class="fin-acoes-tabela"><button type="button" data-editar>Editar</button><button type="button" data-ativo>${c.ativo ? "Desativar" : "Reativar"}</button><button type="button" data-apagar-cli aria-label="Apagar">×</button></td></tr>`).join("")}
          </tbody></table></div>` : `<p class="fin-vazio">Ainda sem clientes. Depois de os registar, junte as avenças em «Fixos e assinaturas» e os serviços pontuais em «Mês a mês».</p>`}</section>`;
    };
    desenhar();
    app.onclick = async (ev) => {
      const tr = ev.target.closest("[data-cli]");
      try {
        if (ev.target.closest("[data-editar]")) return desenhar(tr.dataset.cli);
        if (ev.target.closest("[data-cancelar]")) return desenhar();
        if (ev.target.closest("[data-ativo]")) { const c = cliente(tr.dataset.cli); await enviar(`clientes/${c.id}`, "PUT", { ...c, ativo: !c.ativo }); await recarregar(); return desenhar(); }
        if (ev.target.closest("[data-apagar-cli]")) { const c = cliente(tr.dataset.cli); if (!confirm(`Apagar ${c.nome}?`)) return; await enviar(`clientes/${c.id}`, "DELETE"); await recarregar(); aviso("Cliente apagado."); return desenhar(); }
      } catch (e) { aviso(e.message, "erro", 7000); }
    };
    app.onsubmit = async (ev) => {
      const f = ev.target.closest("[data-cli-form]");
      if (!f) return;
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      try {
        if (f.dataset.cliForm) await enviar(`clientes/${f.dataset.cliForm}`, "PUT", { ...cliente(f.dataset.cliForm), ...d, ativo: Boolean(cliente(f.dataset.cliForm).ativo) }); else await enviar("clientes", "POST", d);
        aviso("Guardado."); await recarregar(); desenhar();
      } catch (e) { aviso(e.message, "erro", 6000); }
    };
  }
}
