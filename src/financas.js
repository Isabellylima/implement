/* Implement — finanças (só para a equipa, dentro de /api/admin/financas/*).
   Valores guardados em cêntimos (inteiros) para não haver erros de arredondamento.

   fin_clientes     clientes
   fin_recorrentes  o que se repete: assinaturas, custos fixos (saídas) e avenças de clientes (entradas)
   fin_movimentos   o que acontece uma vez: gastos variáveis, serviços pontuais; também ajustes de um recorrente num mês
   fin_fechos       meses fechados (com os totais nesse momento) */

export const ESQUEMA_FINANCAS = [
  "CREATE TABLE IF NOT EXISTS fin_clientes (id TEXT PRIMARY KEY, nome TEXT NOT NULL, contacto TEXT NOT NULL DEFAULT '', nif TEXT NOT NULL DEFAULT '', notas TEXT NOT NULL DEFAULT '', ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS fin_recorrentes (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, categoria TEXT NOT NULL, descricao TEXT NOT NULL, valor_c INTEGER NOT NULL, periodicidade TEXT NOT NULL DEFAULT 'mensal', inicio TEXT NOT NULL, fim TEXT, cliente_id TEXT, notas TEXT NOT NULL DEFAULT '', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS fin_movimentos (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, data TEXT NOT NULL, descricao TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT '', valor_c INTEGER NOT NULL, cliente_id TEXT, recorrente_id TEXT, notas TEXT NOT NULL DEFAULT '', criado_em TEXT NOT NULL, criado_por TEXT NOT NULL DEFAULT '');",
  "CREATE INDEX IF NOT EXISTS fin_movimentos_data ON fin_movimentos (data);",
  "CREATE TABLE IF NOT EXISTS fin_fechos (mes TEXT PRIMARY KEY, fechado_em TEXT NOT NULL, por TEXT NOT NULL, entradas_c INTEGER NOT NULL, saidas_c INTEGER NOT NULL, notas TEXT NOT NULL DEFAULT '');",
];

/* Colunas acrescentadas depois da primeira versão (o ADD COLUMN falha se já existir: ignora-se) */
export async function migrarFinancas(db) {
  for (const sql of [
    "ALTER TABLE fin_clientes ADD COLUMN iva INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE fin_recorrentes ADD COLUMN iva INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE fin_movimentos ADD COLUMN iva INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE fin_recorrentes ADD COLUMN qtd INTEGER NOT NULL DEFAULT 1",
  ]) {
    try { await db.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; }
  }
}
const TAXAS = new Set([0, 6, 13, 23]);
const taxa = (v) => (TAXAS.has(Number(v)) ? Number(v) : 0);

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIPOS = new Set(["entrada", "saida"]);
const CAT_RECORRENTE = new Set(["assinatura", "fixo", "avenca"]);
const PERIODOS = new Set(["mensal", "trimestral", "anual"]);
const txt = (v, n = 200) => String(v ?? "").trim().slice(0, n);
function centimos(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return null;
  return Math.round(n * 100);
}

