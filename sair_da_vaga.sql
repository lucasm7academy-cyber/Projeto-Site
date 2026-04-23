-- RPC: sair_da_vaga
-- Substitui 4-6 queries sequenciais por 1 transação atômica
-- Cole isso no Supabase SQL Editor e execute

CREATE OR REPLACE FUNCTION sair_da_vaga(
  p_sala_id INTEGER,
  p_user_id UUID
) RETURNS jsonb AS $$
DECLARE
  v_estado TEXT;
  v_is_time_a BOOLEAN;
  v_vinculado BOOLEAN;
  v_count_no_lado INTEGER;
BEGIN
  -- 1️⃣ Verificar estado (bloquear durante partida)
  SELECT estado INTO v_estado FROM salas WHERE id = p_sala_id;
  IF v_estado IN ('confirmacao','travada','aguardando_inicio','em_partida','finalizacao') THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'bloqueado', TRUE);
  END IF;

  -- 2️⃣ Buscar dados do jogador (is_time_a para resetar time_a/b depois)
  SELECT is_time_a, vinculado INTO v_is_time_a, v_vinculado
  FROM sala_jogadores WHERE sala_id = p_sala_id AND user_id = p_user_id LIMIT 1;

  IF NOT FOUND OR v_vinculado THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'bloqueado', v_vinculado);
  END IF;

  -- 3️⃣ DELETE do jogador (apenas não vinculado)
  DELETE FROM sala_jogadores
  WHERE sala_id = p_sala_id AND user_id = p_user_id AND vinculado = FALSE;

  -- 4️⃣ Se side ficou vazio (time_vs_time): limpar time_a/b da sala
  SELECT COUNT(*) INTO v_count_no_lado FROM sala_jogadores
  WHERE sala_id = p_sala_id AND is_time_a = v_is_time_a AND vinculado = FALSE;

  IF v_count_no_lado = 0 THEN
    IF v_is_time_a THEN
      UPDATE salas
      SET time_a_id=NULL, time_a_logo=NULL, time_a_nome=NULL, time_a_tag=NULL, time_a_color=NULL
      WHERE id=p_sala_id;
    ELSE
      UPDATE salas
      SET time_b_id=NULL, time_b_logo=NULL, time_b_nome=NULL, time_b_tag=NULL, time_b_color=NULL
      WHERE id=p_sala_id;
    END IF;
  END IF;

  -- ✅ Sucesso!
  RETURN jsonb_build_object('sucesso', TRUE);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('sucesso', FALSE, 'erro', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION sair_da_vaga(INTEGER, UUID) TO authenticated;
