/* Metricool — estatísticas de visitas do site (ligado à conta da Implement no Metricool).
   Fica num ficheiro à parte porque a política de segurança do site não permite scripts escritos dentro das páginas. */
(function () {
  var s = document.createElement("script");
  s.src = "https://tracker.metricool.com/resources/be.js";
  s.async = true;
  s.onload = function () { if (window.beTracker) window.beTracker.t({ hash: "f90767cc2cf4bf060cb524104d69ec10" }); };
  document.head.appendChild(s);
})();
