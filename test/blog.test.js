// Testes do blog: limpeza do texto, vídeos, blocos e acesso à área da equipa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { limparTexto, videoEmbed, limparBlocos, emailDaEquipa, slugificar } from "../src/blog.js";
import worker from "../src/worker.js";

test("texto rico: só negrito, itálico, links seguros e quebras", () => {
  assert.equal(limparTexto('Olá <b>mundo</b> <i>x</i><script>alert(1)</script>'), "Olá <strong>mundo</strong> <em>x</em>");
  assert.equal(limparTexto('<a href="javascript:alert(1)">x</a>'), "x");
  assert.equal(limparTexto('<a href="https://exemplo.pt" onclick="x()">site</a>'), '<a href="https://exemplo.pt" rel="noopener" target="_blank">site</a>');
  assert.equal(limparTexto('<a href="/contact">c</a>'), '<a href="/contact">c</a>');
  assert.equal(limparTexto('<img src=x onerror=alert(1)>texto'), "texto");
  assert.equal(limparTexto('a &lt;b&gt; &amp; c&nbsp;d'), "a &lt;b&gt; &amp; c d");
  assert.equal(limparTexto('<strong>aberto'), "<strong>aberto</strong>");
  assert.equal(limparTexto('<span style="color:red">x</span><div>y</div>'), "x<br>y".replace("x<br>y", "xy"));
});

test("vídeos: YouTube, Shorts, Vimeo, Loom e código de incorporação", () => {
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ").src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("youtu.be/dQw4w9WgXcQ").src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://youtube.com/shorts/abcdefghijk").vertical, true);
  assert.equal(videoEmbed('<iframe src="https://player.vimeo.com/video/123456789?h=1"></iframe>').src, "https://player.vimeo.com/video/123456789");
  assert.equal(videoEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef").src, "https://www.loom.com/embed/0123456789abcdef0123456789abcdef");
  assert.equal(videoEmbed("https://evil.com/embed/x"), null);
});

test("blocos: descarta tipos e imagens desconhecidas", () => {
  const b = limparBlocos([{ t: "p", html: "<b>x</b>" }, { t: "img", src: "https://evil.com/a.png" }, { t: "img", src: "/media/abcdefgh12.webp", alt: "a" }, { t: "html", html: "<script>" }, { t: "h2", texto: "<b>T</b>" }]);
  assert.deepEqual(b.map((x) => x.t), ["p", "img", "h2"]);
  assert.equal(b[2].texto, "T");
});

test("só e-mails @heyimplement.com e slugs limpos", () => {
  assert.ok(emailDaEquipa("Jessica@HeyImplement.com"));
  assert.ok(!emailDaEquipa("jessica@heyimplement.com.evil.pt"));
  assert.ok(!emailDaEquipa("x@gmail.com"));
  assert.equal(slugificar("5 Erros que afastam clientes — Instagram!"), "5-erros-que-afastam-clientes-instagram");
});

test("API da equipa recusa pedidos sem sessão e de outra origem", async () => {
  const env = { ASSETS: { fetch: () => new Response("x") }, DB: { exec: async () => {}, prepare: () => { const q = { first: async () => null, run: async () => ({}), all: async () => ({ results: [] }) }; return { ...q, bind: () => q }; } } };
  const r1 = await worker.fetch(new Request("https://heyimplement.com/api/admin/artigos"), env, {});
  assert.equal(r1.status, 401);
  const r2 = await worker.fetch(new Request("https://heyimplement.com/api/admin/pedir-acesso", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.com", "X-Implement": "1" }, body: '{"email":"a@heyimplement.com"}' }), env, {});
  assert.equal(r2.status, 403);
  const r3 = await worker.fetch(new Request("https://heyimplement.com/admin/"), env, {});
  assert.equal(r3.status, 302);
  assert.match(r3.headers.get("Location"), /\/admin\/login$/);
  // O plano de conteúdo (e os seus ficheiros) também só abre com sessão
  for (const c of ["/admin/conteudo", "/admin/conteudo.js", "/admin/conteudo.css"]) {
    const r = await worker.fetch(new Request("https://heyimplement.com" + c), env, {});
    assert.equal(r.status, 302, c);
    assert.match(r.headers.get("Location"), /\/admin\/login$/);
  }
});

test("portfólio: reels do Instagram/TikTok e blocos de galeria, ecrãs e antes/depois", () => {
  assert.equal(videoEmbed("https://www.instagram.com/reel/C9abcdEFGhi/?igsh=x").src, "https://www.instagram.com/reel/C9abcdEFGhi/embed/");
  assert.equal(videoEmbed("https://www.tiktok.com/@loja/video/7301234567890123456").src, "https://www.tiktok.com/embed/v2/7301234567890123456");
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ").miniatura, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  const b = limparBlocos([
    { t: "galeria", imagens: [{ src: "/media/abcdefgh12.webp" }, { src: "https://evil.com/x.png" }], colunas: 9 },
    { t: "ecras", desktop: "/media/abcdefgh12.webp", url: "site.pt" },
    { t: "antesdepois", antes: "/media/abcdefgh12.webp" },
    { t: "video", ficheiro: "/media/abcdefgh12.mp4", vertical: true },
  ]);
  assert.deepEqual(b.map((x) => x.t), ["galeria", "ecras", "video"]);
  assert.equal(b[0].imagens.length, 1);
  assert.equal(b[0].colunas, 3);
  assert.equal(b[1].url, "https://site.pt");
});
