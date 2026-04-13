-- ============================================================
-- SETUP COMPLETO: Tabela de Cargos + Trigger Automático
-- Execute tudo isso no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela admin_usuarios
CREATE TABLE IF NOT EXISTS public.admin_usuarios (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL CHECK (cargo IN ('proprietario', 'admin', 'streamer', 'coach', 'jogador')) DEFAULT 'jogador',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_usuarios_user_id ON public.admin_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_usuarios_cargo ON public.admin_usuarios(cargo);

-- 3. Função que atribui 'jogador' a novo usuário
CREATE OR REPLACE FUNCTION public.atribuir_cargo_jogador()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_usuarios (user_id, cargo)
  VALUES (NEW.id, 'jogador')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger que executa quando novo usuário é criado
DROP TRIGGER IF EXISTS trigger_novo_usuario_jogador ON auth.users;
CREATE TRIGGER trigger_novo_usuario_jogador
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.atribuir_cargo_jogador();

-- 5. Habilitar RLS
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;

-- 6. Remover policies antigas se existirem
DROP POLICY IF EXISTS "users_read_own_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_update_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "only_proprietario_insert_cargo" ON public.admin_usuarios;
DROP POLICY IF EXISTS "proprietario_can_read_all" ON public.admin_usuarios;

-- 7. Policy: Proprietário pode ler/escrever tudo
CREATE POLICY "proprietario_can_read_all" ON public.admin_usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au
      WHERE au.user_id = auth.uid() AND au.cargo = 'proprietario'
    )
    OR auth.uid() = user_id
  );

-- 8. Policy: Apenas proprietário pode atualizar
CREATE POLICY "only_proprietario_update_cargo" ON public.admin_usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au
      WHERE au.user_id = auth.uid() AND au.cargo = 'proprietario'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au
      WHERE au.user_id = auth.uid() AND au.cargo = 'proprietario'
    )
  );

-- 9. IMPORTANTE: Atribuir você como proprietário
-- SUBSTITUA seu_user_id_aqui pelo seu UUID real do Supabase Auth
-- Para encontrar: Dashboard > Authentication > Users > copie o ID
-- UPDATE public.admin_usuarios SET cargo = 'proprietario' WHERE user_id = 'seu_user_id_aqui';

-- 10. Migrar usuários existentes que ainda não têm cargo
INSERT INTO public.admin_usuarios (user_id, cargo)
SELECT id, 'jogador'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.admin_usuarios)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Verificação: Execute isso para ver os dados
-- ============================================================
-- SELECT
--   au.id,
--   au.user_id,
--   au.cargo,
--   p.email,
--   p.username,
--   au.criado_em
-- FROM public.admin_usuarios au
-- LEFT JOIN public.profiles p ON p.id = au.user_id
-- ORDER BY au.cargo DESC, au.criado_em DESC;
