# Painel de Demandas

App de gestão de demandas para a Caruma acompanhar clientes (B-Pet e outros do
mesmo grupo, e futuramente outros clientes da agência). Três papéis de
acesso: **admin** (gerencia usuários, clientes e times), **editor** (cria e
move demandas) e **viewer** (dashboard somente leitura, restrito aos
clientes atribuídos).

## Stack

- [Vite](https://vite.dev) + React (JavaScript puro, sem TypeScript)
- [Supabase](https://supabase.com) — Postgres, autenticação (link mágico por
  e-mail) e Row Level Security para o controle de acesso por papel
- Hospedado no [Vercel](https://vercel.com)
- CSS puro (sem framework), tokens de cor/tipografia em
  `src/styles/tokens.css`

## Primeira vez configurando o projeto (Supabase + Vercel)

Veja o guia publicado com o passo a passo completo (link enviado junto com
este código). Resumo: rode `supabase/schema.sql` no SQL Editor do seu
projeto Supabase, configure as variáveis de ambiente no Vercel
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e faça o deploy a partir de
um repositório GitHub.

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

## Estrutura

```
src/
  lib/            cliente Supabase, funções de formatação de data/cor
  context/        estado global: sessão/papel (AuthContext), dados
                  (DataContext, com realtime), toasts
  components/     Sidebar, Topbar, AppShell (layout autenticado), TaskModal
  pages/          Login, BoardView (Kanban), ListView, OverviewView
                  (dashboard/Painel), AdminView (usuários/clientes/times)
supabase/
  schema.sql      tabelas, triggers e políticas de RLS — fonte de verdade
                  do modelo de permissões
```

## Modelo de dados (resumo)

`clients` → `teams` → `tasks`, mais `profiles` (um por usuário, com
`role`) e `profile_clients` (quais clientes um viewer pode ver). Toda regra
de quem pode ver/editar o quê vive nas políticas de RLS em
`supabase/schema.sql` — o front-end não reforça permissão nenhuma por conta
própria, só reage ao que o banco permite ou recusa.

## Próximos passos possíveis

Ideias para evoluir, se fizer sentido no futuro: notificações por e-mail de
prazos próximos, anexos em tarefas, campos customizados por cliente,
convite de usuário direto pelo app (exigiria uma Supabase Edge Function
usando a service role key, que nunca deve ir para o código do front-end).
