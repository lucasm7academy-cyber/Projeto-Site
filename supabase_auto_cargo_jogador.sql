-- Trigger para atribuir automaticamente cargo 'jogador' a novos usuários
-- Execute isso no Supabase SQL Editor

-- 1. Criar tabela admin_usuarios se não existir
CREATE TABLE IF NOT EXISTS public.admin_usuarios (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL CHECK (cargo IN ('proprietario', 'admin', 'streamer', 'coach', 'jogador')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índice para buscar rápido por user_id
CREATE INDEX IF NOT EXISTS idx_admin_usuarios_user_id ON public.admin_usuarios(user_id);

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

-- 5. RLS Policy para usuários verem seu próprio cargo
ALTER TABLE public.admin_usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode ler seu próprio cargo
CREATE POLICY "users_read_own_cargo" ON public.admin_usuarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Apenas proprietário pode atualizar cargos
CREATE POLICY "only_proprietario_update_cargo" ON public.admin_usuarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au
      WHERE au.user_id = auth.uid() AND au.cargo = 'proprietario'
    )
  );

-- Policy: Apenas proprietário pode inserir
CREATE POLICY "only_proprietario_insert_cargo" ON public.admin_usuarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_usuarios au
      WHERE au.user_id = auth.uid() AND au.cargo = 'proprietario'
    )
  );
