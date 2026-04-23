-- RPC: entrar_na_vaga
-- Substitui 12-15 queries sequenciais por 1 transação atômica
-- Cole isso no Supabase SQL Editor e execute

CREATE OR REPLACE FUNCTION entrar_na_vaga(
  p_sala_id INTEGER,
  p_user_id UUID,
  p_nome TEXT,
  p_tag TEXT,
  p_elo TEXT,
  p_avatar TEXT,
  p_role TEXT,
  p_is_time_a BOOLEAN,
  p_modo TEXT
) RETURNS jsonb AS $$
DECLARE
  v_vaga_ocupada BOOLEAN;
  v_usuario_vinculado BOOLEAN;
  v_user_ja_em_sala INTEGER;
  v_count_jogadores INTEGER;
  v_time_id UUID;
  v_vaga_anterior BOOLEAN;
  v_count_no_lado INTEGER;
  v_result JSONB;
BEGIN
  -- 1️⃣ Verificar se vaga está ocupada por OUTRO usuário
  SELECT COUNT(*) > 0 INTO v_vaga_ocupada
  FROM sala_jogadores
  WHERE sala_id = p_sala_id
    AND role = p_role
    AND is_time_a = p_is_time_a
    AND user_id != p_user_id;

  IF v_vaga_ocupada THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'Vaga ocupada');
  END IF;

  -- 2️⃣ Verificar se usuário está VINCULADO a outra sala
  SELECT COUNT(*) > 0 INTO v_usuario_vinculado
  FROM sala_jogadores
  WHERE user_id = p_user_id
    AND vinculado = TRUE
    AND sala_id != p_sala_id;

  IF v_usuario_vinculado THEN
    RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'Você está em outra sala');
  END IF;

  -- 3️⃣ Validação time_vs_time: buscar time do usuário
  IF p_modo = 'time_vs_time' THEN
    SELECT time_id INTO v_time_id
    FROM time_membros
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_time_id IS NULL THEN
      RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'Você precisa estar em um time');
    END IF;

    -- Verificar se já tem time definido naquele lado
    IF p_is_time_a THEN
      SELECT time_a_id INTO v_time_id FROM salas WHERE id = p_sala_id;
    ELSE
      SELECT time_b_id INTO v_time_id FROM salas WHERE id = p_sala_id;
    END IF;

    -- Se já tem time e é diferente, rejeitar
    IF v_time_id IS NOT NULL AND v_time_id != v_time_id THEN
      RETURN jsonb_build_object('sucesso', FALSE, 'erro', 'Esta vaga é exclusiva para outro time');
    END IF;
  END IF;

  -- 4️⃣ Buscar vaga anterior (antes de remover)
  SELECT is_time_a INTO v_vaga_anterior
  FROM sala_jogadores
  WHERE sala_id = p_sala_id
    AND user_id = p_user_id
    AND vinculado = FALSE
  LIMIT 1;

  -- 5️⃣ Remover de qualquer outra sala (sem vínculo)
  DELETE FROM sala_jogadores
  WHERE user_id = p_user_id
    AND vinculado = FALSE
    AND sala_id != p_sala_id;

  -- 6️⃣ Remover vaga anterior (nesta sala)
  DELETE FROM sala_jogadores
  WHERE sala_id = p_sala_id
    AND user_id = p_user_id
    AND vinculado = FALSE;

  -- 7️⃣ Contar jogadores para definir líder
  SELECT COUNT(*) INTO v_count_jogadores
  FROM sala_jogadores
  WHERE sala_id = p_sala_id;

  -- 8️⃣ INSERT novo jogador
  INSERT INTO sala_jogadores (
    sala_id, user_id, nome, tag, elo, role, is_lider, is_time_a, confirmado, vinculado, avatar
  ) VALUES (
    p_sala_id, p_user_id, p_nome, p_tag, p_elo, p_role,
    (v_count_jogadores = 0), p_is_time_a, FALSE, FALSE, p_avatar
  );

  -- 9️⃣ Limpar time_id do lado anterior se ficou vazio (time_vs_time)
  IF v_vaga_anterior IS NOT NULL AND p_modo = 'time_vs_time' THEN
    SELECT COUNT(*) INTO v_count_no_lado
    FROM sala_jogadores
    WHERE sala_id = p_sala_id
      AND is_time_a = v_vaga_anterior
      AND vinculado = FALSE;

    IF v_count_no_lado = 0 THEN
      IF v_vaga_anterior THEN
        UPDATE salas SET time_a_id = NULL, time_a_logo = NULL, time_a_nome = NULL, time_a_tag = NULL, time_a_color = NULL
        WHERE id = p_sala_id;
      ELSE
        UPDATE salas SET time_b_id = NULL, time_b_logo = NULL, time_b_nome = NULL, time_b_tag = NULL, time_b_color = NULL
        WHERE id = p_sala_id;
      END IF;
    END IF;
  END IF;

  -- 🔟 Registrar TIME NA SALA (time_vs_time)
  IF p_modo = 'time_vs_time' THEN
    SELECT time_id INTO v_time_id
    FROM time_membros
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_time_id IS NOT NULL THEN
      -- Verificar qual time já está definido
      DECLARE
        v_time_a_id UUID;
        v_time_b_id UUID;
        v_time_data RECORD;
      BEGIN
        SELECT time_a_id, time_b_id INTO v_time_a_id, v_time_b_id
        FROM salas WHERE id = p_sala_id;

        -- Se este lado não tem time, registrar
        IF (p_is_time_a AND v_time_a_id IS NULL) OR (NOT p_is_time_a AND v_time_b_id IS NULL) THEN
          -- Atualizar time_id
          IF p_is_time_a THEN
            UPDATE salas SET time_a_id = v_time_id WHERE id = p_sala_id;
          ELSE
            UPDATE salas SET time_b_id = v_time_id WHERE id = p_sala_id;
          END IF;

          -- Buscar dados do time
          SELECT id, name, logo_url, tag, gradient_from INTO v_time_data
          FROM times WHERE id = v_time_id;

          -- Atualizar nome, logo, tag, cor
          IF v_time_data IS NOT NULL THEN
            IF p_is_time_a THEN
              UPDATE salas SET
                time_a_nome = COALESCE(v_time_data.name, v_time_data.tag),
                time_a_logo = v_time_data.logo_url,
                time_a_tag = v_time_data.tag,
                time_a_color = COALESCE(v_time_data.gradient_from, '#a855f7')
              WHERE id = p_sala_id;
            ELSE
              UPDATE salas SET
                time_b_nome = COALESCE(v_time_data.name, v_time_data.tag),
                time_b_logo = v_time_data.logo_url,
                time_b_tag = v_time_data.tag,
                time_b_color = COALESCE(v_time_data.gradient_from, '#a855f7')
              WHERE id = p_sala_id;
            END IF;
          END IF;
        END IF;
      END;
    END IF;
  END IF;

  -- ✅ Sucesso!
  RETURN jsonb_build_object('sucesso', TRUE);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('sucesso', FALSE, 'erro', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION entrar_na_vaga(INTEGER, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
