# Retoma

Fundação técnica do Retoma. Nesta etapa só existe infraestrutura básica —
nenhuma funcionalidade de produto foi implementada ainda.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript — frontend e
  backend (Route Handlers / Server Actions) no mesmo projeto.
- [Tailwind CSS](https://tailwindcss.com) para estilos.
- [Supabase](https://supabase.com) para banco de dados e autenticação
  (`@supabase/supabase-js` + `@supabase/ssr`).
- Deploy na [Vercel](https://vercel.com).

## Desenvolvimento local

1. Copie `.env.example` para `.env.local` e preencha com as credenciais do
   projeto Supabase (Project Settings > API no painel do Supabase).
2. Instale as dependências e suba o servidor:

   ```bash
   npm install
   npm run dev
   ```

3. Abra [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção.
- `npm run start` — roda o build de produção localmente.
- `npm run lint` — checagem de lint.

## Estrutura

- `src/app/` — rotas (App Router).
- `src/app/api/health/route.ts` — endpoint de health-check
  (`GET /api/health`).
- `src/lib/supabase/client.ts` — cliente Supabase para uso no browser
  (Client Components).
- `src/lib/supabase/server.ts` — cliente Supabase para uso no servidor
  (Server Components, Server Actions, Route Handlers).
- `src/proxy.ts` — renova a sessão do Supabase em cada requisição (Next.js
  16 renomeou "Middleware" para "Proxy"; a lógica é a mesma).

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. Pública. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publicável do Supabase. Pública, protegida por Row Level Security. |

Nenhum segredo deve ser commitado no repositório. `.env.local` está no
`.gitignore`.
