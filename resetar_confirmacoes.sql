-- RPC: resetar_confirmacoes
-- Elimina fallback de loop com 20+ queries sequenciais
-- Cole isso no Supabase SQL Editor e execute

CREATE OR REPLACE FUNCTION resetar_confirmacoes(
  p_sala_id INTEGER
) RETURNS void AS $$
BEGIN
  -- 1️⃣ Remove quem NÃO confirmou (vinculado=false e confirmado=false)
  DELETE FROM sala_jogadores
  WHERE sala_id = p_sala_id AND vinculado = FALSE AND confirmado = FALSE;

  -- 2️⃣ Reseta confirmados para false
  -- SECURITY DEFINER bypassa RLS — sem isso, UPDATE falharia por policy sj_update
  UPDATE sala_jogadores
  SET confirmado = FALSE
  WHERE sala_id = p_sala_id AND confirmado = TRUE AND vinculado = FALSE;

  -- 3️⃣ Limpa votos da rodada anterior
  DELETE FROM sala_votos WHERE sala_id = p_sala_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION resetar_confirmacoes(INTEGER) TO authenticated;
