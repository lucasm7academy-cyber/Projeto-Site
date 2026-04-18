-- Script para criar salas de teste em diferentes estados
-- Copie e execute no Supabase SQL Editor

-- Assumindo que você quer usar seu user_id, ajuste abaixo:
-- SELECT auth.uid() AS seu_user_id

-- Criar salas em diferentes estados
WITH user_id AS (
  SELECT auth.uid() as id
)

INSERT INTO salas (nome, criadorId, modo, mpoints, estado, codigo, codigoPartida)
SELECT
  CASE
    WHEN ordinality = 1 THEN 'Sala Teste - ABERTA'
    WHEN ordinality = 2 THEN 'Sala Teste - PREENCHENDO'
    WHEN ordinality = 3 THEN 'Sala Teste - CONFIRMACAO'
    WHEN ordinality = 4 THEN 'Sala Teste - AGUARDANDO_INICIO'
    WHEN ordinality = 5 THEN 'Sala Teste - EM_PARTIDA'
    WHEN ordinality = 6 THEN 'Sala Teste - FINALIZACAO'
    WHEN ordinality = 7 THEN 'Sala Teste - ENCERRADA'
  END AS nome,
  (SELECT id FROM user_id),
  '5v5',
  10,
  CASE
    WHEN ordinality = 1 THEN 'aberta'
    WHEN ordinality = 2 THEN 'preenchendo'
    WHEN ordinality = 3 THEN 'confirmacao'
    WHEN ordinality = 4 THEN 'aguardando_inicio'
    WHEN ordinality = 5 THEN 'em_partida'
    WHEN ordinality = 6 THEN 'finalizacao'
    WHEN ordinality = 7 THEN 'encerrada'
  END AS estado,
  'TST' || ordinality::text,
  CASE
    WHEN ordinality >= 4 THEN 'MATCH' || ordinality::text
    ELSE NULL
  END
FROM generate_series(1, 7) ordinality
RETURNING id, nome, estado;

-- Nota: Você precisará copiar os IDs das salas criadas acima e inserir nas queries seguintes
-- Ou execute este script completo em uma transação
