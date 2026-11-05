/* Implement — Worker do website.
   As páginas (public/) são servidas diretamente pelo Cloudflare. Este Worker trata de /api/* e do blog
   (/insights, /media, /admin — ver src/blog.js):
     POST /api/start-a-project  → valida as respostas, guarda na D1 (DB) e avisa a equipa por e-mail (EMAIL, se configurado)
     GET  /api/saude            → estado da configuração (para confirmar a publicação)
   As perguntas e as regras de validação são as mesmas do formulário: public/assets/js/perguntas.js */
import { tratarBlog } from "./blog.js";
import { ETAPAS, CONTACTO, validarTudo, validarContacto, textoResposta, visivel } from "../public/assets/js/perguntas.js";

const LIMITE_BYTES = 64 * 1024;
const TEMPO_MINIMO_MS = 20 * 1000; // ninguém responde a seis passos em menos de 20 s

const SEGURANCA = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Robots-Tag": "noindex",
};
const json = (dados, estado = 200) => new Response(JSON.stringify(dados), { status: estado, headers: SEGURANCA });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const blog = await tratarBlog(request, env, ctx, url);
    if (blog) return blog;
    if (url.pathname === "/api/start-a-project") {
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...SEGURANCA, Allow: "POST" } });
      try {
        return await receberPedido(request, env, ctx, url);
      } catch (e) {
        console.error(JSON.stringify({ evento: "pedido_falhou", erro: String(e && e.message).slice(0, 300) }));
        return json({ ok: false, erro: "Erro interno" }, 500);
      }
    }
    if (url.pathname === "/api/contacto") {
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...SEGURANCA, Allow: "POST" } });
      try {
        return await receberMensagem(request, env, ctx, url);
      } catch (e) {
        console.error(JSON.stringify({ evento: "mensagem_falhou", erro: String(e && e.message).slice(0, 300) }));
        return json({ ok: false, erro: "Erro interno" }, 500);
      }
    }
    if (url.pathname === "/api/saude" && request.method === "GET") {
      return json({ ok: true, baseDeDados: Boolean(env.DB), email: Boolean(env.EMAIL) });
    }
    if (url.pathname.startsWith("/api/")) return json({ ok: false, erro: "Não encontrado" }, 404);
    return env.ASSETS.fetch(request);
  },
};

async function receberPedido(request, env, ctx, url) {
  // Só pedidos do próprio site (o browser envia sempre Origin num POST com fetch)
  const origem = request.headers.get("Origin");
  if (origem && new URL(origem).host !== url.host) return json({ ok: false, erro: "Origem recusada" }, 403);
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return json({ ok: false, erro: "Formato inválido" }, 415);
  if (Number(request.headers.get("Content-Length") || 0) > LIMITE_BYTES) return json({ ok: false, erro: "Pedido demasiado grande" }, 413);

  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) return json({ ok: false, erro: "Pedido demasiado grande" }, 413);
  let corpo;
  try { corpo = JSON.parse(texto); } catch { return json({ ok: false, erro: "JSON inválido" }, 400); }
  if (!corpo || typeof corpo !== "object" || !corpo.respostas || typeof corpo.respostas !== "object" || Array.isArray(corpo.respostas)) {
    return json({ ok: false, erro: "Respostas em falta" }, 400);
  }

  const referencia = novaReferencia();

  // Anti-spam silencioso: campo-armadilha preenchido ou envio rápido demais → resposta normal, nada guardado
  const inicio = Number(corpo.inicio);
  const rapidoDemais = Number.isFinite(inicio) && inicio > 0 && Date.now() - inicio < TEMPO_MINIMO_MS;
  if (String(corpo.site_empresa || "").trim() || rapidoDemais) {
    console.log(JSON.stringify({ evento: "spam_ignorado", motivo: rapidoDemais ? "rapido" : "armadilha" }));
    return json({ ok: true, referencia });
  }

  const { limpas, erros, valido } = validarTudo(corpo.respostas);
  if (!valido) return json({ ok: false, erros }, 400);

  if (!env.DB && !env.EMAIL) return json({ ok: false, erro: "Formulário ainda não configurado" }, 503);

  const idioma = corpo.idioma === "pt" ? "pt" : "en";
  const pedido = {
    id: referencia,
    criado_em: new Date().toISOString(),
    idioma,
    respostas: limpas,
    pais: (request.cf && request.cf.country) || null,
  };

  let guardado = false;
  if (env.DB) {
    try {
      await guardarPedido(env.DB, pedido);
      guardado = true;
    } catch (e) {
      console.error(JSON.stringify({ evento: "d1_falhou", referencia, erro: String(e && e.message).slice(0, 300) }));
    }
  }

  if (env.EMAIL) {
    const envio = enviarNotificacao(env, pedido)
      .then(async () => { if (guardado) await env.DB.prepare("UPDATE pedidos SET email_enviado = 1 WHERE id = ?").bind(referencia).run(); })
      .catch((e) => console.error(JSON.stringify({ evento: "email_falhou", referencia, erro: String(e && e.message).slice(0, 300) })));
    // Sem base de dados, o e-mail é a única cópia: espera-se pelo resultado antes de confirmar ao cliente
    if (guardado) ctx.waitUntil(envio);
    else {
      try { await enviarNotificacao(env, pedido); } catch (e) {
        console.error(JSON.stringify({ evento: "email_falhou_sem_db", referencia, erro: String(e && e.message).slice(0, 300) }));
        return json({ ok: false, erro: "Não foi possível registar o pedido" }, 502);
      }
    }
  } else if (!guardado) {
    return json({ ok: false, erro: "Não foi possível registar o pedido" }, 502);
  }

  console.log(JSON.stringify({ evento: "pedido_recebido", referencia, servicos: limpas.servicos }));
  return json({ ok: true, referencia });
}

