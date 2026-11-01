// Testes do Worker sem wrangler: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { montarEmail } from "../src/worker.js";

const BASE = {
  nome: "Ana Costa", empresa: "Café Aurora", setor: "restauracao", localizacao: "Porto, Portugal",
  descricao: "Café de especialidade com pastelaria própria.", cliente_ideal: "Profissionais 25-45 que trabalham perto.",
  alcance: ["local"], diferenca: "Pastelaria feita no próprio dia.", servicos: ["redes", "google"], objetivo: "contactos",
  redes_quais: ["instagram"], redes_estado: "as-vezes", google_perfil: "abandonado",
  frustracao: "Publicamos sem plano.", sucesso: "Mais reservas ao fim de semana.",
  tipo_trabalho: "mensal", orcamento_mensal: "500-800", prazo: "1-mes",
  email: "ana@cafeaurora.pt", consentimento: true,
};

function ambiente({ db = true, email = true } = {}) {
  const registos = { sql: [], emails: [] };
  const env = {
    ASSETS: { fetch: () => new Response("asset") },
    EMAIL_DESTINO: "info@heyimplement.com", EMAIL_REMETENTE: "site@heyimplement.com",
  };
  if (db) env.DB = { prepare: (sql) => ({ bind: (...v) => ({ run: async () => { registos.sql.push({ sql, v }); return { success: true }; } }) }) };
  if (email) env.EMAIL = { send: async (m) => { registos.emails.push(m); return { messageId: "x" }; } };
  const esperas = [];
  const ctx = { waitUntil: (p) => esperas.push(p) };
  return { env, ctx, registos, esperas };
}
const pedir = (corpo, extra = {}) => new Request("https://heyimplement.com/api/start-a-project", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: "https://heyimplement.com", ...extra },
  body: JSON.stringify(corpo),
});

test("pedido válido é guardado e notificado", async () => {
  const { env, ctx, registos, esperas } = ambiente();
  const r = await worker.fetch(pedir({ respostas: BASE, idioma: "pt", inicio: Date.now() - 300000 }), env, ctx);
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.match(d.referencia, /^IMP-[2-9A-Z]{6}$/);
  await Promise.all(esperas);
  assert.equal(registos.sql.length, 2); // INSERT + UPDATE email_enviado
  assert.equal(registos.sql[0].v[0], d.referencia);
  assert.equal(registos.emails.length, 1);
  assert.equal(registos.emails[0].replyTo.email, "ana@cafeaurora.pt");
  assert.match(registos.emails[0].subject, /Café Aurora — Redes sociais, Perfil Google Business/);
});

test("campos obrigatórios em falta devolvem erros por campo", async () => {
  const { env, ctx } = ambiente();
  const { email, redes_quais, ...semEmail } = BASE;
  const r = await worker.fetch(pedir({ respostas: semEmail, inicio: 1 }), env, ctx);
  const d = await r.json();
  assert.equal(r.status, 400);
  assert.ok(d.erros.email && d.erros.redes_quais);
});

test("perguntas condicionais escondidas são ignoradas", async () => {
  const { env, ctx, registos } = ambiente();
  const r = await worker.fetch(pedir({ respostas: { ...BASE, site_atual: "nao", orcamento_projeto: "2000+", desconhecido: "x" }, inicio: 1 }), env, ctx);
  assert.equal(r.status, 200);
  const guardadas = JSON.parse(registos.sql[0].v[15]);
  assert.equal(guardadas.site_atual, undefined);      // website não foi escolhido
  assert.equal(guardadas.orcamento_projeto, undefined); // só mensal
  assert.equal(guardadas.desconhecido, undefined);
});

test("opção inventada é recusada", async () => {
  const { env, ctx } = ambiente();
  const r = await worker.fetch(pedir({ respostas: { ...BASE, orcamento_mensal: "1000000" }, inicio: 1 }), env, ctx);
  assert.equal(r.status, 400);
});

test("armadilha e envio rápido: resposta normal, nada guardado", async () => {
  for (const corpo of [{ respostas: BASE, site_empresa: "spam.com", inicio: 1 }, { respostas: BASE, inicio: Date.now() - 3000 }]) {
    const { env, ctx, registos } = ambiente();
    const r = await worker.fetch(pedir(corpo), env, ctx);
    assert.equal(r.status, 200);
    assert.equal(registos.sql.length + registos.emails.length, 0);
  }
});

test("outra origem é recusada", async () => {
  const { env, ctx } = ambiente();
  const r = await worker.fetch(pedir({ respostas: BASE }, { Origin: "https://malicioso.example" }), env, ctx);
  assert.equal(r.status, 403);
});

test("sem e-mail configurado basta a base de dados", async () => {
  const { env, ctx, registos } = ambiente({ email: false });
  const r = await worker.fetch(pedir({ respostas: BASE, inicio: 1 }), env, ctx);
  assert.equal(r.status, 200);
  assert.equal(registos.sql.length, 1);
});

test("sem base de dados nem e-mail: 503", async () => {
  const { env, ctx } = ambiente({ db: false, email: false });
  const r = await worker.fetch(pedir({ respostas: BASE, inicio: 1 }), env, ctx);
  assert.equal(r.status, 503);
});

test("e-mail escapa HTML das respostas", () => {
  const { html } = montarEmail({ id: "IMP-AAAAAA", criado_em: "2026-11-01T00:00:00Z", idioma: "pt", respostas: { ...BASE, empresa: "<script>x</script>" } });
  assert.ok(!html.includes("<script>x"));
});

test("outras rotas /api devolvem 404 e páginas vão para os assets", async () => {
  const { env, ctx } = ambiente();
  assert.equal((await worker.fetch(new Request("https://heyimplement.com/api/x"), env, ctx)).status, 404);
  assert.equal(await (await worker.fetch(new Request("https://heyimplement.com/"), env, ctx)).text(), "asset");
});
