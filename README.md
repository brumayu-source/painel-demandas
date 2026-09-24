# umê · Painel de Demandas

App de gestão de demandas da umê para acompanhar clientes (B-Pet e outros do
mesmo grupo, e futuramente outros clientes). Três papéis de acesso:
**admin** (gerencia usuários, clientes e times), **editor** (cria e move
demandas) e **viewer** (dashboard somente leitura, restrito aos clientes
atribuídos).

## Stack

- [Vite](https://vite.dev) + React (JavaScript puro, sem TypeScript)
- [Supabase](https://supabase.com) — Postgres, autenticação (e-mail + senha)
  e Row Level Security para o controle de acesso por papel
- Hospedado no [Vercel](https://vercel.com)
- CSS puro (sem framework), tokens de cor/tipografia em
  `src/styles/tokens.css`

## Primeira vez configurando o projeto (Supabase + Vercel)

Veja o guia publicado com o passo a passo completo (link enviado junto com
este código). Resumo: rode `supabase/schema.sql` no SQL Editor do seu
projeto Supabase, faça o deploy da Edge Function em
`supabase/functions/admin-users` (Supabase → Edge Functions → cole o
código), configure as variáveis de ambiente no Vercel
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e faça o deploy do app a
partir de um repositório GitHub.

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

## Estrutura

```
app/
  src/
    lib/            cliente Supabase, funções de formatação de data/cor
    context/        estado global: sessão/papel (AuthContext), dados
                    (DataContext, com realtime), toasts
    components/     Sidebar, Topbar, AppShell (layout autenticado), TaskModal
    pages/          Login, BoardView (Kanban), ListView, OverviewView
                    (dashboard/Painel), AdminView (usuários/clientes/times)
supabase/
  schema.sql        tabelas, triggers e políticas de RLS — fonte de verdade
                    do modelo de permissões
  functions/
    admin-users/    Edge Function: criar usuário, redefinir senha e remover
                    usuário — só admin consegue chamar, usa a service_role
                    key (nunca exposta no front-end)
```

## Autenticação (e-mail + senha)

Não existe auto-cadastro: só quem já é admin cria contas novas, pela tela
de Administração do app (nome, e-mail e uma senha — gerada automaticamente
ou escolhida na hora). Essa tela chama a Edge Function `admin-users`, que é
quem de fato tem permissão pra criar usuários no Supabase Auth. O mesmo
lugar serve pra redefinir a senha de alguém ou remover uma conta.

A primeira conta (a sua, como admin) precisa ser criada direto no painel do
Supabase (Authentication → Users → Add user), já que ainda não existe
nenhum admin no sistema pra criar a conta por dentro do app — os detalhes
estão no comentário final de `supabase/schema.sql` e no guia de deploy.

## Modelo de dados (resumo)

`clients` → `teams` → `tasks`, mais `profiles` (um por usuário, com
`role`) e `profile_clients` (quais clientes um viewer pode ver). Toda regra
de quem pode ver/editar o quê vive nas políticas de RLS em
`supabase/schema.sql` — o front-end não reforça permissão nenhuma por conta
própria, só reage ao que o banco permite ou recusa.

## Próximos passos possíveis

Ideias para evoluir, se fizer sentido no futuro: notificações por e-mail de
prazos próximos, anexos em tarefas, campos customizados por cliente,
"esqueci minha senha" self-service (hoje é o admin quem redefine).