function novaReferencia() {
  const letras = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O e 1/I
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "IMP-" + [...bytes].map((b) => letras[b % letras.length]).join("");
}

// Igual a schema.sql, uma instrução por linha (formato do db.exec da D1)
const ESQUEMA = [
  "CREATE TABLE IF NOT EXISTS pedidos (id TEXT PRIMARY KEY, criado_em TEXT NOT NULL, idioma TEXT NOT NULL, nome TEXT NOT NULL, email TEXT NOT NULL, telefone TEXT, empresa TEXT NOT NULL, setor TEXT, localizacao TEXT, servicos TEXT NOT NULL, objetivo TEXT, tipo_trabalho TEXT, orcamento_mensal TEXT, orcamento_projeto TEXT, prazo TEXT, respostas TEXT NOT NULL, pais TEXT, email_enviado INTEGER NOT NULL DEFAULT 0, estado TEXT NOT NULL DEFAULT 'novo');",
  "CREATE INDEX IF NOT EXISTS pedidos_criado_em ON pedidos (criado_em DESC);",
  "CREATE INDEX IF NOT EXISTS pedidos_estado ON pedidos (estado);",
].join("\n");

async function guardarPedido(db, p) {
  try {
    await inserirPedido(db, p);
  } catch (e) {
    if (!/no such table/i.test(String(e && e.message))) throw e;
    // Primeira utilização: cria a tabela e tenta outra vez
    await db.exec(ESQUEMA);
    await inserirPedido(db, p);
  }
}

