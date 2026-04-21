-- Função RPC para incrementar saldo de forma atômica (sem race conditions)
-- Execute isso no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION incrementar_saldo(user_id_param UUID, valor_param INTEGER)
RETURNS void AS $$
BEGIN
  -- Atualizar saldo de forma atômica (tudo acontece no banco, não no app)
  -- Se usuário não existe, criar com o valor
  INSERT INTO saldos (user_id, saldo)
  VALUES (user_id_param, MAX(0, valor_param))
  ON CONFLICT (user_id) DO UPDATE
  SET saldo = MAX(0, saldos.saldo + valor_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION incrementar_saldo TO authenticated;
