// =============================================================================
// REFERÊNCIA dos códigos de partida por modo
// A fonte de verdade é a tabela `codigos_partida` no Supabase.
// Para adicionar mais códigos, insira diretamente no Supabase:
//   INSERT INTO codigos_partida (codigo, modo) VALUES ('SEU-CODIGO', '5v5');
// =============================================================================

export const MODOS_COM_CODIGOS = ['5v5', '1v1', 'aram', 'torneio'] as const;

// Apenas para referência — os códigos ativos vivem no banco
export const EXEMPLOS_CODIGOS = {
  '5v5': [
    'BR04fa2-4611cfe4-f5fd-47da-8497-0b9edb308d83',
    'BR04fa2-ca5d28f8-28c3-4b03-a212-0ab9dbf237bc',
    'BR04fa2-8ad0a8b7-4d00-4ce9-9272-46c6a5ec7f53',
    'BR04fa2-4acc3d6d-923c-49b6-b9d8-2ebbb8acbad3',
  ],
  '1v1': [
    // Adicione seus códigos 1v1 aqui e rode o INSERT no Supabase
  ],
  'aram': [
    // Adicione seus códigos ARAM aqui e rode o INSERT no Supabase
  ],
  'torneio': [
    // Adicione seus códigos de torneio aqui e rode o INSERT no Supabase
  ],
};
