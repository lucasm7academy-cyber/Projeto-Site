-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAR ESTRUTURA DAS TABELAS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1️⃣ Ver estrutura da tabela contas_riot
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contas_riot'
ORDER BY ordinal_position;

-- 2️⃣ Ver estrutura da tabela saldos (se existir)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'saldos'
ORDER BY ordinal_position;

-- 3️⃣ Ver estrutura da tabela profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4️⃣ Ver estrutura da tabela salas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'salas'
ORDER BY ordinal_position;

-- 5️⃣ Verificar se player_stats já existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'player_stats'
ORDER BY ordinal_position;

-- 6️⃣ Listar TODAS as tabelas do schema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 7️⃣ Verificar campos de saldo em contas_riot
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contas_riot'
  AND column_name LIKE '%saldo%' OR column_name LIKE '%balance%' OR column_name LIKE '%mp%' OR column_name LIKE '%mc%';
