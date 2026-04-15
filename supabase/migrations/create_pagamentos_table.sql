-- Create pagamentos table
CREATE TABLE pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  cakto_order_id text NOT NULL UNIQUE,
  produto_id text NOT NULL,
  valor_brl numeric NOT NULL,
  mcs_creditados integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente, aprovado, recusado
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only see their own payments
CREATE POLICY "Usuário vê próprios pagamentos" ON pagamentos FOR SELECT USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX idx_pagamentos_cakto_order_id ON pagamentos(cakto_order_id);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);
