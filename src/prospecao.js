/* Implement — prospeção (/api/admin/prospecao/*).
   Procura empresas no Google Maps (Places API, chave em GOOGLE_PLACES_KEY — segredo do Worker) e guarda na
   nossa lista só as que a equipa escolhe contactar, com estado e notas. O contacto é sempre feito por uma pessoa. */

export const ESQUEMA_LEADS = [
  "CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, place_id TEXT UNIQUE, nome TEXT NOT NULL, telefone TEXT NOT NULL DEFAULT '', site TEXT NOT NULL DEFAULT '', morada TEXT NOT NULL DEFAULT '', maps_url TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', zona TEXT NOT NULL DEFAULT '', avaliacao REAL, avaliacoes INTEGER, estado TEXT NOT NULL DEFAULT 'por_contactar', notas TEXT NOT NULL DEFAULT '', contactado_em TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL);",
  "CREATE INDEX IF NOT EXISTS leads_estado ON leads (estado, atualizado_em);",
];

const ESTADOS = new Set(["por_contactar", "contactado", "respondeu", "interessado", "cliente", "nao_quer"]);
const CAMPOS = "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.primaryTypeDisplayName,nextPageToken";
const txt = (v, n) => String(v ?? "").trim().slice(0, n);

async function procurar(env, c, ErroPedido) {
  if (!env.GOOGLE_PLACES_KEY) throw new ErroPedido(503, "SEM_CHAVE");
  const area = txt(c.area, 80), zona = txt(c.zona, 80);
  if (!area) throw new ErroPedido(400, "Escreva a área (ex.: clínica de estética).");
  const corpo = { textQuery: zona ? `${area} em ${zona}` : area, languageCode: "pt-PT", regionCode: "PT", pageSize: 20 };
  if (c.pagina) corpo.pageToken = txt(c.pagina, 1000);
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY, "X-Goog-FieldMask": CAMPOS },
    body: JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error(JSON.stringify({ evento: "places_erro", estado: r.status, erro: String(d?.error?.message || "").slice(0, 300) }));
    throw new ErroPedido(502, r.status === 403 || r.status === 400 ? "O Google recusou a pesquisa. Confirme que a chave tem a «Places API (New)» ativa e faturação ligada." : "O Google Maps não respondeu. Tente outra vez.");
  }
  const empresas = (d.places || []).filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY").map((p) => ({
    place_id: p.id,
    nome: p.displayName?.text || "",
    tipo: p.primaryTypeDisplayName?.text || "",
    morada: p.formattedAddress || "",
    telefone: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
    site: p.websiteUri || "",
    avaliacao: p.rating ?? null,
    avaliacoes: p.userRatingCount ?? null,
    maps_url: p.googleMapsUri || "",
    fechado_temp: p.businessStatus === "CLOSED_TEMPORARILY",
  }));
  return { empresas, proxima: d.nextPageToken || null };
}

export async function apiProspecao(rota, metodo, request, env, { json, lerJson, ErroPedido, idCurto }) {
  const db = env.DB;
  const agora = new Date().toISOString();
  if (rota === "prospecao/estado" && metodo === "GET") return json({ ok: true, google: Boolean(env.GOOGLE_PLACES_KEY) });
  if (rota === "prospecao/procurar" && metodo === "POST") {
    const res = await procurar(env, await lerJson(request), ErroPedido);
    // Marca as que já estão na nossa lista
    const ids = res.empresas.map((e) => e.place_id);
    const jaTemos = {};
    if (ids.length) {
      const { results } = await db.prepare(`SELECT place_id, id, estado FROM leads WHERE place_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
      for (const l of results) jaTemos[l.place_id] = { id: l.id, estado: l.estado };
    }
    return json({ ok: true, ...res, empresas: res.empresas.map((e) => ({ ...e, lead: jaTemos[e.place_id] || null })) });
  }
  if (rota === "leads" && metodo === "GET") {
    const { results } = await db.prepare("SELECT * FROM leads ORDER BY CASE estado WHEN 'interessado' THEN 0 WHEN 'respondeu' THEN 1 WHEN 'por_contactar' THEN 2 WHEN 'contactado' THEN 3 WHEN 'cliente' THEN 4 ELSE 5 END, atualizado_em DESC LIMIT 1000").all();
    return json({ ok: true, leads: results });
  }
  if (rota === "leads" && metodo === "POST") {
    const c = await lerJson(request);
    const nome = txt(c.nome, 160);
    if (!nome) throw new ErroPedido(400, "Falta o nome da empresa.");
    const estado = ESTADOS.has(c.estado) ? c.estado : "por_contactar";
    const placeId = txt(c.place_id, 300) || null;
    if (placeId) {
      const ja = await db.prepare("SELECT id FROM leads WHERE place_id = ?").bind(placeId).first();
      if (ja) {
        if (estado !== "por_contactar") await db.prepare("UPDATE leads SET estado = ?, contactado_em = COALESCE(contactado_em, ?), atualizado_em = ? WHERE id = ?").bind(estado, estado === "contactado" ? agora : null, agora, ja.id).run();
        return json({ ok: true, id: ja.id });
      }
    }
    const id = idCurto();
    const site = /^https?:\/\//i.test(String(c.site || "")) ? txt(c.site, 500) : "";
    const maps = /^https:\/\//i.test(String(c.maps_url || "")) ? txt(c.maps_url, 500) : "";
    await db.prepare("INSERT INTO leads (id, place_id, nome, telefone, site, morada, maps_url, area, zona, avaliacao, avaliacoes, estado, notas, contactado_em, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, placeId, nome, txt(c.telefone, 40), site, txt(c.morada, 300), maps, txt(c.area, 80), txt(c.zona, 80),
        Number.isFinite(+c.avaliacao) && c.avaliacao !== null ? +c.avaliacao : null, Number.isFinite(+c.avaliacoes) && c.avaliacoes !== null ? Math.round(+c.avaliacoes) : null,
        estado, txt(c.notas, 2000), estado === "contactado" ? agora : null, agora, agora).run();
    return json({ ok: true, id });
  }
  const m = rota.match(/^leads\/([a-z0-9]{6,32})$/);
  if (m && metodo === "PUT") {
    const c = await lerJson(request);
    const atual = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(m[1]).first();
    if (!atual) throw new ErroPedido(404, "Contacto não encontrado.");
    const estado = ESTADOS.has(c.estado) ? c.estado : atual.estado;
    const notas = c.notas !== undefined ? txt(c.notas, 2000) : atual.notas;
    const contactado = estado === "contactado" && !atual.contactado_em ? agora : atual.contactado_em;
    await db.prepare("UPDATE leads SET estado = ?, notas = ?, contactado_em = ?, atualizado_em = ? WHERE id = ?").bind(estado, notas, contactado, agora, m[1]).run();
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    await db.prepare("DELETE FROM leads WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }
  if (rota.startsWith("prospecao") || rota.startsWith("leads")) throw new ErroPedido(404, "Não encontrado.");
  return null;
}
