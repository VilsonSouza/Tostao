CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('CHECKING','SAVINGS','CREDIT_CARD','CASH')),
  currency   CHAR(3) NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = categoria padrão do sistema
  name    VARCHAR(80) NOT NULL,
  emoji   VARCHAR(8)
);

CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id),
  description     VARCHAR(255) NOT NULL,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  type            VARCHAR(6) NOT NULL CHECK (type IN ('CREDIT','DEBIT')),
  is_bill_payment BOOLEAN NOT NULL DEFAULT FALSE, -- pagamento de fatura: transferência interna, não é renda
  occurred_on     DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, occurred_on DESC);

INSERT INTO categories (name, emoji) VALUES
 ('Alimentação','🍽️'),('Supermercado','🛒'),('Transporte','🚌'),('Moradia','🏠'),
 ('Saúde','💊'),('Educação','📚'),('Lazer','🎟️'),('Assinaturas','🔁'),
 ('Transferências','↔️'),('Investimentos','📈'),('Salário','💰'),('Outros','📦');
