/* Implement — logótipos das marcas que trabalham connosco (Home). Vêm de /api/marcas; geridos em /admin/#/marcas. */
(async () => {
  const seccao = document.getElementById("marcas");
  const lista = document.getElementById("marcas-lista");
  if (!seccao || !lista) return;
  let marcas = [];
  try {
    const r = await fetch("/api/marcas");
    if (r.ok) marcas = (await r.json()).marcas || [];
  } catch { return; }
  if (!marcas.length) return;
  for (const m of marcas) {
    const li = document.createElement("li");
    li.className = "marca-logo";
    li.tabIndex = 0;
    const img = document.createElement("span");
    img.className = "marca-logo__img";
    img.setAttribute("role", "img");
    img.setAttribute("aria-label", m.nome);
    img.style.setProperty("--logo", `url("${m.logo}")`);
    const nome = document.createElement("span");
    nome.className = "marca-logo__nome";
    nome.setAttribute("aria-hidden", "true");
    nome.textContent = m.nome;
    li.append(img, nome);
    lista.append(li);
  }
  seccao.hidden = false;
})();
