/* Implement — tarefas da equipa (só dentro de /api/admin/tarefas*).
   Cada tarefa tem uma responsável (Isabelly, Jessica ou ambas) e um estado: por fazer → a fazer → feita. */

export const ESQUEMA_TAREFAS = [
  "CREATE TABLE IF NOT EXISTS tarefas (id TEXT PRIMARY KEY, titulo TEXT NOT NULL, notas TEXT NOT NULL DEFAULT '', para_quem TEXT NOT NULL DEFAULT 'ambas', estado TEXT NOT NULL DEFAULT 'por_fazer', prazo TEXT, prioridade INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, concluida_em TEXT);",
  "CREATE INDEX IF NOT EXISTS tarefas_estado ON tarefas (estado, prazo);",
];

const PESSOAS = new Set(["isabelly", "jessica", "ambas"]);
const ESTADOS = new Set(["por_fazer", "a_fazer", "feita"]);
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function limpar(c, ErroPedido) {
  const titulo = String(c.titulo || "").trim().slice(0, 200);
  if (!titulo) throw new ErroPedido(400, "Escreva a tarefa.");
  return {
    titulo,
    notas: String(c.notas || "").trim().slice(0, 2000),
    para_quem: PESSOAS.has(c.para_quem) ? c.para_quem : "ambas",
    estado: ESTADOS.has(c.estado) ? c.estado : "por_fazer",
    prazo: DIA.test(String(c.prazo || "")) ? c.prazo : null,
    prioridade: c.prioridade ? 1 : 0,
  };
}

export async function apiTarefas(rota, metodo, request, env, { json, lerJson, ErroPedido, idCurto }) {
  const db = env.DB;
  const agora = new Date().toISOString();
  if (rota === "tarefas" && metodo === "GET") {
    // As feitas há mais de 60 dias deixam de aparecer (continuam na base de dados)
    const limite = new Date(Date.now() - 60 * 86400000).toISOString();
    const { results } = await db.prepare("SELECT * FROM tarefas WHERE estado != 'feita' OR concluida_em >= ? ORDER BY prioridade DESC, prazo IS NULL, prazo, criado_em").bind(limite).all();
    return json({ ok: true, tarefas: results });
  }
  if (rota === "tarefas" && metodo === "POST") {
    const t = limpar(await lerJson(request), ErroPedido);
    const id = idCurto();
    await db.prepare("INSERT INTO tarefas (id, titulo, notas, para_quem, estado, prazo, prioridade, criado_em, atualizado_em, concluida_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, t.titulo, t.notas, t.para_quem, t.estado, t.prazo, t.prioridade, agora, agora, t.estado === "feita" ? agora : null).run();
    return json({ ok: true, id });
  }
  const m = rota.match(/^tarefas\/([a-z0-9]{6,32})$/);
  if (!m) return null;
  const atual = await db.prepare("SELECT * FROM tarefas WHERE id = ?").bind(m[1]).first();
  if (!atual) throw new ErroPedido(404, "Tarefa não encontrada.");
  if (metodo === "PUT") {
    const c = await lerJson(request);
    const t = limpar({ ...atual, ...c }, ErroPedido);
    const concluida = t.estado === "feita" ? atual.concluida_em || agora : null;
    await db.prepare("UPDATE tarefas SET titulo = ?, notas = ?, para_quem = ?, estado = ?, prazo = ?, prioridade = ?, atualizado_em = ?, concluida_em = ? WHERE id = ?")
      .bind(t.titulo, t.notas, t.para_quem, t.estado, t.prazo, t.prioridade, agora, concluida, m[1]).run();
    return json({ ok: true });
  }
  if (metodo === "DELETE") {
    await db.prepare("DELETE FROM tarefas WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }
  return null;
}
