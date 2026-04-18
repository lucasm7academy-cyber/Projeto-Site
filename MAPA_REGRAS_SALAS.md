# 🗺️ MAPA DE REGRAS, MODOS E CONFIGURAÇÕES DE SALAS

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── components/partidas/
│   └── salaConfig.ts          ← CONFIGURAÇÕES CENTRALIZADAS (Modos, Roles, MPoints, Elo)
├── api/
│   ├── salas.ts               ← CAMADA DE DADOS E FUNÇÕES UTILITÁRIAS
│   └── draft.ts               ← LÓGICA DO DRAFT E TURNO
├── contexts/
│   └── SalaRegras.tsx         ← MÁQUINA DE ESTADOS E TRANSIÇÕES (Aberta → Preenchendo → Confirmação → Travada → etc)
└── pages/
    ├── Jogar.tsx              ← VALIDAÇÕES DE ENTRADA E TELA DE SELEÇÃO
    └── SalaPage.tsx           ← GERENCIAMENTO DURANTE A PARTIDA
```

---

## 🎮 MODOS DE JOGO

**Arquivo:** `src/components/partidas/salaConfig.ts` (linhas 7-57)

### Configuração: `MODOS_JOGO`

| Modo | Max Jogadores | Por Time | Tipo | Draft | Regras |
|------|---------------|----------|------|-------|--------|
| **5v5** | 10 | 5 | individual | Sim (20 turnos) | Qualquer pessoa pode entrar |
| **ARAM** | 10 | 5 | individual | Não (sem draft) | Qualquer pessoa pode entrar |
| **1v1** | 2 | 1 | individual | Sim (4 turnos) | Apenas 2 pessoas |
| **time_vs_time** | 10 | 5 | time | Sim (20 turnos) | **APENAS times pré-registrados** |

**Função de Acesso:**
- `getModoInfo(modo)` → retorna config do modo
- `getMaxJogadoresPorModo(modo)` → retorna limite de jogadores
- `getJogadoresPorTime(modo)` → retorna quantos por time

---

## 👥 ROLES (POSIÇÕES)

**Arquivo:** `src/components/partidas/salaConfig.ts` (linhas 103-112)

### Configuração: `ROLE_CONFIG`

| Role | Descrição | Cores |
|------|-----------|-------|
| **TOP** | Top lane | 🔴 Red |
| **JG** | Jungle (o escolhedor no draft) | 🟢 Green |
| **MID** | Mid lane | 🔵 Blue |
| **ADC** | Atirador | 🟡 Yellow |
| **SUP** | Suporte | 🟠 Amber |
| **RES** | Reserva | ⚫ Gray |

**Regra especial:** Apenas **JG** (5v5) e **MID** (1v1) podem fazer o draft!

---

## 💰 M POINTS (APOSTAS)

**Arquivo:** `src/components/partidas/salaConfig.ts` (linhas 69-76)

### Opções Disponíveis:

```
0 MP    → Casual (sem aposta)
100 MP  → Pequena aposta
200 MP  → Média aposta
500 MP  → Aposta considerável
1000 MP → Alta aposta
2000 MP → Muito alta
```

**Função:** `getMPointsInfo(valor)` → retorna label e cor

---

## ⭐ ELO MÍNIMO

**Arquivo:** `src/components/partidas/salaConfig.ts` (linhas 85-97)

### Restrições de Elo:

- Sem restrição (padrão)
- Ferro+
- Bronze+
- Prata+
- Ouro+
- Platina+
- Esmeralda+
- Diamante+
- Mestre+
- Grão-Mestre+
- Desafiante+

---

## 🔄 ESTADOS DA SALA (Máquina de Estados)

**Arquivo:** `src/api/salas.ts` (linhas 11-19) + `src/contexts/SalaRegras.tsx`

### Fluxo de Estados:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÁQUINA DE ESTADOS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ABERTA                                                          │
│  ↓ (alguém entra)                                               │
│  PREENCHENDO                                                     │
│  ↓ (todos entram + timer confirmação)                           │
│  CONFIRMACAO (⏱️ Espera confirmação)                             │
│  ↓ (todos confirmam)                                            │
│  TRAVADA (Jogadores vinculados, draft começa)                   │
│  ├─→ DRAFT ACONTECE AQUI ←─┤                                    │
│  ↓ (draft termina ou timeout)                                   │
│  AGUARDANDO_INICIO (⏱️ Votação: partida começou?)               │
│  ↓ (votação passa)                                              │
│  EM_PARTIDA                                                     │
│  ↓ (partida termina)                                            │
│  FINALIZACAO (⏱️ Votação: quem venceu?)                          │
│  ↓ (votação passa)                                              │
│  ENCERRADA ✓                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Arquivo que controla:** `src/contexts/SalaRegras.tsx`

---

## 🚪 VALIDAÇÕES DE ENTRADA

**Arquivo:** `src/pages/Jogar.tsx` + `src/api/salas.ts` (funções `entrarNaVaga`)

### Regras para entrar em uma vaga:

#### Para QUALQUER MODO:
- ✅ Sala em estado `aberta` ou `preenchendo`
- ✅ Vaga específica (role + time) vazia
- ✅ Usuário não pode estar em outra sala (com `vinculado: true`)
- ✅ Usuário tem elo >= `eloMinimo` (se houver restrição)
- ✅ Sala não pode estar cheia (depende do modo)

#### Para **time_vs_time** ESPECIFICAMENTE:
- ⚠️ **TODO:** Validar se é membro do time (FALTA IMPLEMENTAR!)
- ⚠️ **TODO:** Validar se time tem permissão (FALTA IMPLEMENTAR!)

**Função:** `entrarNaVaga(salaId, usuario, role, isTimeA)` → `boolean`

---

## 📋 CONFIRMAÇÃO DE JOGADORES

**Arquivo:** `src/contexts/SalaRegras.tsx`

### Fluxo:

1. Sala cheia → muda para `confirmacao`
2. Timer de 30 segundos começa
3. Cada jogador clica "Confirmar"
4. Se TODOS confirmam antes do timer → `travada`
5. Se timer expira → quem NÃO confirmou é **EXPULSO**, outros voltam para `preenchendo`

**Funções:**
- `confirmarPresenca()` → marca como confirmado
- `acaoCheckConfirmacoes()` → verifica se todos confirmaram

---

## 🎰 DRAFT (Apenas para modos com draft)

**Arquivo:** `src/components/draft/DraftRoom.tsx` + `src/api/draft.ts`

### Modos com Draft:
- ✅ **5v5** → 20 turnos (5 ban + 5 pick por time)
- ✅ **1v1** → 4 turnos (1 ban + 1 pick por time)
- ❌ **ARAM** → Sem draft

### Quem pode fazer draft:
- **5v5 + time_vs_time:** JG (Jungle) de cada time
- **1v1:** MID de cada time

### Turnos:

**5v5 (20 turnos total):**
```
Bans:    Turns 0-5   (3 por time)
Picks:   Turns 6-11  (5 picks alternados)
Bans2:   Turns 12-15 (2 por time)
Picks2:  Turns 16-19 (4 picks finais)
```

**1v1 (4 turnos total):**
```
Ban:     Turn 0-1 (1 por time)
Pick:    Turn 2-3 (1 por time)
```

### Regras de Draft:

1. **Timer por turno:** 30 segundos
2. **Timeout:** Se não escolher em 30s → automático (ban em branco ou skip pick)
3. **Turn 0 problema:** Se completar TODOS os turnos sem fazer nada → sala reseta
4. **Bloqueados:** Não pode escolher o mesmo campeão 2x

**Função:** `getTurnOrder(modo)` → retorna ordem de turnos

---

## 🔓 SENHA

**Arquivo:** `src/api/salas.ts` (campo `temSenha` + `senha`)

### Validação:
- Se `temSenha: true` → precisa dar senha correta para entrar
- Validação acontece em `Jogar.tsx`

---

## 🏆 RESULTADO E VOTAÇÃO

**Arquivo:** `src/contexts/SalaRegras.tsx`

### Fases de votação:

1. **Votação de Início:** "A partida começou?"
   - Opções: `iniciou` / `nao_iniciou`
   - Se maioria diz `nao_iniciou` → volta para `preenchendo`

2. **Votação de Resultado:** "Quem venceu?"
   - Opções: `time_a` / `time_b`
   - Resultado fica em `vencedor` da sala

---

## 🚨 REGRAS ESPECIAIS POR MODO

### 5v5 - Individual
- Qualquer pessoa entra (sem validação de time)
- Draft: JG escolhe

### ARAM - Individual
- Qualquer pessoa entra
- **Sem draft** (escolha aleatória)

### 1v1 - Individual
- Max 2 jogadores
- Draft: MID escolhe
- Validação: Não pode outro do mesmo elo? (verificar!)

### time_vs_time - Times
- **⚠️ VALIDAÇÃO CRÍTICA:** Precisa verificar se é membro do time!
- Draft: JG escolhe
- **Donde está agora:** Em `SalaRegras.tsx` - procure `time_vs_time` ou `TIPO_TIME`
- **Precisar mexer aqui:** Se quer customizar quem pode entrar

---

## 📝 RESUMO: ONDE MEXER PARA CADA TIPO DE MUDANÇA

| Quero mudar... | Arquivo | Função |
|---|---|---|
| Máximo de jogadores 5v5 | `salaConfig.ts` | `MODOS_JOGO['5v5'].maxJogadores` |
| Opções de elo mínimo | `salaConfig.ts` | `OPCOES_ELO` |
| Opções de M Points | `salaConfig.ts` | `OPCOES_MPOINTS` |
| Tempo de confirmação | `SalaRegras.tsx` | `confirmacaoExpiresAt` (30s) |
| Tempo de votação | `SalaRegras.tsx` | `aguardandoInicioExpiresAt` |
| Validação de entrada | `salas.ts` | `entrarNaVaga()` |
| Validação **time_vs_time** | `SalaRegras.tsx` + `salas.ts` | Adicionar check de time |
| Draft (turnos, bans) | `draftTypes.ts` | `TURN_ORDER_5V5`, `TURN_ORDER_1V1` |
| Timer do draft | `DraftRoom.tsx` | `timer` state (30s) |
| Quem pode fazer draft | `SalaPage.tsx` | Verificar `cargoUsuario === 'jg'` |

---

## 🔗 DEPENDÊNCIAS ENTRE ARQUIVOS

```
salaConfig.ts
    ├─→ usado em: Jogar.tsx, SalaPage.tsx, SalaRegras.tsx
    └─→ define: modos, roles, elo, mpoints

