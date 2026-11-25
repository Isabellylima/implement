/* Implement — questionário do Carvoeiro Bar (página privada).
   Junta as respostas num texto e envia para /api/contacto (base de dados, e-mail para info@ e HubSpot). */
(() => {
  const form = document.getElementById("cb-form");
  if (!form) return;
  const inicio = Date.now();
  const idioma = () => (typeof window.implementIdioma === "function" ? window.implementIdioma() : document.documentElement.lang.startsWith("pt") ? "pt" : "en");
  const TXT = {
    en: { obrigatorio: "Please fill this in.", email: "Please enter a valid email.", tel: "Please enter a valid phone number.", valor: "Please enter a monthly amount in euros.", consent: "Please tick the box to confirm.", erro: "Something went wrong. Please try again, or send us a WhatsApp.", corrigir: "Please check the fields marked in red.", aEnviar: "Sending…" },
    pt: { obrigatorio: "Preencha este campo.", email: "Escreva um e-mail válido.", tel: "Escreva um telefone válido.", valor: "Indique um valor mensal em euros.", consent: "Marque a caixa para confirmar.", erro: "Não foi possível enviar. Tente outra vez ou fale connosco por WhatsApp.", corrigir: "Verifique os campos assinalados a vermelho.", aEnviar: "A enviar…" },
  };
  const t = (k) => (TXT[idioma()] || TXT.en)[k];
  const aviso = document.getElementById("cb-aviso");
  const botao = document.getElementById("cb-enviar");

  function erro(nome, msg) {
    const p = form.querySelector(`[data-erro="${nome}"]`);
    if (p) { p.textContent = msg || ""; p.closest(".campo")?.classList.toggle("com-erro", Boolean(msg)); }
  }

  function resumo() {
    const linhas = [];
    form.querySelectorAll("fieldset[data-pergunta]").forEach((fs) => {
      const v = [...fs.querySelectorAll("input:checked")].map((i) => i.value);
      if (v.length) linhas.push(`${fs.dataset.pergunta}\n→ ${v.join(" · ")}`);
    });
    const valor = form.valor_mensal.value.trim();
    const notas = form.notas.value.trim();
    return [
      "Questionário Carvoeiro Bar (Bob van Goethem)",
      `VALOR MENSAL QUE ESTÁ DISPOSTO A INVESTIR: ${valor} €`,
      "",
      ...linhas.flatMap((l) => [l, ""]),
      notas ? `Notas do cliente:\n${notas}` : "",
    ].join("\n").trim().slice(0, 2990);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ["nome", "email", "telefone", "valor_mensal", "consentimento"].forEach((n) => erro(n, ""));
    aviso.textContent = "";
    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const telefone = form.telefone.value.trim();
    const valor = form.valor_mensal.value.trim();
    let primeiro = null;
    const falha = (campo, msg) => { erro(campo, msg); primeiro = primeiro || form.elements[campo]; };
    if (!nome) falha("nome", t("obrigatorio"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) falha("email", t("email"));
    if (telefone && (!/^\+?[0-9 ().-]{6,30}$/.test(telefone) || telefone.replace(/\D/g, "").length < 6)) falha("telefone", t("tel"));
    if (!valor || !(Number(valor) >= 0)) falha("valor_mensal", t("valor"));
    if (!form.consentimento.checked) falha("consentimento", t("consent"));
    if (primeiro) { aviso.textContent = t("corrigir"); primeiro.focus(); return; }

    botao.disabled = true;
    const rotulo = botao.querySelector("[data-i18n]");
    const original = rotulo.textContent;
    rotulo.textContent = t("aEnviar");
    try {
      const r = await fetch("/api/contacto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respostas: { nome, email, telefone: telefone || undefined, empresa: "Carvoeiro Bar Bob van Goethem", assunto: "projeto", mensagem: resumo(), consentimento: true },
          idioma: idioma(), inicio, site_empresa: form.site_empresa.value,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        if (d.erros) Object.entries(d.erros).forEach(([k, v]) => erro(k === "mensagem" ? "valor_mensal" : k, v));
        throw new Error();
      }
      form.hidden = true;
      const ok = document.getElementById("cb-sucesso");
      ok.hidden = false;
      ok.focus();
      ok.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      aviso.textContent = t("erro");
    } finally {
      botao.disabled = false;
      rotulo.textContent = original;
    }
  });
})();
