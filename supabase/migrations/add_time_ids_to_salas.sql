-- Migration: Adicionar colunas time_a_id e time_b_id à tabela salas
-- Descrição: Suportar modo time_vs_time vinculando times aos lados da partida

-- ============================================
-- VERIFICAR E ADICIONAR COLUNAS
-- ============================================

-- Adicionar time_a_id se não existir
ALTER TABLE salas
ADD COLUMN IF NOT EXISTS time_a_id UUID;

-- Adicionar time_b_id se não existir
ALTER TABLE salas
ADD COLUMN IF NOT EXISTS time_b_id UUID;

-- ============================================
-- VERIFICAÇÃO: Listar colunas atuais
-- ============================================

-- Execute esta query para verificar se as colunas foram criadas:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name='salas' AND column_name IN ('time_a_id', 'time_b_id');

-- Resultado esperado: 2 linhas com (time_a_id, uuid) e (time_b_id, uuid)