async function inserirPedido(db, p) {
  const r = p.respostas;
  await db.prepare(`INSERT INTO pedidos
      (id, criado_em, idioma, nome, email, telefone, empresa, setor, localizacao, servicos, objetivo,
       tipo_trabalho, orcamento_mensal, orcamento_projeto, prazo, respostas, pais)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(p.id, p.criado_em, p.idioma, r.nome, r.email, r.telefone || null, r.empresa, r.setor || null, r.localizacao || null,
      (r.servicos || []).join(","), r.objetivo || null, r.tipo_trabalho || null, r.orcamento_mensal || null,
      r.orcamento_projeto || null, r.prazo || null, JSON.stringify(r), p.pais)
    .run();
}

/* ---------- E-mail para a equipa (sempre em português) ---------- */
const escHtml = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function montarEmail(pedido) {
  const r = pedido.respostas;
  const campoServicos = ETAPAS.flatMap((e) => e.campos).find((c) => c.id === "servicos");
  const servicos = textoResposta(campoServicos, r.servicos, "pt");
  const assunto = `Novo pedido ${pedido.id}: ${r.empresa} — ${servicos}`.slice(0, 200);
  const blocosTexto = [];
  const blocosHtml = [];
  for (const etapa of ETAPAS) {
    const linhas = etapa.campos
      .filter((c) => c.tipo !== "consentimento" && visivel(c, r) && r[c.id] !== undefined)
      .map((c) => [c.pt, textoResposta(c, r[c.id], "pt")]);
    if (!linhas.length) continue;
    blocosTexto.push(`== ${etapa.pt.toUpperCase()} ==\n` + linhas.map(([k, v]) => `${k}: ${v}`).join("\n"));
    blocosHtml.push(`<h2 style="font:700 16px/1.3 Georgia,serif;color:#5B2BB5;margin:28px 0 8px">${escHtml(etapa.pt)}</h2>
      <table style="width:100%;border-collapse:collapse;font:14px/1.5 Arial,sans-serif;color:#17131F">${linhas.map(([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6B6578;vertical-align:top;width:38%;border-bottom:1px solid #EEE8F8">${escHtml(k)}</td><td style="padding:6px 0;vertical-align:top;border-bottom:1px solid #EEE8F8;white-space:pre-wrap">${escHtml(v)}</td></tr>`).join("")}</table>`);
  }
  const cabecalho = `Referência: ${pedido.id}\nRecebido: ${pedido.criado_em}\nIdioma do formulário: ${pedido.idioma.toUpperCase()}${pedido.pais ? `\nPaís: ${pedido.pais}` : ""}`;
  const texto = `Novo pedido no formulário «Start a Project».\n\n${cabecalho}\n\n${blocosTexto.join("\n\n")}\n\nResponder a este e-mail responde diretamente ao cliente (${r.email}).`;
  const html = `<div style="max-width:640px;margin:0 auto;padding:24px;background:#fff">
    <p style="font:700 11px/1 Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#5B2BB5;margin:0 0 12px">Implement · Start a Project</p>
    <h1 style="font:700 26px/1.2 Georgia,serif;color:#17131F;margin:0 0 8px">${escHtml(r.empresa)}</h1>
    <p style="font:14px/1.6 Arial,sans-serif;color:#6B6578;margin:0">${escHtml(r.nome)} · <a href="mailto:${escHtml(r.email)}" style="color:#5B2BB5">${escHtml(r.email)}</a>${r.telefone ? ` · ${escHtml(r.telefone)}` : ""}<br>${escHtml(pedido.id)} · ${escHtml(pedido.criado_em)}</p>
    ${blocosHtml.join("")}
    <p style="font:12px/1.6 Arial,sans-serif;color:#6B6578;margin-top:28px">Responder a este e-mail responde diretamente ao cliente.</p></div>`;
  return { assunto, texto, html };
}

async function enviarNotificacao(env, pedido) {
  const { assunto, texto, html } = montarEmail(pedido);
  await env.EMAIL.send({
    from: { email: env.EMAIL_REMETENTE || "site@heyimplement.com", name: "Website Implement" },
    to: env.EMAIL_DESTINO || "info@heyimplement.com",
    replyTo: { email: pedido.respostas.email, name: pedido.respostas.nome },
    subject: assunto,
    text: texto,
    html,
  });
}

/* ---------- Página Contacto: mensagens para info@heyimplement.com ---------- */
const ESQUEMA_MENSAGENS = [
  "CREATE TABLE IF NOT EXISTS mensagens (id TEXT PRIMARY KEY, criado_em TEXT NOT NULL, idioma TEXT NOT NULL, nome TEXT NOT NULL, email TEXT NOT NULL, telefone TEXT, empresa TEXT, assunto TEXT, mensagem TEXT NOT NULL, pais TEXT, email_enviado INTEGER NOT NULL DEFAULT 0, estado TEXT NOT NULL DEFAULT 'nova');",
  "CREATE INDEX IF NOT EXISTS mensagens_criado_em ON mensagens (criado_em DESC);",
].join("\n");

async function lerCorpo(request, url) {
  const origem = request.headers.get("Origin");
  if (origem && new URL(origem).host !== url.host) return { resposta: json({ ok: false, erro: "Origem recusada" }, 403) };
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return { resposta: json({ ok: false, erro: "Formato inválido" }, 415) };
  if (Number(request.headers.get("Content-Length") || 0) > LIMITE_BYTES) return { resposta: json({ ok: false, erro: "Pedido demasiado grande" }, 413) };
  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) return { resposta: json({ ok: false, erro: "Pedido demasiado grande" }, 413) };
  let corpo;
  try { corpo = JSON.parse(texto); } catch { return { resposta: json({ ok: false, erro: "JSON inválido" }, 400) }; }
  if (!corpo || typeof corpo !== "object" || !corpo.respostas || typeof corpo.respostas !== "object" || Array.isArray(corpo.respostas)) {
    return { resposta: json({ ok: false, erro: "Respostas em falta" }, 400) };
  }
  return { corpo };
}

async function receberMensagem(request, env, ctx, url) {
  const { corpo, resposta } = await lerCorpo(request, url);
  if (resposta) return resposta;
  const referencia = "MSG-" + novaReferencia().slice(4);

  // Anti-spam silencioso: campo-armadilha ou envio em menos de 5 segundos
  const inicio = Number(corpo.inicio);
  const rapido = Number.isFinite(inicio) && inicio > 0 && Date.now() - inicio < 5000;
  if (String(corpo.site_empresa || "").trim() || rapido) return json({ ok: true, referencia });

  const { limpas, erros, valido } = validarContacto(corpo.respostas);
  if (!valido) return json({ ok: false, erros }, 400);
  if (!env.DB && !env.EMAIL) return json({ ok: false, erro: "Formulário ainda não configurado" }, 503);

  const m = { id: referencia, criado_em: new Date().toISOString(), idioma: corpo.idioma === "pt" ? "pt" : "en", r: limpas, pais: (request.cf && request.cf.country) || null };

  let guardado = false;
  if (env.DB) {
    const inserir = () => env.DB.prepare(`INSERT INTO mensagens (id, criado_em, idioma, nome, email, telefone, empresa, assunto, mensagem, pais)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(m.id, m.criado_em, m.idioma, limpas.nome, limpas.email, limpas.telefone || null, limpas.empresa || null, limpas.assunto || null, limpas.mensagem, m.pais).run();
    try {
      try { await inserir(); } catch (e) {
        if (!/no such table/i.test(String(e && e.message))) throw e;
        await env.DB.exec(ESQUEMA_MENSAGENS);
        await inserir();
      }
      guardado = true;
    } catch (e) {
      console.error(JSON.stringify({ evento: "d1_mensagem_falhou", referencia, erro: String(e && e.message).slice(0, 300) }));
    }
  }

  if (env.EMAIL) {
    const envio = enviarMensagem(env, m)
      .then(async () => { if (guardado) await env.DB.prepare("UPDATE mensagens SET email_enviado = 1 WHERE id = ?").bind(referencia).run(); })
      .catch((e) => console.error(JSON.stringify({ evento: "email_mensagem_falhou", referencia, erro: String(e && e.message).slice(0, 300) })));
    if (guardado) ctx.waitUntil(envio);
    else {
      try { await enviarMensagem(env, m); } catch {
        return json({ ok: false, erro: "Não foi possível enviar a mensagem" }, 502);
      }
    }
  } else if (!guardado) {
    return json({ ok: false, erro: "Não foi possível enviar a mensagem" }, 502);
  }
  console.log(JSON.stringify({ evento: "mensagem_recebida", referencia }));
  return json({ ok: true, referencia });
}

export function montarEmailMensagem(m) {
  const r = m.r;
  const assunto = textoResposta(CONTACTO.find((c) => c.id === "assunto"), r.assunto, "pt");
  const titulo = `Mensagem do site: ${r.nome}${r.empresa ? ` (${r.empresa})` : ""} — ${assunto}`.slice(0, 200);
  const linhas = [["Nome", r.nome], ["E-mail", r.email], ["Telefone", r.telefone], ["Empresa", r.empresa], ["Assunto", assunto]].filter(([, v]) => v);
  const texto = `${linhas.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${r.mensagem}\n\n— ${m.id} · ${m.criado_em}\nResponder a este e-mail responde diretamente a ${r.email}.`;
  const html = `<div style="max-width:600px;margin:0 auto;padding:24px;font:15px/1.6 Arial,sans-serif;color:#17131F">
    <p style="font:700 11px/1 Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#5B2BB5;margin:0 0 12px">Implement · Contacto</p>
    <h1 style="font:700 24px/1.2 Georgia,serif;margin:0 0 16px">${escHtml(r.nome)}</h1>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px">${linhas.map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#6B6578">${escHtml(k)}</td><td style="padding:3px 0">${escHtml(v)}</td></tr>`).join("")}</table>
    <div style="white-space:pre-wrap;padding:16px;background:#F5F0FE;border-radius:10px">${escHtml(r.mensagem)}</div>
    <p style="font-size:12px;color:#6B6578;margin-top:20px">${escHtml(m.id)} · ${escHtml(m.criado_em)}. Responder a este e-mail responde diretamente a quem escreveu.</p></div>`;
  return { titulo, texto, html };
}

async function enviarMensagem(env, m) {
  const { titulo, texto, html } = montarEmailMensagem(m);
  await env.EMAIL.send({
    from: { email: env.EMAIL_REMETENTE || "site@heyimplement.com", name: "Website Implement" },
    to: env.EMAIL_DESTINO || "info@heyimplement.com",
    replyTo: { email: m.r.email, name: m.r.nome },
    subject: titulo,
    text: texto,
    html,
  });
}
