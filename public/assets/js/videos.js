/* Implement — vídeos externos (YouTube, Vimeo, Loom, Instagram, TikTok) só carregam depois de um clique.
   Assim, quem visita não recebe cookies dessas plataformas sem querer, e a página fica mais leve. */
document.addEventListener("click", (ev) => {
  const botao = ev.target.closest(".video-adiado__botao");
  if (!botao) return;
  const caixa = botao.closest(".video-adiado");
  const src = caixa.dataset.src;
  if (!/^https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com|www\.loom\.com|www\.instagram\.com|www\.tiktok\.com)\//.test(src)) return;
  const f = document.createElement("iframe");
  const auto = caixa.dataset.fonte === "youtube" || caixa.dataset.fonte === "vimeo";
  f.src = auto ? src + (src.includes("?") ? "&" : "?") + "autoplay=1" : src;
  f.title = caixa.dataset.titulo || "Vídeo";
  f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  f.allowFullscreen = true;
  f.referrerPolicy = "strict-origin-when-cross-origin";
  caixa.replaceChildren(f);
  caixa.classList.remove("video-adiado");
  f.focus();
});
