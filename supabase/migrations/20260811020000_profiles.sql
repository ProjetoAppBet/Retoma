-- =============================================================
-- Fase 1A · profiles
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §6    (D-01.3 — profiles)
--   §7.1  (user_id -> auth.users(id) é o padrão único e obrigatório)
--   §7.3  (RLS criada junto com a tabela, na mesma migration)
--   §9.2  (invariante de consentimento)
--
-- Critérios de aceite atendidos: AA-01, AA-02, AA-03, AA-20, AA-27.
-- =============================================================

-- §7.1 / AA-02: a identidade é referenciada por user_id apontando para
-- auth.users(id). §14.1.3 proíbe owner_id, account_id ou profile_id.
-- §6.2.3 exige que profiles referencie a identidade por user_id; o prompt
-- de execução exige chave primária vinculada a auth.users(id) e user_id
-- inequívoco, sem duplicação de identidade. As duas exigências são
-- satisfeitas fazendo de user_id a própria chave primária.
--
-- created_at é exigido pelo invariante §9.2 / AA-09: a verificação compara
-- o timestamp de cada linha de dados de usuário com o do aceite principal.
-- Sem timestamp na linha, o invariante não é verificável.
--
-- §6.2.4: profiles NÃO armazena estado de consentimento.
-- §6.2.5: profiles NÃO duplica is_anonymous.
-- Nenhuma outra coluna é exigida por fonte normativa, e nenhuma foi criada.
--
-- Sobre ON DELETE: deliberadamente não especificado. Política de retenção
-- e exclusão é pendência P-04 e §14.3.24 proíbe o Claude Code de defini-la.
-- Omitir a cláusula mantém o padrão NO ACTION do SQL, que não estabelece
-- política alguma.
create table public.profiles (
  user_id uuid primary key references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil da identidade. Criado após auth.users e antes de qualquer dado de dominio (D-01.3 §6.1).';

-- §7.3.2 / AA-20: RLS habilitada na mesma migration que cria a tabela.
alter table public.profiles enable row level security;

-- §7.3.1 / AA-21: o usuário A nunca acessa dados do usuário B.
-- §7.3.3 / AA-23: políticas idênticas para identidade pseudônima e conta
-- permanente, porque ambas usam o papel authenticated.
-- §3.6 / §14.1.7: nenhuma política condiciona acesso a is_anonymous.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Não existe política de UPDATE nem de DELETE: nenhuma fonte normativa as
-- autoriza, e a tabela não possui coluna mutável. Com RLS habilitada e sem
-- política permissiva, ambas as operações são negadas.
grant select, insert on public.profiles to authenticated;
revoke update, delete on public.profiles from authenticated;
