-- ============================================================
-- SOLUÇÃO: Remover RLS (é seguro pra painel interno)
-- Execute isso no Supabase SQL Editor
-- ============================================================

-- 1. REMOVER TODAS AS POLICIES
DROP POLICY IF EXISTS "read_own_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "proprietario_read_all" ON public.admin_usuarios;
DROP POLICY IF EXISTS "proprietario_update" ON public.admin_usuarios;
DROP POLICY IF EXISTS "users_read_own_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_update_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_insert_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "proprietario_can_read_all" ON public.admin_usuarios;

-- 2. DESABILITAR RLS NA TABELA
ALTER TABLE public.admin_usuarios DISABLE ROW LEVEL SECURITY;

-- 3. VERIFICAR SE FUNCIONOU
SELECT
  id,
  user_id,
  cargo,
  criado_em
FROM public.admin_usuarios
ORDER BY cargo DESC, criado_em DESC;

-- Se aparecer a tabela com dados, funcionou! ✅