salas.ts
    ├─→ usado em: SalaRegras.tsx, Jogar.tsx, SalaPage.tsx
    └─→ define: tipos, estados, entrarNaVaga, sairDaVaga

SalaRegras.tsx
    ├─→ usa: salas.ts, salaConfig.ts, draft.ts
    └─→ controla: transições de estado, confirmação, votação

DraftRoom.tsx
    ├─→ usa: draft.ts, draftTypes.ts
    └─→ controla: turno a turno, validações de draft

Jogar.tsx
    ├─→ usa: salas.ts, salaConfig.ts
    └─→ controla: tela de seleção e validação de entrada

SalaPage.tsx
    ├─→ usa: SalaRegras.tsx, DraftRoom.tsx
    └─→ controla: UI durante partida
```

---

## 🎯 PRÓXIMAS CUSTOMIZAÇÕES

### Para **time_vs_time**:
1. Ir em `src/contexts/SalaRegras.tsx`
2. Procurar por validação de time (search: "time_vs_time")
3. Adicionar função que verifica se usuário é membro do time (query na tabela `time_membros`)
4. Impedir entrada se não for membro

### Para **regras customizadas por modo**:
1. Adicionar campo `regras: {}` em `MODOS_JOGO`
2. Passar para `SalaRegras.tsx`
3. Validar no `entrarNaVaga()`
