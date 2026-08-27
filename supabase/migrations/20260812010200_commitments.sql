-- =============================================================
-- Fase 1B · commitments
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §7.1, §7.3  (user_id -> auth.users(id); RLS na mesma migration)
--   §9.2        (invariante alcança toda entidade de domínio)
--   §11.2       (compromisso após o onboarding)
--   §11.3       (planos ficam fora do núcleo mínimo)
--   §11.6.3     (Q-06 resultado, Q-07 independência de recovery_plans)
--   §11.6.4     (Q-09 natureza da informação, Q-10 correção append-only)
--   Op. §12     ("síntese inicial + compromisso mínimo para as próximas 24 horas")
-- =============================================================

create table public.commitments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id),

  -- §11.5.1.2: o compromisso é guardado como a pessoa o formulou.
  commitment_declaration text,

  -- Op. §12: o compromisso inicial tem horizonte de 24 horas. A coluna
  -- guarda o prazo do compromisso; nenhuma duração é imposta pelo schema.
  due_at timestamptz,

  -- Q-06: domínio transcrito literalmente de §11.6.3. Opcional porque o
  -- resultado só existe depois do prazo — e, sendo a tabela append-only
  -- (Q-10), ele entra como nova linha ligada à anterior por supersedes_id,
  -- nunca por UPDATE.
  outcome text
    check (outcome in ('cumprido', 'não_cumprido', 'sem_resposta')),

  -- Q-09: o compromisso é DECLARADO pela pessoa. O resultado em `outcome`
  -- também é declarado — vem de uma resposta, não de medição do sistema; por
  -- isso 'sem_resposta' é um dos valores possíveis. Nada nesta tabela é
  -- observado, inferido ou sinal de segurança.
  information_nature text not null
    check (information_nature = 'declarado'),

  -- §9.2 / AA-09.
  recorded_at timestamptz not null default now(),

  -- Q-10: nova linha preserva a anterior.
  supersedes_id uuid references public.commitments (id)

  -- Q-07: commitments é independente de recovery_plans e o vínculo com plano
  -- é opcional. Como §11.3 mantém planos fora do núcleo mínimo, na Fase 1B
  -- esse vínculo não tem contraparte e NENHUMA coluna de plano foi criada.
  -- O compromisso inicial de 24 horas existe antes do plano.
);

comment on table public.commitments is
  'Compromissos do usuario. Append-only (Q-10) e independente de planos (Q-07).';

create index commitments_user_recorded_at_idx
  on public.commitments (user_id, recorded_at desc);

-- §7.3.2 / AA-20.
alter table public.commitments enable row level security;

create policy commitments_select_own
  on public.commitments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy commitments_insert_own
  on public.commitments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Q-10: sem UPDATE e sem DELETE.
revoke all on public.commitments from anon, authenticated;
grant select, insert on public.commitments to authenticated;
