/* Implement — filtro do portfólio (/work) sem recarregar a página. Sem JS, os filtros funcionam como links (?tipo=). */
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".filtros-trabalho");
  const itens = [...document.querySelectorAll("#portfolio > li")];
  if (!nav || !itens.length) return;
  nav.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-filtro]");
    if (!a) return;
    ev.preventDefault();
    const tipo = a.dataset.filtro;
    nav.querySelectorAll("a").forEach((x) => x.toggleAttribute("aria-current", x === a));
    nav.querySelectorAll("a[aria-current]").forEach((x) => x.setAttribute("aria-current", "true"));
    itens.forEach((li) => { li.hidden = Boolean(tipo) && !li.dataset.cats.split(" ").includes(tipo); });
    history.replaceState(null, "", tipo ? `/work?tipo=${tipo}` : "/work");
  });
});
