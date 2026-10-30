# Tostão — assistente de finanças pessoais com IA

Nome de trabalho (troque à vontade). Projeto próprio: código, visual e textos originais.

## Estrutura

```
tostao/
├── docker-compose.yml        # PostgreSQL local
├── .env.example
└── apps/
    ├── api/                  # TypeScript + Fastify + PostgreSQL (pg) + zod
    │   ├── migrations/       # SQL aplicado automaticamente ao iniciar (001_init.sql)
    │   └── src/              # server, routes, auth (JWT), db, ai (LlmClient), csv, categorize + testes
    └── web/                  # Next.js (App Router) + Tailwind
        └── app/(app)/{dashboard,transactions}
```

## O que baixar e instalar

| Item | Versão | Para quê |
|---|---|---|
| Git | recente | versionamento |
| Node.js | 20 ou 22 LTS (inclui npm) | API e front |
| Docker Desktop | recente | PostgreSQL em container |
| VS Code | recente | editar o código |
| DBeaver (opcional) | recente | olhar o banco |

Windows (PowerShell, via winget):

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Docker.DockerDesktop
winget install Microsoft.VisualStudioCode
winget install DBeaver.DBeaver.Community
```

Depois de instalar, feche e reabra o terminal e confira: `git --version && node -v && npm -v && docker --version`

## Rodando localmente

1. **Banco**
   ```bash
   cp .env.example .env
   docker compose up -d
   ```
   Se você já subiu a versão antiga (Java) com este banco, recrie-o: `docker compose down -v && docker compose up -d`.
2. **Chave da IA gratuita (opcional, só para o chat)**: crie em https://aistudio.google.com uma chave da API do Gemini.
   No plano gratuito os dados podem ser usados pelo Google para melhorar produtos: **use só dados fictícios**.
   Se o modelo padrão não estiver liberado na sua chave, ajuste `GEMINI_MODEL`.
   ```powershell
   $env:GEMINI_API_KEY="sua-chave"        # PowerShell
   ```
   ```bash
   export GEMINI_API_KEY="sua-chave"      # Linux/macOS
   ```
3. **API** (http://localhost:8080) — as tabelas são criadas na primeira execução
   ```bash
   cd apps/api
   npm install
   npm run dev
   ```
4. **Front** (http://localhost:3000)
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
5. Abra http://localhost:3000, crie uma conta, importe o CSV de exemplo (abaixo) e converse com a IA.

Testes da API: `cd apps/api && npm test`. Build de produção: `npm run build && npm start`.

Variáveis da API (todas opcionais em desenvolvimento): `PORT`, `HOST`, `DATABASE_URL`, `JWT_SECRET`,
`JWT_TTL_MINUTES`, `COOKIE_SECURE`, `CORS_ORIGIN`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

## O que já funciona (v1)

- Painel mensal: receitas, despesas, saldo, gastos por categoria, últimas transações e chat com IA que enxerga o resumo do mês.
- Transações: adicionar, excluir, trocar categoria, navegar por mês e importar CSV.
- Categorização automática por palavras-chave (a categorização por IA fica para a próxima etapa).
- Pagamento de fatura de cartão é reconhecido pela descrição e fica fora de receitas e despesas.
- Conta padrão ("Conta principal") criada automaticamente no primeiro lançamento.

## Endpoints

| Método | Caminho | Auth | Descrição |
|---|---|---|---|
| GET | /health | não | saúde da API |
| POST | /api/auth/register | não | cria conta e abre sessão (cookie httpOnly) |
| POST | /api/auth/login | não | abre sessão |
| POST | /api/auth/logout | não | encerra sessão |
| GET | /api/me | sim | usuário logado |
| GET | /api/categories | sim | categorias |
| GET, POST | /api/transactions?month=AAAA-MM | sim | lista / cria |
| PATCH | /api/transactions/{id}/category | sim | troca a categoria |
| DELETE | /api/transactions/{id} | sim | exclui |
| POST | /api/transactions/import | sim | CSV em `text/plain` |
| GET | /api/dashboard?month=AAAA-MM | sim | resumo do mês |
| POST | /api/ai/chat | sim | `{ "message": "..." }` → `{ "reply": "..." }` |

CSV de exemplo (dados fictícios; formato `data;descrição;valor`, valor negativo = despesa):

```
data;descricao;valor
2026-10-02;Mercado Bairro;-312,40
2026-10-05;Salario;4200,00
2026-10-06;Netflix;-39,90
2026-10-10;Uber;-27,50
2026-10-12;Pagamento de fatura;-850,00
```

## Camada de IA

`LlmClient` (interface em `src/ai.ts`) → `GeminiClient` (testes gratuitos). Para produção, crie `ClaudeClient`
e troque a instância em `src/server.ts` (ou por configuração); o resto do código não muda. A API da Anthropic é paga por uso.

## Problemas comuns

- **Porta 5432 ou 8080 ocupada**: pare o outro serviço ou mude a porta (`PORT`, compose e `DATABASE_URL`).
- **`relation "users" already exists`**: banco criado pela versão Java; rode `docker compose down -v`.
- **Erro de CORS/cookie no login**: confirme front em `localhost:3000` e API em `localhost:8080`.
- **Chat retorna erro**: `GEMINI_API_KEY` não definida no terminal que iniciou a API, ou modelo indisponível.

## Segurança (pendências antes de publicar)

- Defina `JWT_SECRET` forte, `COOKIE_SECURE=true` e use HTTPS. Em produção a API recusa o segredo de desenvolvimento.
- A API já exige que mudanças vindas de navegador tenham a origem do seu front; avalie também token CSRF.
- Adicione limite de tentativas de login (rate limit).
- Dados financeiros são sensíveis (LGPD): consentimento, mínimo de dados, criptografia em repouso e backups.
- A IA organiza e analisa; não prometa retorno nem recomende ativos como consultoria.
- Nunca versione chaves ou o `.env`. Se usar pixels/GTM, exiba banner de consentimento.

## Próximos passos

1. Categorização por IA com tela de revisão; detecção de assinaturas.
2. Edição de transações, várias contas, metas.
3. Chat com streaming e contexto maior dos dados.
4. Depois: onboarding, planos, Open Finance.
