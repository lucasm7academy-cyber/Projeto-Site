# Sistema de Ranking M7 Points

## 📊 Estrutura de Dados

### 1. Campos a Adicionar em `contas_riot`
```sql
ALTER TABLE contas_riot ADD COLUMN IF NOT EXISTS mp INTEGER DEFAULT 0;
ALTER TABLE contas_riot ADD COLUMN IF NOT EXISTS mc INTEGER DEFAULT 0;
```

### 2. Nova Tabela `player_stats` (Estatísticas por Modo)
```sql
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  modo TEXT NOT NULL, -- '5v5', 'time_vs_time', 'aram', '1v1'
  vitories INTEGER DEFAULT 0,
  defeats INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  winrate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, modo)
);
```

### 3. Nova Tabela `partida_resultados` (Histórico de Partidas)
```sql
CREATE TABLE IF NOT EXISTS partida_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id INTEGER NOT NULL,
  modo TEXT NOT NULL,
  vencedor TEXT, -- 'time_a', 'time_b', 'empate'
  jogadores JSONB, -- [{user_id, isTimeA, mp_ganho}, ...]
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 🎯 Sistema de Pontuação

| Modo | Vitória | Derrota |
|------|---------|---------|
| 5v5 | +15 MP | +1 MP |
| Time vs Time | +20 MP | +2 MP |
| ARAM | +8 MP | +1 MP |
| 1v1 | 0 MP | 0 MP |

## 📝 Fluxo de Implementação

1. **Banco de Dados**: Adicionar campos `mp` e `mc` em `contas_riot`
2. **API**: Criar função `atualizarPontosJogador()` em `src/api/player.ts`
3. **Lógica**: Chamar função quando `encerrarSala()` é executada
4. **Frontend**: 
   - Atualizar `players.tsx` para ordernar por MP
   - Exibir stats do jogador (MP, vitórias, derrotas, winrate)

## 🔗 Integração com SalaPage

Quando a partida encerra (estado = 'encerrada'):
1. Identificar vencedor
2. Para cada jogador na sala:
   - Calcular MP ganho/perdido
   - Atualizar campo `mp` em `contas_riot`
   - Atualizar estatísticas por modo em `player_stats`
3. Salvar histórico em `partida_resultados`
