-- ============================================================================
-- RPC: Buscar perfis públicos (sem RLS)
-- ============================================================================
-- Retorna TODOS os perfis com lane, lane2, is_vip para a página de players
-- Ignora RLS para que todos vejam os perfis públicos

CREATE OR REPLACE FUNCTION buscar_perfis_publicos(user_ids UUID[])
RETURNS TABLE (id UUID, lane TEXT, lane2 TEXT, is_vip BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.lane,
    p.lane2,
    COALESCE(p.is_vip, false) AS is_vip
  FROM profiles p
  WHERE p.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados usar a função
GRANT EXECUTE ON FUNCTION buscar_perfis_publicos(UUID[]) TO authenticated;
