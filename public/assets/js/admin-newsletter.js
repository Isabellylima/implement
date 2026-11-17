/* Implement — inscritos na newsletter (#/newsletter). Os inscritos também vão para o HubSpot, quando está ligado. */
const ORIGEM = { popup: "Pop-up", rodape: "Faixa do site", artigo: "Artigo" };
const data = (d) => new Date(d).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });

export async function vistaNewsletter({ app, api, aviso, esc }) {
  let { inscritos, hubspot } = await api("newsletter");
  function desenhar() {
    const mes = new Date(); mes.setDate(mes.getDate() - 30);
    const recentes = inscritos.filter((i) => new Date(i.criado_em) >= mes).length;
    app.innerHTML = `
      <div class="admin-cabeca">
        <div><p class="legenda">Site</p><h1>Newsletter</h1><p class="admin-cabeca__nota">Quem se inscreveu pela faixa do site ou pelo pop-up para receber novidades e pacotes.</p></div>
        ${inscritos.length ? `<button type="button" class="botao botao--secundario" data-csv><span>Exportar CSV</span></button>` : ""}
      </div>
      <div class="nl-admin-resumo">
        <div class="fin-cartao"><p class="legenda">Inscritos</p><p class="nl-admin-numero">${inscritos.length}</p></div>
        <div class="fin-cartao"><p class="legenda">Últimos 30 dias</p><p class="nl-admin-numero">${recentes}</p></div>
        <div class="fin-cartao"><p class="legenda">HubSpot</p><p class="nl-admin-hub ${hubspot ? "nl-admin-hub--sim" : ""}">${hubspot ? "Ligado: cada inscrição é enviada automaticamente." : "Ainda não ligado: as inscrições ficam guardadas aqui e podem ser exportadas em CSV."}</p></div>
      </div>
      ${inscritos.length ? `<div class="fin-cartao"><table class="fin-tabela nl-admin-tabela">
        <thead><tr><th>E-mail</th><th>Desde</th><th>Origem</th><th>Idioma</th><th>HubSpot</th><th><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${inscritos.map((i) => `<tr>
          <td><a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${i.nome ? `<br><small>${esc(i.nome)}</small>` : ""}</td>
          <td>${data(i.criado_em)}</td><td>${ORIGEM[i.origem] || esc(i.origem)}</td><td>${i.idioma.toUpperCase()}</td>
          <td>${i.hubspot ? "✓" : "—"}</td>
          <td><button type="button" class="tar-link tar-link--perigo" data-apagar="${i.id}" data-email="${esc(i.email)}">Remover</button></td>
        </tr>`).join("")}</tbody></table></div>`
      : `<div class="fin-cartao"><p class="pc-vazio nl-admin-vazio">Ainda não há inscritos. A faixa aparece no fim das páginas do site e o pop-up surge uma vez a cada visitante.</p></div>`}`;
  }
  app.onclick = async (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    if ("csv" in b.dataset) {
      const linhas = [["email", "nome", "idioma", "origem", "pais", "inscrito_em"], ...inscritos.map((i) => [i.email, i.nome, i.idioma, i.origem, i.pais || "", i.criado_em])];
      const csv = "﻿" + linhas.map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `newsletter-implement-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (b.dataset.apagar) {
      if (!confirm(`Remover ${b.dataset.email} da lista? (No HubSpot, se já lá estiver, tem de ser removido também.)`)) return;
      try { await api("newsletter/" + b.dataset.apagar, { method: "DELETE" }); aviso("Removido."); ({ inscritos, hubspot } = await api("newsletter")); desenhar(); }
      catch (e) { aviso(e.message, "erro"); }
    }
  };
  desenhar();
}
