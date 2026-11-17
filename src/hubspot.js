/* Implement — ligação ao HubSpot (Forms API v3, sem chave secreta).
   Configuração em wrangler.jsonc → vars:
     HUBSPOT_PORTAL           ID da conta (Hub ID)
     HUBSPOT_FORM_CONTACTO    GUID do formulário «Site — Contactos» (recebe Contacto e Começar um projeto)
     HUBSPOT_FORM_NEWSLETTER  GUID do formulário «Site — Newsletter»
     HUBSPOT_FORM_PROJETO     (opcional) GUID de um formulário só para «Começar um projeto» — permite um workflow próprio
                              no HubSpot (criar negócio, tarefa de acompanhamento…). Sem ele, o pedido vai para o de Contactos.
     HUBSPOT_SUBSCRICAO       (opcional) ID do tipo de subscrição de e-mail de marketing, para registar o consentimento
   Sem estas variáveis nada é enviado e o site continua a funcionar (D1 + e-mail). */

const ENDPOINT = (portal, form) => `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(portal)}/${encodeURIComponent(form)}`;

function formDe(env, tipo) {
  if (tipo === "newsletter") return env.HUBSPOT_FORM_NEWSLETTER;
  if (tipo === "projeto") return env.HUBSPOT_FORM_PROJETO || env.HUBSPOT_FORM_CONTACTO;
  return env.HUBSPOT_FORM_CONTACTO;
}
export function hubspotAtivo(env, tipo) {
  return Boolean(env.HUBSPOT_PORTAL && formDe(env, tipo));
}

const TEXTO_TRATAMENTO = {
  pt: "Concordo que a Implement use estes dados para me responder, de acordo com a política de privacidade.",
  en: "I agree that Implement may use these details to reply to me, in line with the privacy policy.",
};
const TEXTO_NEWSLETTER = {
  pt: "Quero receber por e-mail as novidades e os pacotes da Implement. Posso cancelar quando quiser.",
  en: "I want to receive Implement’s news and packages by email. I can unsubscribe at any time.",
};

/** d: { email, nome, telefone, empresa, mensagem, cidade, website, cargo, idioma, pagina, origem } */
export async function enviarHubspot(env, tipo, d) {
  if (!hubspotAtivo(env, tipo)) return false;
  const form = formDe(env, tipo);
  const idioma = d.idioma === "pt" ? "pt" : "en";
  const [primeiro, ...resto] = String(d.nome || "").trim().split(/\s+/).filter(Boolean);
  const campos = [
    ["email", d.email],
    ["firstname", primeiro],
    ["lastname", resto.join(" ")],
    ["phone", d.telefone],
    ["company", d.empresa],
    ["message", d.mensagem],
    ["city", d.cidade],
    ["website", d.website],
    ["jobtitle", d.cargo],
  ].filter(([, v]) => v).map(([name, value]) => ({ objectTypeId: "0-1", name, value: String(value).slice(0, 65000) }));

  const consent = { consentToProcess: true, text: (tipo === "newsletter" ? TEXTO_NEWSLETTER : TEXTO_TRATAMENTO)[idioma] };
  if (tipo === "newsletter" && env.HUBSPOT_SUBSCRICAO) {
    consent.communications = [{ value: true, subscriptionTypeId: Number(env.HUBSPOT_SUBSCRICAO), text: TEXTO_NEWSLETTER[idioma] }];
  }
  const corpo = {
    submittedAt: Date.now(),
    fields: campos,
    context: { pageUri: d.pagina || "https://heyimplement.com/", pageName: d.origem || tipo },
    legalConsentOptions: { consent },
  };
  const r = await fetch(ENDPOINT(env.HUBSPOT_PORTAL, form), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) {
    const t = (await r.text()).slice(0, 500);
    throw new Error(`HubSpot ${r.status}: ${t}`);
  }
  return true;
}
