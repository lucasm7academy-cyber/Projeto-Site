-- ============================================================
-- FIX: Remove tudo e recria a tabela corretamente
-- Execute tudo isso no Supabase SQL Editor
-- ============================================================

-- 1. REMOVER TUDO (se existir)
DROP TRIGGER IF EXISTS trigger_novo_usuario_jogador ON auth.users;
DROP FUNCTION IF EXISTS public.atribuir_cargo_jogador();
DROP TABLE IF EXISTS public.admin_usuarios CASCADE;

-- 2. CRIAR TABELA NOVA
CREATE TABLE public.admin_usuarios (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL CHECK (cargo IN ('proprietario', 'admin', 'streamer', 'coach', 'jogador')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CRIAR ÍNDICES
CREATE INDEX idx_admin_usuarios_user_id ON public.admin_usuarios(user_id);
CREATE INDEX idx_admin_usuarios_cargo ON public.admin_usuarios(cargo);

-- 4. CRIAR FUNÇÃO PARA NOVO USUÁRIO
CREATE OR REPLACE FUNCTION public.atribuir_cargo_jogador()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_usuarios (user_id, cargo)
  VALUES (NEW.id, 'jogador');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRIAR TRIGGER
CREATE TRIGGER trigger_novo_usuario_jogador
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.atribuir_cargo_jogador();

-- 6. HABILITAR RLS
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;

-- 7. CRIAR POLICIES
CREATE POLICY "users_read_own_cargo" ON public.admin_usuarios
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au2
      WHERE au2.user_id = auth.uid() AND au2.cargo = 'proprietario'
    )
  );

CREATE POLICY "only_proprietario_update" ON public.admin_usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au2
      WHERE au2.user_id = auth.uid() AND au2.cargo = 'proprietario'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au2
      WHERE au2.user_id = auth.uid() AND au2.cargo = 'proprietario'
    )
  );

CREATE POLICY "only_proprietario_insert" ON public.admin_usuarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au2
      WHERE au2.user_id = auth.uid() AND au2.cargo = 'proprietario'
    )
  );

-- 8. INSERIR TODOS OS USUÁRIOS EXISTENTES COM CARGO 'JOGADOR'
INSERT INTO public.admin_usuarios (user_id, cargo)
SELECT id, 'jogador'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 9. ⚠️ IMPORTANTE: EXECUTE DEPOIS QUE TUDO PASSAR
-- Descomente a linha abaixo e substitua seu_uuid_aqui pelo seu ID do Supabase Auth
-- UPDATE public.admin_usuarios SET cargo = 'proprietario' WHERE user_id = 'seu_uuid_aqui';

-- 10. VERIFICAÇÃO (execute para confirmar)
SELECT
  COUNT(*) as total_usuarios,
  SUM(CASE WHEN cargo = 'proprietario' THEN 1 ELSE 0 END) as proprietarios,
  SUM(CASE WHEN cargo = 'jogador' THEN 1 ELSE 0 END) as jogadores
FROM public.admin_usuarios;
