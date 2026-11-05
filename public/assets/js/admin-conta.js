/* Implement — conta e «Sair» no topo das páginas da área da equipa que não são o editor. */
const H = { "Content-Type": "application/json", "X-Implement": "1" };
const r = await fetch("/api/admin/eu", { credentials: "same-origin" }).catch(() => null);
const d = r && r.ok ? await r.json().catch(() => null) : null;
if (!d || !d.ok) location.href = "/admin/login";
else document.getElementById("conta").textContent = d.email;
document.getElementById("sair").addEventListener("click", async () => {
  try { await fetch("/api/admin/sair", { method: "POST", headers: H, body: "{}", credentials: "same-origin" }); } catch { /* já sem sessão */ }
  location.href = "/admin/login";
});
