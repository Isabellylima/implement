-- Pedidos do formulário «Start a Project» (heyimplement.com/start-a-project)
CREATE TABLE IF NOT EXISTS pedidos (
  id               TEXT PRIMARY KEY,            -- referência curta mostrada ao cliente (ex.: IMP-7K2Q9X)
  criado_em        TEXT NOT NULL,               -- ISO 8601, UTC
  idioma           TEXT NOT NULL,               -- pt | en
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefone         TEXT,
  empresa          TEXT NOT NULL,
  setor            TEXT,
  localizacao      TEXT,
  servicos         TEXT NOT NULL,               -- lista separada por vírgulas
  objetivo         TEXT,
  tipo_trabalho    TEXT,
  orcamento_mensal TEXT,
  orcamento_projeto TEXT,
  prazo            TEXT,
  respostas        TEXT NOT NULL,               -- JSON com todas as respostas validadas
  pais             TEXT,                        -- país do pedido (Cloudflare), sem IP
  email_enviado    INTEGER NOT NULL DEFAULT 0,  -- 1 = notificação enviada para a equipa
  estado           TEXT NOT NULL DEFAULT 'novo' -- novo | em análise | proposta enviada | fechado | sem seguimento
);

CREATE INDEX IF NOT EXISTS pedidos_criado_em ON pedidos (criado_em DESC);
CREATE INDEX IF NOT EXISTS pedidos_estado ON pedidos (estado);
