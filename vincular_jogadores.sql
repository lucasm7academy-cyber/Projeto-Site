-- RPC: vincular_jogadores
-- Elimina dependência de policy RLS frágil (sj_update)
-- Cole isso no Supabase SQL Editor e execute

CREATE OR REPLACE FUNCTION vincular_jogadores(
  p_sala_id INTEGER
) RETURNS void AS $$
BEGIN
  -- ✅ Seta vinculado=true para todos os jogadores da sala
  -- SECURITY DEFINER garante que funciona mesmo se policy sj_update falhar
  UPDATE sala_jogadores
  SET vinculado = TRUE
  WHERE sala_id = p_sala_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION vincular_jogadores(INTEGER) TO authenticated;
