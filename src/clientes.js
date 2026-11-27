/* Implement — clientes: gestão no admin (/api/admin/clientes*) e painel privado de cada cliente (/cliente/<slug>).

   Admin: dados do cliente, pacotes, redes (com seguidores registados por data), checklist do mês e campanhas
   (Meta, Google Ads, TikTok…) com orçamento e valor investido.
   Painel do cliente: entra com a palavra-passe que a equipa gera e envia por e-mail; vê as redes com seguidores,
   as campanhas e o progresso do mês. As páginas /cliente/* são noindex e não estão ligadas em lado nenhum.
   /cliente/modelo mostra um exemplo com dados fictícios, sem palavra-passe (é o modelo). */

export const ESQUEMA_CLIENTES = [
  "CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, nome TEXT NOT NULL DEFAULT '', marca TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', telefone TEXT NOT NULL DEFAULT '', idioma TEXT NOT NULL DEFAULT 'pt', pacotes TEXT NOT NULL DEFAULT '', valor_mensal REAL, inicio TEXT, metricool_id TEXT NOT NULL DEFAULT '', redes TEXT NOT NULL DEFAULT '[]', notas TEXT NOT NULL DEFAULT '', senha_hash TEXT, senha_sal TEXT, senha_criada TEXT, ultimo_acesso TEXT, ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS cliente_checklist (id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, mes TEXT NOT NULL, titulo TEXT NOT NULL, feita INTEGER NOT NULL DEFAULT 0, ordem INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS cliente_checklist_mes ON cliente_checklist (cliente_id, mes, ordem);",
  "CREATE TABLE IF NOT EXISTS campanhas (id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, plataforma TEXT NOT NULL DEFAULT 'meta', nome TEXT NOT NULL, objetivo TEXT NOT NULL DEFAULT '', estado TEXT NOT NULL DEFAULT 'ativa', inicio TEXT, fim TEXT, orcamento REAL, investido REAL, alcance INTEGER, cliques INTEGER, resultados TEXT NOT NULL DEFAULT '', atualizado_em TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS campanhas_cliente ON campanhas (cliente_id, estado);",
  "CREATE TABLE IF NOT EXISTS cliente_seguidores (cliente_id TEXT NOT NULL, rede TEXT NOT NULL, data TEXT NOT NULL, seguidores INTEGER NOT NULL, PRIMARY KEY (cliente_id, rede, data));",
  "CREATE TABLE IF NOT EXISTS cliente_sessoes (hash TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, expira INTEGER NOT NULL);",
];

const REDES = ["instagram", "facebook", "tiktok", "linkedin", "youtube", "google", "pinterest", "x"];
const PLATAFORMAS = ["meta", "google", "tiktok", "linkedin", "outra"];
const ESTADOS_CAMPANHA = ["planeada", "ativa", "pausada", "terminada"];
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const COOKIE_CLIENTE = "__Host-impc";
const SESSAO_DIAS = 30;
const ITERACOES = 100000;

const txt = (v, n) => String(v ?? "").trim().slice(0, n);
const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));
const inteiro = (v) => (num(v) === null ? null : Math.round(num(v)));
const mesAtual = () => new Date().toISOString().slice(0, 7);
const hojeISO = () => new Date().toISOString().slice(0, 10);

/* ---------- Palavras-passe (PBKDF2-SHA256) ---------- */
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const deHex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
async function derivar(senha, salHex) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(salHex), iterations: ITERACOES }, chave, 256));
}
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// Palavra-passe fácil de ditar/escrever: sem letras ambíguas (0/O, 1/l/I)
function novaSenha() {
  const L = "abcdefghjkmnpqrstuvwxyz", N = "23456789";
  const r = crypto.getRandomValues(new Uint8Array(10));
  const p = (s, i) => s[r[i] % s.length];
  return `${p(L, 0).toUpperCase()}${p(L, 1)}${p(L, 2)}${p(L, 3)}-${p(N, 4)}${p(N, 5)}${p(N, 6)}${p(N, 7)}-${p(L, 8)}${p(L, 9)}`;
}

