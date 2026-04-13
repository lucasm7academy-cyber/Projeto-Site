-- ============================================================
-- FIX RLS: Políticas que causam erro 500
-- Execute isso no Supabase SQL Editor
-- ============================================================

-- 1. REMOVER TODAS AS POLICIES ANTIGAS
DROP POLICY IF EXISTS "users_read_own_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_update" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_insert" ON public.admin_usuarios;
DROP POLICY IF EXISTS "proprietario_can_read_all" ON public.admin_usuarios;

-- 2. DESABILITAR RLS TEMPORARIAMENTE PARA TESTES
ALTER TABLE public.admin_usuarios DISABLE ROW LEVEL SECURITY;

-- 3. REABILITAR RLS
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR NOVA POLICY: Todos podem ler sua própria linha
CREATE POLICY "read_own_cargo" ON public.admin_usuarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- 5. CRIAR NOVA POLICY: Proprietário pode ler tudo
CREATE POLICY "proprietario_read_all" ON public.admin_usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios
      WHERE user_id = auth.uid() AND cargo = 'proprietario'
    )
  );

-- 6. PROPRIETÁRIO PODE ATUALIZAR
CREATE POLICY "proprietario_update" ON public.admin_usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios
      WHERE user_id = auth.uid() AND cargo = 'proprietario'
    )
  );

-- 7. DIAGNÓSTICO: Execute para ver quem é proprietário
SELECT
  id,
  user_id,
  cargo,
  criado_em
FROM public.admin_usuarios
ORDER BY cargo DESC, criado_em DESC;

-- 8. VERIFIQUE SEU UUID (copie de Authentication > Users)
-- Depois execute:
-- UPDATE public.admin_usuarios SET cargo = 'proprietario' WHERE user_id = 'SEU_UUID_AQUI';
