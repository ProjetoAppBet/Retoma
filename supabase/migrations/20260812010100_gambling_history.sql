-- =============================================================
-- Fase 1B · gambling_history
--
-- Normativo: Decisões de Produto e Arquitetura — D-01 D-02 D-09 v1.0
--   §7.1, §7.3  (user_id -> auth.users(id); RLS na mesma migration)
--   §9.2        (invariante alcança toda entidade de domínio)
--   §11.2       (recebe Etapas 3, 4 e 5; Etapa 2 por E-01 §11.5.1)
--   §11.5.1     (tentativa anterior aqui; declaração original preservada)
--   §11.5.2     (frequência, valor, períodos, estados da resposta)
--   §11.6.2     (Q-04 agregado, Q-05 consequências, Q-08 início)
--   §11.6.4     (Q-09 natureza da informação, Q-10 correção append-only)
--   §11.7       (L-01 estado de precisão, L-02 início normalizado, L-03 base)
-- =============================================================

create table public.gambling_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id),

  -- Q-09: é esta coluna que impede misturar declaração com comportamento
  -- observado dentro da mesma tabela — e só impede de fato porque o CHECK
  -- admite um único valor. O histórico é DECLARADO pela pessoa; nada aqui é
  -- medido pelo sistema, inferido por ele, nem constitui sinal de segurança.
  information_nature text not null
    check (information_nature = 'declarado'),

  -- ---------------------------------------------------------
  -- Etapa 3 · frequência (§11.5.2)
  -- ---------------------------------------------------------
  -- Categorias transcritas do Modelo Operacional §5 via §11.5.2. Proibido
  -- converter categoria em número ou o inverso sem confirmação do usuário —
  -- por isso não existe nenhuma coluna numérica de frequência.
  frequency_category text
    check (frequency_category in (
      'ocasional', 'semanal', 'várias vezes por semana',
      'diariamente', 'várias vezes ao dia'
    )),

  -- §11.5.2: a ausência de valor é representada no estado da resposta.
  frequency_response_state text not null
    check (frequency_response_state in (
      'informado', 'não sabe', 'recusou informar', 'não perguntado'
    )),

  -- §11.5.1.2: preservar o que a pessoa disse, não apenas a classificação.
  frequency_original_expression text,

  -- ---------------------------------------------------------
  -- Etapa 4 · dimensão financeira (§11.5.2, L-03)
  -- ---------------------------------------------------------
  amount_declared numeric,
  amount_currency text,

  -- §11.5.2: períodos admitidos, transcritos literalmente.
  amount_period text
    check (amount_period in (
      'por aposta', 'dia', 'semana', 'mês', 'ano', 'acumulado/total', 'outro'
    )),

  -- L-03 (§11.7.3): base de cálculo associada ao valor financeiro declarado,
  -- preservada como texto livre. Nenhuma enumeração foi criada, porque não há
  -- base documental para enumerá-la. Nada a ver com "base legal", que §4.2
  -- proíbe afirmar em qualquer artefato.
  amount_basis text,

  -- §11.5.2: natureza do valor — declarada ou estimada. Não confundir com o
  -- estado de precisão do início (L-01), que qualifica outro objeto.
  amount_nature text
    check (amount_nature in ('declarada', 'estimada')),

  amount_date date,
  amount_original_expression text,

  amount_response_state text not null
    check (amount_response_state in (
      'informado', 'não sabe', 'recusou informar', 'não perguntado'
    )),

  -- ---------------------------------------------------------
  -- Etapa 5 · consequências (Q-05)
  -- ---------------------------------------------------------
  -- Múltiplas categorias do Modelo Operacional §5, transcritas de §11.6.2.
  consequence_categories text[],

  -- Q-05: texto livre para "outras".
  consequence_other_text text,

  -- Q-05: a consequência principal é campo separado, correspondente à
  -- Etapa 5 (Op. §12). Mesmo domínio das categorias.
  main_consequence_category text
    check (main_consequence_category in (
      'financeiras', 'familiares', 'relacionamentos',
      'profissionais', 'emocionais', 'outras relevantes'
    )),

  -- §11.5.1.2: a declaração original da Etapa 5, preservada ao lado da
  -- classificação e não em lugar dela.
  main_consequence_declaration text,

  -- ---------------------------------------------------------
  -- Etapa 2 · tentativa anterior de parar (§11.5.1, Q-04)
  -- ---------------------------------------------------------
  -- Q-04: agregado, não coleção de tentativas. Os itens abaixo são os de
  -- Op. §5, que já são agregados por natureza. Nenhuma tabela filha foi
  -- criada, e nada disso é duplicado em profiles (§11.5.1.1).
  previous_attempts_count_approx integer,
  previous_attempts_longest_abstinence text,
  previous_attempts_what_worked text,
  previous_attempts_what_triggered_return text,
  previous_attempts_relapse_description text,

  -- ---------------------------------------------------------
  -- Início do histórico (Q-08, L-01, L-02)
  -- ---------------------------------------------------------
  -- L-02.1: a expressão original é preservada, sempre.
  start_original_expression text,

  -- L-02.2: normalização só até o nível efetivamente suportado pela
  -- declaração. Guardado como texto para não forçar padding inventado —
  -- '2019', '2019-07' ou '2019-07-15' descrevem a si mesmos.
  start_normalized_value text,
  start_normalized_precision text
    check (start_normalized_precision in ('ano', 'mês/ano', 'data completa')),

  -- L-01 (§11.7.1): estado de precisão, domínio transcrito. Ortogonal ao
  -- nível de normalização — §11.7.2 registra que um ano declarado pode ser
  -- exato ou aproximado.
  start_precision_state text
    check (start_precision_state in ('exato', 'aproximado', 'estimado')),

  recorded_at timestamptz not null default now(),

  -- Q-10: correção gera nova linha ligada à anterior.
  supersedes_id uuid references public.gambling_history (id),

  -- §11.5.2: quando o período for "outro", preservar OBRIGATORIAMENTE a
  -- expressão original.
  constraint gambling_history_periodo_outro_exige_expressao
    check (amount_period is distinct from 'outro' or amount_original_expression is not null),

  -- L-02.4: o estado de precisão acompanha o valor normalizado — um não
  -- existe sem o outro. O nível de normalização segue a mesma regra.
  constraint gambling_history_inicio_normalizado_completo
    check (
      (start_normalized_value is null
        and start_normalized_precision is null
        and start_precision_state is null)
      or
      (start_normalized_value is not null
        and start_normalized_precision is not null
        and start_precision_state is not null)
    ),

  -- Q-05: as categorias informadas pertencem ao domínio do Modelo
  -- Operacional §5.
  constraint gambling_history_categorias_de_consequencia_validas
    check (
      consequence_categories is null
      or consequence_categories <@ array[
        'financeiras', 'familiares', 'relacionamentos',
        'profissionais', 'emocionais', 'outras relevantes'
      ]::text[]
    )
);

comment on table public.gambling_history is
  'Historico declarado de apostas. Append-only (Q-10). Nao recebe comportamento observado: ver information_nature (Q-09).';

create index gambling_history_user_recorded_at_idx
  on public.gambling_history (user_id, recorded_at desc);

-- §7.3.2 / AA-20.
alter table public.gambling_history enable row level security;

create policy gambling_history_select_own
  on public.gambling_history
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy gambling_history_insert_own
  on public.gambling_history
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Q-10: sem UPDATE e sem DELETE.
revoke all on public.gambling_history from anon, authenticated;
grant select, insert on public.gambling_history to authenticated;
