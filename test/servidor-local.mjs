// Servidor local para testar o Worker sem wrangler: node test/servidor-local.mjs [porta]
// D1 → SQLite (node:sqlite), ASSETS → public/, EMAIL → escreve os e-mails em /tmp/implement-emails.jsonl
import http from "node:http";
import { readFile, appendFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/worker.js";

const PORTA = Number(process.argv[2] || 8795);
const PUBLICO = path.resolve(import.meta.dirname, "../public");
const sqlite = new DatabaseSync(process.env.BD || ":memory:");
const DB = {
  prepare(sql) {
    const mk = (args) => ({
      bind: (...a) => mk(a.map((v) => (v === undefined ? null : v))),
      async run() { const r = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: r.changes } }; },
      async first() { return sqlite.prepare(sql).get(...args) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
    });
    return mk([]);
  },
  async exec(sql) { sqlite.exec(sql); },
};
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const ASSETS = {
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    let f = path.join(PUBLICO, p);
    if (p.endsWith("/")) f = path.join(f, "index.html");
    else if (!existsSync(f) || statSync(f).isDirectory()) f = existsSync(f + ".html") ? f + ".html" : path.join(f, "index.html");
    if (!f.startsWith(PUBLICO) || !existsSync(f)) return new Response(await readFile(path.join(PUBLICO, "404.html")), { status: 404, headers: { "Content-Type": TIPOS[".html"] } });
    return new Response(await readFile(f), { headers: { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" } });
  },
};
const EMAIL = { async send(m) { await appendFile("/tmp/implement-emails.jsonl", JSON.stringify(m) + "\n"); return { messageId: "local" }; } };
const env = { DB, ASSETS, EMAIL, EMAIL_DESTINO: "info@heyimplement.com", EMAIL_REMETENTE: "site@heyimplement.com" };

http.createServer(async (req, res) => {
  const partes = [];
  for await (const c of req) partes.push(c);
  const corpo = Buffer.concat(partes);
  const pedido = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : corpo });
  const ctx = { waitUntil: () => {} };
  let r;
  try { r = await worker.fetch(pedido, env, ctx); } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); return; }
  const h = {};
  r.headers.forEach((v, k) => { if (k !== "set-cookie") h[k] = v; });
  const cookies = r.headers.getSetCookie();
  if (cookies.length) h["set-cookie"] = cookies;
  res.writeHead(r.status, h);
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORTA, "127.0.0.1", () => console.log(`http://localhost:${PORTA}`));
