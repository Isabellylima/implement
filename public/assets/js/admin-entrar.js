/* Implement — entrada na área da equipa (link por e-mail, sem palavras-passe). */
const pagina = document.body.dataset.pagina;
const estado = document.getElementById("estado");
const cabecalhos = { "Content-Type": "application/json", "X-Implement": "1" };

async function pedir(caminho, corpo) {
  const r = await fetch(caminho, { method: "POST", headers: cabecalhos, body: JSON.stringify(corpo), credentials: "same-origin" });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d.ok, ...d };
}

if (pagina === "login") {
  const forma = document.getElementById("forma");
  const campo = document.getElementById("email");
  const botao = document.getElementById("enviar");
  try { campo.value = localStorage.getItem("implement-admin-email") || ""; } catch { /* sem armazenamento */ }
  forma.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = campo.value.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@heyimplement\.com$/.test(email)) {
      estado.textContent = "Use o seu e-mail @heyimplement.com.";
      estado.dataset.tipo = "erro";
      campo.focus();
      return;
    }
    botao.disabled = true;
    estado.dataset.tipo = "";
    estado.textContent = "A enviar…";
    try {
      const r = await pedir("/api/admin/pedir-acesso", { email });
      if (r.ok) {
        try { localStorage.setItem("implement-admin-email", email); } catch { /* sem armazenamento */ }
        estado.dataset.tipo = "ok";
        estado.textContent = `Enviámos um link para ${email}. Abra o e-mail neste dispositivo e carregue em «Entrar». Pode demorar um minuto; veja também o spam.`;
      } else {
        estado.dataset.tipo = "erro";
        estado.textContent = r.erro || "Não foi possível enviar o link. Tente outra vez.";
      }
    } catch {
      estado.dataset.tipo = "erro";
      estado.textContent = "Sem ligação. Tente outra vez.";
    } finally {
      botao.disabled = false;
    }
  });
}

if (pagina === "entrar") {
  const token = new URLSearchParams(location.hash.slice(1)).get("t");
  const botao = document.getElementById("confirmar");
  const novo = document.getElementById("novo-link");
  // O token sai da barra de endereço (não fica no histórico nem em capturas de ecrã)
  history.replaceState(null, "", location.pathname);
  if (!token) {
    estado.dataset.tipo = "erro";
    estado.textContent = "Este link está incompleto. Abra-o outra vez a partir do e-mail ou peça um novo.";
    novo.hidden = false;
  } else {
    botao.hidden = false;
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      estado.dataset.tipo = "";
      estado.textContent = "A entrar…";
      try {
        const r = await pedir("/api/admin/entrar", { token });
        if (r.ok) { location.replace("/admin/"); return; }
        estado.dataset.tipo = "erro";
        estado.textContent = r.erro || "Não foi possível entrar.";
        botao.hidden = true;
        novo.hidden = false;
      } catch {
        estado.dataset.tipo = "erro";
        estado.textContent = "Sem ligação. Tente outra vez.";
        botao.disabled = false;
      }
    });
  }
}