function limparCliente(c, ErroPedido) {
  const marca = txt(c.marca, 120);
  if (!marca) throw new ErroPedido(400, "Escreva o nome da marca.");
  const slug = txt(c.slug, 50).toLowerCase();
  if (!SLUG.test(slug) || slug === "modelo") throw new ErroPedido(400, "O endereço só pode ter letras minúsculas, números e hífens (e não pode ser «modelo»).");
  let redes = [];
  try { redes = Array.isArray(c.redes) ? c.redes : JSON.parse(c.redes || "[]"); } catch { redes = []; }
  redes = redes.filter((r) => r && REDES.includes(r.rede)).slice(0, 10).map((r) => ({ rede: r.rede, conta: txt(r.conta, 120), url: /^https:\/\//.test(r.url || "") ? txt(r.url, 300) : "" }));
  return {
    slug, marca,
    nome: txt(c.nome, 120),
    email: txt(c.email, 200),
    telefone: txt(c.telefone, 40),
    idioma: c.idioma === "en" ? "en" : "pt",
    pacotes: txt(c.pacotes, 1000),
    valor_mensal: num(c.valor_mensal),
    inicio: DIA.test(String(c.inicio || "")) ? c.inicio : null,
    metricool_id: txt(c.metricool_id, 30).replace(/\D/g, ""),
    redes: JSON.stringify(redes),
    notas: txt(c.notas, 4000),
    ativo: c.ativo === false || c.ativo === 0 || c.ativo === "0" ? 0 : 1,
  };
}

function limparCampanha(c, ErroPedido) {
  const nome = txt(c.nome, 160);
  if (!nome) throw new ErroPedido(400, "Dê um nome à campanha.");
  return {
    nome,
    plataforma: PLATAFORMAS.includes(c.plataforma) ? c.plataforma : "outra",
    objetivo: txt(c.objetivo, 200),
    estado: ESTADOS_CAMPANHA.includes(c.estado) ? c.estado : "ativa",
    inicio: DIA.test(String(c.inicio || "")) ? c.inicio : null,
    fim: DIA.test(String(c.fim || "")) ? c.fim : null,
    orcamento: num(c.orcamento),
    investido: num(c.investido),
    alcance: inteiro(c.alcance),
    cliques: inteiro(c.cliques),
    resultados: txt(c.resultados, 1000),
  };
}

/* Seguidores: o último registo de cada rede e a variação face ao registo de há ~30 dias (ou o mais antigo) */
async function seguidores(db, clienteId) {
  const { results } = await db.prepare("SELECT rede, data, seguidores FROM cliente_seguidores WHERE cliente_id = ? ORDER BY rede, data").bind(clienteId).all();
  const por = {};
  for (const r of results) (por[r.rede] ||= []).push(r);
  const limite = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const out = {};
  for (const [rede, l] of Object.entries(por)) {
    const ultimo = l[l.length - 1];
    const antes = [...l].reverse().find((x) => x.data <= limite) || (l.length > 1 ? l[0] : null);
    out[rede] = { seguidores: ultimo.seguidores, data: ultimo.data, variacao: antes && antes !== ultimo ? ultimo.seguidores - antes.seguidores : null, historico: l.slice(-12) };
  }
  return out;
}

async function checklist(db, clienteId, mes) {
  const { results } = await db.prepare("SELECT id, titulo, feita, ordem FROM cliente_checklist WHERE cliente_id = ? AND mes = ? ORDER BY ordem, criado_em").bind(clienteId, mes).all();
  return results;
}

/* ---------- Admin: /api/admin/clientes* ---------- */
export async function apiClientes(rota, metodo, request, env, { json, lerJson, ErroPedido, idCurto }) {
  const db = env.DB;
  const agora = new Date().toISOString();

  if (rota === "clientes" && metodo === "GET") {
    const mes = mesAtual();
    const { results } = await db.prepare(`SELECT c.id, c.slug, c.nome, c.marca, c.pacotes, c.valor_mensal, c.ativo, c.idioma, c.ultimo_acesso, (c.senha_hash IS NOT NULL) AS tem_senha,
        (SELECT COUNT(*) FROM cliente_checklist k WHERE k.cliente_id = c.id AND k.mes = ?) AS tarefas,
        (SELECT COUNT(*) FROM cliente_checklist k WHERE k.cliente_id = c.id AND k.mes = ? AND k.feita = 1) AS feitas,
        (SELECT COUNT(*) FROM campanhas g WHERE g.cliente_id = c.id AND g.estado = 'ativa') AS campanhas_ativas,
        (SELECT COALESCE(SUM(investido), 0) FROM campanhas g WHERE g.cliente_id = c.id AND g.estado = 'ativa') AS investido_ativas,
        (SELECT GROUP_CONCAT(DISTINCT plataforma) FROM campanhas g WHERE g.cliente_id = c.id AND g.estado = 'ativa') AS plataformas_ativas
      FROM clientes c ORDER BY c.ativo DESC, c.marca COLLATE NOCASE`).bind(mes, mes).all();
    return json({ ok: true, mes, clientes: results });
  }
  if (rota === "clientes" && metodo === "POST") {
    const c = limparCliente(await lerJson(request), ErroPedido);
    if (await db.prepare("SELECT id FROM clientes WHERE slug = ?").bind(c.slug).first()) throw new ErroPedido(409, "Já existe um cliente com esse endereço.");
    const id = idCurto();
    await db.prepare("INSERT INTO clientes (id, slug, nome, marca, email, telefone, idioma, pacotes, valor_mensal, inicio, metricool_id, redes, notas, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, c.slug, c.nome, c.marca, c.email, c.telefone, c.idioma, c.pacotes, c.valor_mensal, c.inicio, c.metricool_id, c.redes, c.notas, c.ativo, agora, agora).run();
    return json({ ok: true, id });
  }

  let m = rota.match(/^clientes\/([a-z0-9]{6,32})(?:\/(.+))?$/);
  if (!m) return null;
  const [, id, resto = ""] = m;
  const cli = await db.prepare("SELECT * FROM clientes WHERE id = ?").bind(id).first();
  if (!cli) throw new ErroPedido(404, "Cliente não encontrado.");

  if (!resto && metodo === "GET") {
    const url = new URL(request.url);
    const mes = MES.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes") : mesAtual();
    const { results: camp } = await db.prepare("SELECT * FROM campanhas WHERE cliente_id = ? ORDER BY CASE estado WHEN 'ativa' THEN 0 WHEN 'planeada' THEN 1 WHEN 'pausada' THEN 2 ELSE 3 END, inicio DESC").bind(id).all();
    const { senha_hash, senha_sal, ...publico } = cli;
    return json({ ok: true, cliente: { ...publico, redes: JSON.parse(cli.redes || "[]"), tem_senha: Boolean(senha_hash) }, mes, checklist: await checklist(db, id, mes), campanhas: camp, seguidores: await seguidores(db, id) });
  }
  if (!resto && metodo === "PUT") {
    const c = limparCliente({ ...cli, redes: JSON.parse(cli.redes || "[]"), ...(await lerJson(request)) }, ErroPedido);
    if (c.slug !== cli.slug && await db.prepare("SELECT id FROM clientes WHERE slug = ?").bind(c.slug).first()) throw new ErroPedido(409, "Já existe um cliente com esse endereço.");
    await db.prepare("UPDATE clientes SET slug = ?, nome = ?, marca = ?, email = ?, telefone = ?, idioma = ?, pacotes = ?, valor_mensal = ?, inicio = ?, metricool_id = ?, redes = ?, notas = ?, ativo = ?, atualizado_em = ? WHERE id = ?")
      .bind(c.slug, c.nome, c.marca, c.email, c.telefone, c.idioma, c.pacotes, c.valor_mensal, c.inicio, c.metricool_id, c.redes, c.notas, c.ativo, agora, id).run();
    if (!c.ativo) await db.prepare("DELETE FROM cliente_sessoes WHERE cliente_id = ?").bind(id).run();
    return json({ ok: true });
  }
  if (!resto && metodo === "DELETE") {
    await db.batch([
      db.prepare("DELETE FROM cliente_checklist WHERE cliente_id = ?").bind(id),
      db.prepare("DELETE FROM campanhas WHERE cliente_id = ?").bind(id),
      db.prepare("DELETE FROM cliente_seguidores WHERE cliente_id = ?").bind(id),
      db.prepare("DELETE FROM cliente_sessoes WHERE cliente_id = ?").bind(id),
      db.prepare("DELETE FROM clientes WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  }

  // Nova palavra-passe: só é mostrada uma vez (a equipa copia e envia por e-mail ao cliente)
  if (resto === "senha" && metodo === "POST") {
    const senha = novaSenha();
    const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    await db.batch([
      db.prepare("UPDATE clientes SET senha_hash = ?, senha_sal = ?, senha_criada = ?, atualizado_em = ? WHERE id = ?").bind(await derivar(senha, sal), sal, agora, agora, id),
      db.prepare("DELETE FROM cliente_sessoes WHERE cliente_id = ?").bind(id),
    ]);
    return json({ ok: true, senha });
  }

  if (resto === "seguidores" && metodo === "POST") {
    const c = await lerJson(request);
    const data = DIA.test(String(c.data || "")) ? c.data : hojeISO();
    const linhas = (Array.isArray(c.valores) ? c.valores : []).filter((v) => REDES.includes(v.rede) && inteiro(v.seguidores) !== null).slice(0, 10);
    if (!linhas.length) throw new ErroPedido(400, "Escreva pelo menos um número de seguidores.");
    await db.batch(linhas.map((v) => db.prepare("INSERT INTO cliente_seguidores (cliente_id, rede, data, seguidores) VALUES (?, ?, ?, ?) ON CONFLICT (cliente_id, rede, data) DO UPDATE SET seguidores = excluded.seguidores").bind(id, v.rede, data, inteiro(v.seguidores))));
    return json({ ok: true });
  }

  if (resto === "checklist" && metodo === "POST") {
    const c = await lerJson(request);
    const mes = MES.test(String(c.mes || "")) ? c.mes : mesAtual();
    // Copiar a lista de outro mês (as tarefas voltam a ficar por fazer)
    if (MES.test(String(c.copiar_de || ""))) {
      const origem = await checklist(db, id, c.copiar_de);
      const existentes = new Set((await checklist(db, id, mes)).map((x) => x.titulo));
      const novas = origem.filter((x) => !existentes.has(x.titulo));
      if (novas.length) await db.batch(novas.map((x, i) => db.prepare("INSERT INTO cliente_checklist (id, cliente_id, mes, titulo, feita, ordem, criado_em) VALUES (?, ?, ?, ?, 0, ?, ?)").bind(idCurto(), id, mes, x.titulo, x.ordem + i, agora)));
      return json({ ok: true, copiadas: novas.length });
    }
    const titulo = txt(c.titulo, 200);
    if (!titulo) throw new ErroPedido(400, "Escreva o que há para fazer.");
    const o = await db.prepare("SELECT COALESCE(MAX(ordem), 0) + 1 AS o FROM cliente_checklist WHERE cliente_id = ? AND mes = ?").bind(id, mes).first();
    await db.prepare("INSERT INTO cliente_checklist (id, cliente_id, mes, titulo, feita, ordem, criado_em) VALUES (?, ?, ?, ?, 0, ?, ?)").bind(idCurto(), id, mes, titulo, o.o, agora).run();
    return json({ ok: true });
  }
  m = resto.match(/^checklist\/([a-z0-9]{6,32})$/);
  if (m) {
    if (metodo === "PUT") {
      const c = await lerJson(request);
      await db.prepare("UPDATE cliente_checklist SET feita = ?, titulo = COALESCE(NULLIF(?, ''), titulo) WHERE id = ? AND cliente_id = ?").bind(c.feita ? 1 : 0, txt(c.titulo, 200), m[1], id).run();
      return json({ ok: true });
    }
    if (metodo === "DELETE") {
      await db.prepare("DELETE FROM cliente_checklist WHERE id = ? AND cliente_id = ?").bind(m[1], id).run();
      return json({ ok: true });
    }
  }

  if (resto === "campanhas" && metodo === "POST") {
    const c = limparCampanha(await lerJson(request), ErroPedido);
    await db.prepare("INSERT INTO campanhas (id, cliente_id, plataforma, nome, objetivo, estado, inicio, fim, orcamento, investido, alcance, cliques, resultados, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(idCurto(), id, c.plataforma, c.nome, c.objetivo, c.estado, c.inicio, c.fim, c.orcamento, c.investido, c.alcance, c.cliques, c.resultados, agora).run();
    return json({ ok: true });
  }
  m = resto.match(/^campanhas\/([a-z0-9]{6,32})$/);
  if (m) {
    const atual = await db.prepare("SELECT * FROM campanhas WHERE id = ? AND cliente_id = ?").bind(m[1], id).first();
    if (!atual) throw new ErroPedido(404, "Campanha não encontrada.");
    if (metodo === "PUT") {
      const c = limparCampanha({ ...atual, ...(await lerJson(request)) }, ErroPedido);
      await db.prepare("UPDATE campanhas SET plataforma = ?, nome = ?, objetivo = ?, estado = ?, inicio = ?, fim = ?, orcamento = ?, investido = ?, alcance = ?, cliques = ?, resultados = ?, atualizado_em = ? WHERE id = ?")
        .bind(c.plataforma, c.nome, c.objetivo, c.estado, c.inicio, c.fim, c.orcamento, c.investido, c.alcance, c.cliques, c.resultados, agora, m[1]).run();
      return json({ ok: true });
    }
    if (metodo === "DELETE") {
      await db.prepare("DELETE FROM campanhas WHERE id = ?").bind(m[1]).run();
      return json({ ok: true });
    }
  }
  return null;
}

/* ---------- Painel do cliente ---------- */
const MODELO = {
  marca: "Brand Name", nome: "Client Name", idioma: "pt", pacotes: "Plano 1 · Gestão de redes sociais\nSite Essencial com alojamento",
  redes: [{ rede: "instagram", conta: "@brandname", url: "" }, { rede: "facebook", conta: "Brand Name", url: "" }, { rede: "google", conta: "Brand Name", url: "" }],
  seguidores: {
    instagram: { seguidores: 1284, data: hojeISO(), variacao: 46, historico: [] },
    facebook: { seguidores: 932, data: hojeISO(), variacao: 12, historico: [] },
    google: { seguidores: 57, data: hojeISO(), variacao: 5, historico: [] },
  },
  campanhas: [{ plataforma: "meta", nome: "Christmas menu", objetivo: "Messages on WhatsApp", estado: "ativa", inicio: hojeISO(), fim: null, orcamento: 150, investido: 62.4, alcance: 8420, cliques: 211, resultados: "38 conversas iniciadas" }],
  mes: { total: 10, feitas: 6 },
  demo: true,
};

function cabecalhosPagina() {
  return { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
}

async function painelDe(db, cli) {
  const { results: camp } = await db.prepare("SELECT plataforma, nome, objetivo, estado, inicio, fim, orcamento, investido, alcance, cliques, resultados, atualizado_em FROM campanhas WHERE cliente_id = ? AND estado != 'planeada' AND (estado != 'terminada' OR COALESCE(fim, atualizado_em) >= ?) ORDER BY CASE estado WHEN 'ativa' THEN 0 WHEN 'pausada' THEN 1 ELSE 2 END, inicio DESC")
    .bind(cli.id, new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)).all();
  const lista = await checklist(db, cli.id, mesAtual());
  return {
    marca: cli.marca, nome: cli.nome, idioma: cli.idioma, pacotes: cli.pacotes,
    redes: JSON.parse(cli.redes || "[]"), seguidores: await seguidores(db, cli.id),
    campanhas: camp, mes: { total: lista.length, feitas: lista.filter((x) => x.feita).length },
  };
}

export async function tratarPortal(request, env, url, { json, lerJson, ErroPedido, cookie, sha256, contarTentativa, esquema }) {
  const p = url.pathname;
  // Página (a mesma para todos os clientes; os dados chegam pela API depois de entrar)
  if (p === "/cliente" || p === "/cliente/") return new Response("Não encontrado", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  const mp = p.match(/^\/cliente\/([a-z0-9-]{1,50})\/?$/);
  if (mp && request.method === "GET") {
    const r = await env.ASSETS.fetch(new Request(new URL("/painel-cliente.html", url), request));
    return new Response(r.body, { status: r.status, headers: cabecalhosPagina() });
  }
  if (!p.startsWith("/api/cliente/")) return null;
  if (!env.DB) return json({ ok: false, erro: "Indisponível" }, 503);
  await esquema(env.DB);
  const db = env.DB;
  const rota = p.slice(13);
  const metodo = request.method;
  if (metodo !== "GET" && request.headers.get("X-Implement") !== "1") return json({ ok: false, erro: "Pedido recusado" }, 403);

  if (rota === "entrar" && metodo === "POST") {
    const c = await lerJson(request, 4096);
    const slug = txt(c.slug, 50).toLowerCase();
    const ip = request.headers.get("CF-Connecting-IP") || "?";
    if (!(await contarTentativa(db, "cliente:" + ip, 20)) || !(await contarTentativa(db, "cliente-slug:" + slug, 10))) return json({ ok: false, erro: "Demasiadas tentativas. Tente daqui a uma hora." }, 429);
    const cli = SLUG.test(slug) ? await db.prepare("SELECT id, senha_hash, senha_sal, ativo FROM clientes WHERE slug = ?").bind(slug).first() : null;
    const senha = String(c.senha || "").trim().slice(0, 100);
    const ok = cli && cli.ativo && cli.senha_hash && senha && iguais(await derivar(senha, cli.senha_sal), cli.senha_hash);
    if (!ok) return json({ ok: false, erro: "Palavra-passe incorreta." }, 401);
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    await db.batch([
      db.prepare("INSERT INTO cliente_sessoes (hash, cliente_id, expira) VALUES (?, ?, ?)").bind(await sha256(token), cli.id, Date.now() + SESSAO_DIAS * 86400000),
      db.prepare("DELETE FROM cliente_sessoes WHERE expira < ?").bind(Date.now()),
      db.prepare("UPDATE clientes SET ultimo_acesso = ? WHERE id = ?").bind(new Date().toISOString(), cli.id),
    ]);
    return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE_CLIENTE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSAO_DIAS * 86400}` });
  }
  if (rota === "sair" && metodo === "POST") {
    const t = cookie(request, COOKIE_CLIENTE);
    if (t) await db.prepare("DELETE FROM cliente_sessoes WHERE hash = ?").bind(await sha256(t)).run();
    return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE_CLIENTE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }
  if (rota === "painel" && metodo === "GET") {
    const slug = txt(url.searchParams.get("slug"), 50).toLowerCase();
    if (slug === "modelo") return json({ ok: true, painel: MODELO });
    const cli = SLUG.test(slug) ? await db.prepare("SELECT * FROM clientes WHERE slug = ? AND ativo = 1").bind(slug).first() : null;
    const t = cookie(request, COOKIE_CLIENTE);
    const s = t && t.length > 30 ? await db.prepare("SELECT cliente_id, expira FROM cliente_sessoes WHERE hash = ?").bind(await sha256(t)).first() : null;
    if (!cli || !s || s.expira < Date.now() || s.cliente_id !== cli.id) return json({ ok: false, erro: "Entre com a sua palavra-passe." }, 401);
    return json({ ok: true, painel: await painelDe(db, cli) });
  }
  return json({ ok: false, erro: "Não encontrado" }, 404);
}