export async function apiFinancas(rota, metodo, request, env, s, { json, lerJson, ErroPedido, idCurto }) {
  const db = env.DB;
  const agora = new Date().toISOString();
  const falha = (msg) => { throw new ErroPedido(400, msg); };

  // Tudo de um ano (mais os 3 meses anteriores, para a média dos variáveis na previsão)
  if (rota === "ano" && metodo === "GET") {
    const ano = Number(new URL(request.url).searchParams.get("ano")) || new Date().getFullYear();
    if (ano < 2000 || ano > 2100) falha("Ano inválido.");
    const [clientes, recorrentes, movimentos, fechos] = await Promise.all([
      db.prepare("SELECT * FROM fin_clientes ORDER BY ativo DESC, nome").all(),
      db.prepare("SELECT * FROM fin_recorrentes ORDER BY tipo, categoria, descricao").all(),
      db.prepare("SELECT * FROM fin_movimentos WHERE data >= ? AND data <= ? ORDER BY data, criado_em").bind(`${ano - 1}-10-01`, `${ano}-12-31`).all(),
      db.prepare("SELECT * FROM fin_fechos WHERE mes LIKE ? ORDER BY mes").bind(`${ano}-%`).all(),
    ]);
    return json({ ok: true, ano, clientes: clientes.results, recorrentes: recorrentes.results, movimentos: movimentos.results, fechos: fechos.results });
  }

  /* Clientes */
  if (rota === "clientes" && metodo === "POST") {
    const c = await lerJson(request);
    const nome = txt(c.nome, 120) || falha("Escreva o nome do cliente.");
    const id = idCurto(12);
    await db.prepare("INSERT INTO fin_clientes (id, nome, contacto, nif, notas, ativo, criado_em, iva) VALUES (?, ?, ?, ?, ?, 1, ?, ?)").bind(id, nome, txt(c.contacto), txt(c.nif, 20), txt(c.notas, 600), agora, taxa(c.iva)).run();
    return json({ ok: true, id });
  }
  let m = rota.match(/^clientes\/([a-z0-9]{6,32})$/);
  if (m && metodo === "PUT") {
    const c = await lerJson(request);
    const nome = txt(c.nome, 120) || falha("Escreva o nome do cliente.");
    await db.prepare("UPDATE fin_clientes SET nome = ?, contacto = ?, nif = ?, notas = ?, ativo = ?, iva = ? WHERE id = ?").bind(nome, txt(c.contacto), txt(c.nif, 20), txt(c.notas, 600), c.ativo === false ? 0 : 1, taxa(c.iva), m[1]).run();
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    const usado = await db.prepare("SELECT (SELECT COUNT(*) FROM fin_movimentos WHERE cliente_id = ?) + (SELECT COUNT(*) FROM fin_recorrentes WHERE cliente_id = ?) AS n").bind(m[1], m[1]).first();
    if (usado?.n) throw new ErroPedido(409, "Este cliente tem valores registados. Em vez de apagar, marque-o como inativo.");
    await db.prepare("DELETE FROM fin_clientes WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  /* Recorrentes */
  const lerRecorrente = async (c) => {
    const tipo = TIPOS.has(c.tipo) ? c.tipo : falha("Tipo inválido.");
    const categoria = CAT_RECORRENTE.has(c.categoria) ? c.categoria : falha("Categoria inválida.");
    if ((categoria === "avenca") !== (tipo === "entrada")) falha("As avenças são entradas; assinaturas e custos fixos são saídas.");
    const descricao = txt(c.descricao, 140) || falha("Escreva a descrição.");
    const valor = centimos(c.valor); if (valor === null || valor === 0) falha("Indique um valor válido.");
    const inicio = MES.test(c.inicio) ? c.inicio : falha("Mês de início inválido.");
    const fim = c.fim ? (MES.test(c.fim) && c.fim >= inicio ? c.fim : falha("O mês de fim tem de ser depois do início.")) : null;
    let cliente = null;
    if (categoria === "avenca") {
      cliente = String(c.cliente_id || "");
      if (!(await db.prepare("SELECT id FROM fin_clientes WHERE id = ?").bind(cliente).first())) falha("Escolha o cliente.");
    }
    return [tipo, categoria, descricao, valor, PERIODOS.has(c.periodicidade) ? c.periodicidade : "mensal", inicio, fim, cliente, txt(c.notas, 600), taxa(c.iva), Math.min(999, Math.max(1, Math.round(Number(c.qtd) || 1)))];
  };
  if (rota === "recorrentes" && metodo === "POST") {
    const v = await lerRecorrente(await lerJson(request));
    const id = idCurto(12);
    await db.prepare("INSERT INTO fin_recorrentes (tipo, categoria, descricao, valor_c, periodicidade, inicio, fim, cliente_id, notas, iva, qtd, id, criado_em, atualizado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...v, id, agora, agora).run();
    return json({ ok: true, id });
  }
  m = rota.match(/^recorrentes\/([a-z0-9]{6,32})$/);
  if (m && metodo === "PUT") {
    const v = await lerRecorrente(await lerJson(request));
    await db.prepare("UPDATE fin_recorrentes SET tipo=?, categoria=?, descricao=?, valor_c=?, periodicidade=?, inicio=?, fim=?, cliente_id=?, notas=?, iva=?, qtd=?, atualizado_em=? WHERE id = ?").bind(...v, agora, m[1]).run();
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    await db.prepare("DELETE FROM fin_movimentos WHERE recorrente_id = ?").bind(m[1]).run();
    await db.prepare("DELETE FROM fin_recorrentes WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  /* Movimentos (e ajustes de um recorrente num mês: recorrente_id preenchido) */
  const lerMovimento = async (c) => {
    const tipo = TIPOS.has(c.tipo) ? c.tipo : falha("Tipo inválido.");
    const data = DIA.test(c.data) ? c.data : falha("Data inválida.");
    const valor = centimos(c.valor); if (valor === null) falha("Indique um valor válido.");
    let recorrente = null;
    if (c.recorrente_id) {
      const r = await db.prepare("SELECT id, tipo FROM fin_recorrentes WHERE id = ?").bind(String(c.recorrente_id)).first();
      if (!r) falha("Valor fixo não encontrado.");
      recorrente = r.id;
    } else if (valor === 0) falha("Indique um valor maior que zero.");
    const descricao = txt(c.descricao, 160) || (recorrente ? "Ajuste" : falha("Escreva a descrição."));
    let cliente = c.cliente_id ? String(c.cliente_id) : null;
    if (cliente && !(await db.prepare("SELECT id FROM fin_clientes WHERE id = ?").bind(cliente).first())) falha("Cliente não encontrado.");
    if (tipo === "entrada" && !recorrente && !cliente) falha("Escolha o cliente.");
    return [tipo, data, descricao, txt(c.categoria, 40), valor, cliente, recorrente, txt(c.notas, 600), taxa(c.iva)];
  };
  if (rota === "movimentos" && metodo === "POST") {
    const v = await lerMovimento(await lerJson(request));
    if (v[6]) await db.prepare("DELETE FROM fin_movimentos WHERE recorrente_id = ? AND substr(data, 1, 7) = ?").bind(v[6], v[1].slice(0, 7)).run();
    const id = idCurto(12);
    await db.prepare("INSERT INTO fin_movimentos (tipo, data, descricao, categoria, valor_c, cliente_id, recorrente_id, notas, iva, id, criado_em, criado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...v, id, agora, s.email).run();
    return json({ ok: true, id });
  }
  m = rota.match(/^movimentos\/([a-z0-9]{6,32})$/);
  if (m && metodo === "PUT") {
    const v = await lerMovimento(await lerJson(request));
    await db.prepare("UPDATE fin_movimentos SET tipo=?, data=?, descricao=?, categoria=?, valor_c=?, cliente_id=?, recorrente_id=?, notas=?, iva=? WHERE id = ?").bind(...v, m[1]).run();
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    await db.prepare("DELETE FROM fin_movimentos WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  /* Fecho do mês */
  m = rota.match(/^fechos\/(\d{4}-\d{2})$/);
  if (m && MES.test(m[1]) && metodo === "PUT") {
    const c = await lerJson(request);
    const e = centimos(c.entradas), sd = centimos(c.saidas);
    if (e === null || sd === null) falha("Totais inválidos.");
    await db.prepare("INSERT OR REPLACE INTO fin_fechos (mes, fechado_em, por, entradas_c, saidas_c, notas) VALUES (?, ?, ?, ?, ?, ?)").bind(m[1], agora, s.email, e, sd, txt(c.notas, 600)).run();
    return json({ ok: true });
  }
  if (m && MES.test(m[1]) && metodo === "DELETE") {
    await db.prepare("DELETE FROM fin_fechos WHERE mes = ?").bind(m[1]).run();
    return json({ ok: true });
  }
  return null;
}
