-- ============================================================================
-- RPC: Atribuir Código de Partida com Fila FIFO e Reciclagem Automática
-- ============================================================================
-- Sistema de Fila Circular (round-robin):
-- 1. Códigos com em_uso = false são atribuídos em ordem (id crescente)
-- 2. Quando um código é usado, é marcado com em_uso = true
-- 3. Quando a partida encerra, código retorna para em_uso = false
-- 4. Garante atomicidade: dois clientes nunca recebem o mesmo código
-- ============================================================================

CREATE OR REPLACE FUNCTION atribuir_codigo_partida(p_sala_id INT, p_modo TEXT)
RETURNS TEXT AS $$
DECLARE
  v_codigo_id INT;
  v_codigo TEXT;
BEGIN
  -- ✅ BLOQUEIA: garante que apenas uma transação por vez acessa
  LOCK TABLE codigos_partida IN ACCESS EXCLUSIVE MODE;

  -- Busca o primeiro código DISPONÍVEL (em_uso = false) para este modo
  SELECT id, codigo INTO v_codigo_id, v_codigo
  FROM codigos_partida
  WHERE modo = p_modo AND em_uso = false
  ORDER BY id ASC
  LIMIT 1;

  -- Se não encontrou, retorna NULL (tabela vazia ou todos em uso)
  IF v_codigo_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ✅ MARCA como em uso e associa à sala
  UPDATE codigos_partida
  SET em_uso = true, sala_id = p_sala_id
  WHERE id = v_codigo_id;

  -- Retorna o código atribuído
  RETURN v_codigo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Liberar Código de Partida (Reciclagem)
-- ============================================================================
-- Quando uma partida encerra, o código retorna ao final da fila.
-- O sistema então o reutilizará quando todos os outros forem usados.
-- ============================================================================

CREATE OR REPLACE FUNCTION liberar_codigo_partida(p_sala_id INT)
RETURNS VOID AS $$
BEGIN
  -- ✅ Marca código como DISPONÍVEL novamente (em_uso = false)
  UPDATE codigos_partida
  SET em_uso = false, sala_id = NULL
  WHERE sala_id = p_sala_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
