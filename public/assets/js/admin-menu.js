/* Implement — menu da área da equipa: submenus (Site, Portfólio, Financeiro) e «Copiar link» do preçário. */
const grupos = [...document.querySelectorAll(".admin-grupo")];
const fechar = (excepto) => grupos.forEach((g) => {
  if (g === excepto) return;
  g.querySelector(".admin-grupo__botao").setAttribute("aria-expanded", "false");
  g.querySelector(".admin-grupo__menu").hidden = true;
});
for (const g of grupos) {
  const botao = g.querySelector(".admin-grupo__botao");
  const menu = g.querySelector(".admin-grupo__menu");
  botao.addEventListener("click", () => {
    const abrir = botao.getAttribute("aria-expanded") !== "true";
    fechar(g);
    botao.setAttribute("aria-expanded", String(abrir));
    menu.hidden = !abrir;
    if (abrir) menu.querySelector("a")?.focus();
  });
  menu.addEventListener("click", (ev) => { if (ev.target.closest("a")) fechar(); });
}
document.addEventListener("click", (ev) => { if (!ev.target.closest(".admin-grupo")) fechar(); });
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  const aberto = grupos.find((g) => !g.querySelector(".admin-grupo__menu").hidden);
  if (aberto) { fechar(); aberto.querySelector(".admin-grupo__botao").focus(); }
});
// O grupo da página atual fica marcado (admin.js e a página de orçamentos marcam o link com aria-current)
const marcar = () => grupos.forEach((g) => g.classList.toggle("admin-grupo--atual", Boolean(g.querySelector("[aria-current]"))));
new MutationObserver(marcar).observe(document.querySelector(".admin-topo__nav"), { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
marcar();

// Copiar o link do preçário (para enviar a clientes)
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-copiar]");
  if (!b) return;
  const url = new URL(b.dataset.copiar, location.origin).href;
  const texto = b.textContent;
  try { await navigator.clipboard.writeText(url); b.textContent = "Link copiado ✓"; }
  catch { window.prompt("Copie o link:", url); }
  setTimeout(() => { b.textContent = texto; }, 1800);
});
