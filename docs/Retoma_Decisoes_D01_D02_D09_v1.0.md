# Decisões de Produto e Arquitetura — D-01 D-02 D-09

**Versão 1.0 · Documento normativo · Retoma**

| Campo | Valor |
|---|---|
| Status | Aprovado pelo responsável de produto |
| Natureza | Normativo — vincula a implementação |
| Escopo | Identidade, consentimento e escopo da Fase 1 |
| Precedência | Prevalece sobre interpretações; subordinado à Especificação Funcional v1.0 e ao Modelo Operacional v1.0 nos pontos que não trata |
| Destinatário | Claude Code, na etapa de implementação da Fase 1 |
| Fora de escopo | D-03, D-04, PGSI, protocolo clínico, revisão jurídica, demais módulos |

### Histórico de emendas

| # | Alteração | Efeito |
|---|---|---|
| E-01 | Fechamento de **P-01** e **P-02**, com resolução do conflito **CF-09**. Acrescenta a seção 11.5; atualiza CF-09 na seção 2.1, a seção 11.4, as tabelas de pendências da seção 13, a proibição 26 da seção 14.4 e a seção 16 | **Desbloqueia a Fase 1B.** Nenhuma outra decisão deste documento é alterada |
| E-02 | Fechamento das lacunas de atributo da Fase 1B — decisões **Q-01** a **Q-10**. Acrescenta a seção 11.6; atualiza a seção 11.4, a proibição 26 da seção 14.4 e a seção 16 | **Fixa os atributos e as regras de `recovery_goals`, `gambling_history` e `commitments`.** Não cria entidade nova nem altera qualquer outra decisão deste documento |
| E-03 | Fechamento de **L-01**, **L-02** e **L-03** — os três termos que 11.5.2 e Q-08 usavam sem domínio ou definição. Acrescenta a seção 11.7; atualiza a seção 11.4, a proibição 26 da seção 14.4 e a seção 16 | **Define estado de precisão, início normalizado e base.** Complementa 11.5.2 e Q-08 sem alterá-los; não cria entidade nova |
| E-04 | Registro e fechamento de **P-27**, e fechamento de **P-08**, **P-09**, **P-13**, **P-14** e **P-15**. Acrescenta a seção 17; atualiza as seções 3.5, 4.3, 5.1, 5.4, 10.3, as tabelas de pendências da seção 13 e a seção 16 | **Desbloqueia a Fase 2.** Não altera E-01, E-02 nem E-03, não cria entidade nova e não altera nenhuma outra decisão deste documento |
| E-05 | Semântica do ambiente "Hoje" — decisões **Q-11** a **Q-14** —, registro normativo de **L-04** e **L-05**, e abertura de **P-29**, **P-30** e **CF-11**. Acrescenta a seção 18; atualiza a seção 2.1, uma nota de remissão em 11.6.3, as tabelas de pendências da seção 13, a proibição 26 da seção 14.4 e a seção 16 | **Fixa o que o "Hoje" registra, o que é compromisso ativo, o que "Depois" significa e estende a anti-bifurcação.** Não cria entidade nova, não altera o domínio de Q-06 e não modifica nenhuma outra decisão deste documento. **Não autoriza, por si, o registro do resultado do compromisso** — ver 18.8 |
| E-06 | Fechamento de **P-30**. Acrescenta a seção 19; atualiza a proibição 19 da seção 14.3, a proibição 26 da seção 14.4, a tabela de pendências técnicas da seção 13 e a seção 16 | **Desbloqueia o registro do resultado do compromisso e a imposição de Q-12.** Fixa o Modelo A (supersessão append-only) com função transacional, trava por usuário e escrita exclusiva pelas funções; concede a ressalva **estritamente delimitada** de `security definer` descrita em 19.2. Não cria entidade nova, não altera o domínio de Q-06 e não modifica E-01 a E-05. **9.1 e 14.3.21 permanecem íntegras — nenhum trigger é criado** |
| E-07 | Remoção do **bloqueio de existência** das entidades de conversa e mensagem, e abertura de **P-33**. Acrescenta a seção 20; atualiza uma nota de remissão em 11.3, a proibição 25 da seção 14.4, a tabela de pendências técnicas da seção 13 e a seção 16 | **Autoriza a criação futura de conversa e mensagem** — e nada além disso. Não cria tabela, não define coluna, não escolhe retenção nem provedor. **P-04, P-05 e D-04/P-07 permanecem abertas**, 14.3.23 e 14.4.30 permanecem íntegras, e memória, padrões e check-in continuam vedados |
| E-08 | Fechamento de **P-33** — o modelo de dados da conversa. Acrescenta a seção 21; atualiza a tabela de pendências técnicas da seção 13 e a seção 16 | **Fixa `conversations` e `messages`**, o domínio de `author`, a ausência de natureza da informação em mensagem e a ordem do diálogo por `clock_timestamp()`. Estende a consulta de invariante de 9.3.1 às duas tabelas. **P-04, P-05 e D-04/P-07 permanecem abertas**; 14.3.23 e 14.4.30 permanecem íntegras; memória e padrões seguem vedados por 20.4.5 |

O identificador de versão deste documento não foi alterado por esta emenda —
defini-lo é decisão do responsável de produto.

---

## 1. Objetivo

Consolidar em documento único e normativo as decisões D-01 (identidade), D-02 (consentimento) e D-09 (escopo da Fase 1), de modo que a implementação possa começar sem que decisões fundamentais precisem ser inventadas durante a programação.

Este documento cumpre, para as três decisões que trata, o objetivo declarado na Especificação Funcional §1: permitir a implementação do MVP sem inventar decisões fundamentais durante a programação. Ele não substitui nenhuma especificação existente; fecha lacunas que essas especificações deixaram explicitamente abertas.

**O que este documento decide:** identidade do usuário, momento e estrutura do consentimento, propriedade dos dados, integridade do invariante de consentimento, versionamento do documento aceito e escopo da primeira migration.

**O que este documento não decide:** comportamento da IA, provedor de modelo, PGSI, critérios clínicos de risco, base legal do tratamento, política de retenção, e qualquer módulo funcional posterior ao onboarding.

---

## 2. Fontes de verdade

| Fonte | Papel |
|---|---|
| Modelo Operacional do Usuário v1.0 | Modelo conceitual do usuário e do produto |
| Especificação Funcional do Produto v1.0 | Requisitos funcionais, regras de negócio, critérios de aceite |
| Especificação Técnica e Arquitetural v1.0 | Decisões técnicas, camadas, fases, critérios técnicos |
| Identidade de Marca / Brand Book | Regras de aplicação visual e de voz |
| Pesquisa de Profundidade — Recuperação de Vício em Apostas | Base de evidência; não é fonte normativa de requisito |
| Decisão D-01 registrada | Identidade pseudônima |
| Decisão D-02 registrada | Consentimento |
| Este documento | Consolidação normativa de D-01, D-02, D-01.3, D-02.9, D-02.13 e D-09 |

**Regra de precedência:** onde este documento conflitar com uma leitura possível dos documentos anteriores, prevalece este documento, e o conflito está registrado na seção 2.1. Onde este documento for silente, prevalecem a Especificação Funcional e o Modelo Operacional.

### 2.1 Conflitos entre documentos — registrados e tratados

| # | Conflito | Documentos | Tratamento |
|---|---|---|---|
| CF-01 | A entidade `users` é listada como entidade funcional em Func. §24, mas não aparece no modelo lógico de Téc. §8 | Func. §24 vs. Téc. §8 | **Resolvido por D-01.** A entidade `users` é atendida por `auth.users` do Supabase. Não existe `public.users` |
| CF-02 | Consentimento consta como evento mínimo em Téc. §12 e como estado explícito e auditável em Téc. §15 e §21, mas não aparece em nenhuma das listas de entidades | Téc. §12/§15/§21 vs. Func. §24 e Téc. §8 | **Resolvido por D-02.** Entidade própria de consentimento é criada. As listas de entidades estão incompletas em relação ao próprio documento técnico — inconsistência registrada para correção na próxima revisão da Especificação Funcional |
| CF-03 | Téc. §14 define o fluxo de onboarding como `UI → auth → resposta`, enquanto P2 e AC-01 exigem primeiro valor em ~90 segundos sem formulário longo | Téc. §14 vs. Func. §2 P2 e AC-01 | **Resolvido pelo fluxo canônico da seção 5.** O anonymous sign-in satisfaz literalmente o `auth` de §14 e custa um gesto, não um formulário. Não há mais conflito |
| CF-04 | A pesquisa propõe WhatsApp como plataforma inicial; Op. §23 decide web primeiro; Func. §29 mantém "validação do canal inicial" como pendência aberta | Pesquisa vs. Op. §23 vs. Func. §29 | **Resolvido por Op. §23**, que é decisão de produto registrada. O item de Func. §29 deve ser considerado encerrado. O núcleo permanece independente de canal conforme RNF-08 |
| CF-05 | Func. §29 mantém "definição final de autenticação e pseudonimato" como pendência, enquanto Téc. §6 já decide o uso de Supabase Auth | Func. §29 vs. Téc. §6 | **Resolvido por D-01.** Mecanismo e modelo de identidade estão ambos fechados. O item de Func. §29 deve ser considerado encerrado |
| CF-06 | Téc. §20 descreve a Fase 1 como "schema + migrations + RLS", cuja leitura literal implica criar todas as entidades de uma vez; Func. §25 estabelece a regra de ouro de questionar escopo, e o projeto proíbe overengineering | Téc. §20 vs. Func. §25 | **Resolvido por D-09.** A Fase 1 é incremental |
| CF-07 | RNF-09, AC-20 e BR-15 exigem recuperabilidade de histórico e histórico longitudinal suficiente para D30; D-01.8 estabelece que a perda de sessão pseudônima é irreversível | Func. RNF-09/AC-20/BR-15 vs. D-01.8 | **Consequência aceita, registrada.** A mitigação prevista é a conversão em conta permanente. O momento do convite à criação de conta permanece pendente (P-11) |
| CF-08 | Téc. §15 e §21 exigem trilha de auditoria para eventos de segurança; Func. §18 e a LGPD exigem exclusão a pedido do titular | Téc. §15/§21 vs. Func. §18 | **NÃO RESOLVIDO.** Pendência jurídica P-04. Não afeta a Fase 1 |
| CF-09 | Op. §4 atribui "tentativas anteriores de parar" ao perfil do usuário; Op. §5 atribui "tentativas anteriores" ao histórico de apostas. A Etapa 2 do onboarding alimenta ambos | Op. §4 vs. Op. §5 | **RESOLVIDO pela seção 11.5** (emenda E-01). A tentativa anterior de parar pertence a `gambling_history`; `profiles` fica com o histórico de ajuda e recursos. Não bloqueia mais a Fase 1B |
| CF-10 | Func. §22 define onboarding concluído como "seis etapas mínimas"; AC-02 exige adaptação das perguntas. Um indicador fixo "Etapa 1 de 6" afirma uma precisão que o sistema pode não ter, o que colide com BR-12 | Func. §22 e AC-02 vs. estado atual da interface | **NÃO RESOLVIDO.** Depende de D-03. Não afeta a Fase 1 |
| CF-11 | Op. §22 lista **Check-in** entre os itens do MVP e Op. §6 e §14 o descrevem — fissura, autoeficácia, comportamento recente —, mas nenhuma entidade do núcleo mínimo da seção 11.2 recebe esses dados, 11.3 mantém módulos completos de check-in fora do escopo antecipado e a proibição 14.4.25 veda criar entidade além do núcleo mínimo | Op. §6/§14/§22 vs. seções 11.2, 11.3 e 14.4.25 | **NÃO RESOLVIDO.** Registrado pela emenda E-05 — seção 18.7. Depende de decisão de escopo e de **P-05**. Não afeta as Fases 1A, 1B e 2, já aplicadas |

---

## 3. D-01 — Identidade pseudônima

### 3.1 Decisão

O onboarding inicial do Retoma é **pseudônimo**. A criação de conta com credencial é opcional, posterior, e nunca é pré-requisito para uso do produto.

**Terminologia obrigatória:** o modelo é *pseudônimo*, não anônimo. A identidade não contém PII, mas o conteúdo produzido pelo usuário pode conter dado pessoal declarado espontaneamente, e registros de infraestrutura contêm identificadores adicionais. **A palavra "anônimo" não deve ser usada em nenhum texto voltado ao usuário para descrever o produto.**

### 3.2 Mecanismo

| Item | Definição |
|---|---|
| Mecanismo | Supabase Anonymous Sign-In |
| Representação | Linha em `auth.users`, sem e-mail, telefone ou senha |
| Papel no banco | `authenticated`, idêntico ao de usuário permanente |
| Distinção | Claim `is_anonymous` no JWT |
| Sessão | Cookies geridos por `@supabase/ssr`, conforme Téc. §6, com clientes browser e server separados |
| Momento da criação | Imediatamente após o ato explícito de aceite, nunca antes |

### 3.3 Proibições estruturais

Não haverá, sob nenhuma circunstância:

1. Tabela `public.users`.
2. Tabela intermediária de identidade.
3. Mecanismo próprio de identidade, sessão ou emissão de token.
4. Uso de service role no cliente.
5. Qualquer identificador de sessão paralelo em `localStorage`, query string ou outro meio.

### 3.4 Continuidade e conversão

O UUID da identidade permanece o mesmo quando o usuário cria conta permanente. Não há migração de dados, não há re-vinculação, não há janela de dados órfãos, e por isso não é necessária nenhuma entidade de mapeamento.

**Transição autorizada, única:** vincular uma credencial à identidade pseudônima corrente, tornando-a permanente.

**Transição proibida no MVP:** fazer login, a partir de uma sessão pseudônima, em uma conta que já existe, levando consigo os dados da sessão. Se a credencial informada já pertence a outra conta, a operação **falha**, nada é gravado e nada é mesclado. Nenhuma lógica de fusão ou resolução de conflito deve ser escrita.

**Falha de vinculação:** preserva a sessão pseudônima intacta. Nunca desconectar, nunca limpar cookie, nunca criar identidade nova como recuperação.

### 3.5 Perda de sessão

**Uma identidade pseudônima cuja sessão foi perdida não pode ser recuperada por ninguém.** Não há e-mail, não há senha, não há suporte manual capaz de reconectar a pessoa aos dados dela.

| Situação | Comportamento |
|---|---|
| Apaga cookies ou dados do navegador | Identidade perdida. Novo acesso é visitante novo |
| Troca de dispositivo ou navegador | Sem acesso à identidade anterior |
| Sessão expira | Identidade perdida se o refresh token não for mais válido |
| Dispositivo compartilhado | Risco inverso: outra pessoa no mesmo navegador acessa a identidade |

**Proibido:** implementar, sugerir ou simular qualquer mecanismo de recuperação. Os dados permanecem no banco, sem titular alcançável, corretamente bloqueados pela RLS.

**Duração da sessão (E-04, seção 17.4):** 30 dias, com refresh automático
enquanto houver atividade válida. **Encerrar sessão (E-04, seção 17.5):** o
logout existe, é irreversível para identidade anônima e exige confirmação
explícita.

### 3.6 Restrição de funcionalidade por tipo de identidade

Nenhuma funcionalidade é restringida por `is_anonymous` no MVP. A claim pode existir no JWT, mas nenhuma política de RLS ou regra de aplicação deve condicionar acesso a ela nesta fase.

---

## 4. D-02 — Consentimento

### 4.1 Decisão

O Retoma exige um **aceite principal de entrada**, registrado, versionado e auditável, praticado **antes** da criação da identidade pseudônima e **antes** de qualquer persistência. Consentimentos adicionais são específicos e contextuais, obtidos no momento de uso da funcionalidade correspondente.

### 4.2 Neutralidade jurídica obrigatória

A estrutura de registro definida aqui é deliberadamente neutra quanto à base legal e não precisará ser refeita conforme o resultado da revisão jurídica.

**Proibido:** afirmar, em código, em nome de campo, em comentário, em migration ou em interface, qual é a base legal do tratamento. Usar termos neutros de produto — "aceite", "termo", "versão", "estado" —, nunca termos que classifiquem juridicamente o ato.

### 4.3 Modelo de granularidade

| Consentimento | Momento | Bloqueante | Revogável isoladamente | Fase |
|---|---|---|---|---|
| **C-PRINCIPAL** — aceite de entrada | Antes da identidade | Sim | Ver 4.6 | Fase 1–3 |
| **C-APOIO** — compartilhamento com pessoa de confiança | Ao configurar a rede de apoio | Não | Sim | Fase 8 |
| **C-NOTIF** — notificações | Ao ativar notificações | Não | Sim | Fase 10 |
| **C-CONTA** — criação de conta permanente | Ao vincular credencial | Não | Ver 17.6 (P-09 fechada por E-04) | Fase 2 |

**Regra inegociável:** nenhum consentimento contextual é pré-marcado, antecipado na entrada, agrupado com outro, nem usado como condição para funcionalidades centrais. Fonte: Func. §14, §18, BR-09, AC-12, AC-13.

### 4.4 Cobertura do aceite principal

O aceite principal cobre o uso central necessário ao funcionamento do produto conforme as especificações existentes, a saber:

1. Criação da identidade pseudônima.
2. Armazenamento das respostas do onboarding.
3. Dados relativos ao comportamento de apostas.
4. Memória e contexto individual — não é módulo opcional, conforme Func. P3 e Op. §1. O controle do usuário sobre a memória se exerce por correção e exclusão de memórias individuais (BR-02, AC-11, Func. §13), não por recusa prévia.
5. Telemetria de produto sem conteúdo sensível — necessária ao princípio P8 e a Func. §27.

**Não coberto pelo aceite principal:** compartilhamento com pessoa de apoio, notificações, qualquer contato com terceiros, e qualquer ação prevista no protocolo de segurança que ultrapasse exibir informação ao próprio usuário.

### 4.5 Treinamento de modelos

**Não faz parte do MVP e não deve ser implementado como finalidade de tratamento.** Fonte: Téc. §15. Não se pede consentimento para uso que não se pretende fazer. Isso constitui exigência contratual perante o futuro provedor de IA, e não um item de interface.

### 4.6 Revogação

**Consentimentos específicos** são revogáveis isoladamente, sem sair do produto e sem perda de dados. A revogação de C-APOIO interrompe todo compartilhamento futuro; ela não desfaz o que a pessoa de apoio já visualizou, e a interface não deve sugerir o contrário.

**Aceite principal:** revogá-lo é a mesma ação que encerrar e apagar. Não existe estado intermediário em que o usuário permaneça no produto sem que nada possa ser armazenado — isso seria oferecer uma escolha que não existe.

**Registros de aceite e de revogação permanecem** após o encerramento, porque são metadado de auditoria sobre o tratamento e não conteúdo tratado. Se essa retenção é legítima, e sob qual fundamento, é pendência jurídica P-04.

### 4.7 Menção à IA

O produto deve informar que a conversa envolve IA e que ela não substitui atendimento profissional, em dois momentos com funções distintas:

1. Na tela de aceite, de forma curta.
2. No primeiro contato conversacional, pela própria IA, conforme Func. §6 — requisito funcional independente, não redundância.

O **texto** dessa menção depende de D-03 e D-04 e não pode ser finalizado agora. A **estrutura** está fechada.

---

## 5. Fluxo canônico

### 5.1 Fluxo de aceite

```
VISITANTE
  Nenhuma linha em auth.users. Nenhum cookie de sessão.
  Nenhuma gravação. Nenhum evento.
      |
      v
TELA DE ACEITE
      |
      v
ATO EXPLÍCITO DE ACEITE            <-- marco: a partir daqui o sistema pode gravar
      |
      v
SUPABASE ANONYMOUS SIGN-IN
      |
      v
auth.users                          <-- primeira gravação do sistema
      |
      v
profiles                            <-- D-01.3
      |
      v
REGISTRO DO ACEITE
      |
      v
consent_updated                     <-- primeiro evento de telemetria
      |
      v
onboarding_started
      |
      v
ONBOARDING
      |
      v
PRIMEIRA PERSISTÊNCIA DE DADO DE DOMÍNIO
```

**Atomicidade de `profiles` e do registro de aceite (E-04, seção 17.1).** A
ordem acima é mantida, mas os dois passos formam **uma única operação
atômica**. Executados na mesma transação, recebem timestamp idêntico, e a
igualdade admitida pela seção 9.2 elimina o conflito. Duas chamadas sucessivas
à API de dados são duas transações e não satisfazem esta regra.

### 5.2 Fluxo de recusa

```
VISITANTE
      |
      v
RECUSA
      |
      v
nenhuma identidade
nenhum dado persistido
nenhum evento vinculado à identidade
```

Recusar encerra o fluxo sem nova solicitação na mesma sessão, sem modal de retenção e sem segunda tentativa de convencimento.

### 5.3 Abandono antes do aceite

Idêntico à recusa. Ausência de ato não é ato. Nenhuma persistência.

### 5.4 Compensação de falha

Existe um intervalo entre a criação da identidade e a gravação do registro de aceite, e os dois passos não compartilham transação.

**Regra:** se a gravação do registro de aceite falhar, a identidade recém-criada deve ser descartada ou a sessão invalidada, e o usuário informado de que não foi possível iniciar. **Não pode restar identidade utilizável sem registro de aceite.** A forma exata da compensação foi **fixada pela emenda E-04, seção 17.3**: prioriza-se remover a identidade recém-criada quando tecnicamente possível; quando não for, invalida-se a sessão.

---

## 6. D-01.3 — profiles

### 6.1 Decisão

`profiles` é criado **depois** da criação da identidade em `auth.users` e **antes** da persistência de qualquer dado de domínio do usuário.

### 6.2 Regras

1. Não criar `profiles` antes de existir identidade em `auth.users`.
2. Não criar `profiles` para visitante que não praticou o ato de aceite.
3. `profiles` referencia a identidade por `user_id`.
4. `profiles` não armazena estado de consentimento. O estado corrente do consentimento é **derivado** do histórico da entidade de consentimento. Estado duplicado é estado que diverge.
5. `profiles` não duplica `is_anonymous`. Esse dado é derivado do JWT e de `auth.users`.

### 6.3 Consequência para métricas

Como `profiles` passa a existir para toda identidade criada, e como nenhuma medição ocorre antes do aceite, o denominador da taxa de conclusão do onboarding (Func. §27) é **identidades criadas**, não visitantes. A perda entre visitante e aceite não é medida no MVP. Isso é escolha consciente, decorrente da regra de zero persistência pré-aceite, e não omissão.

---

## 7. Modelo de propriedade dos dados

### 7.1 Padrão único e obrigatório

Toda entidade de domínio pertencente a um usuário utiliza:

```
user_id  →  auth.users(id)
```

### 7.2 Nomes proibidos como referência à identidade principal

`owner_id` · `account_id` · `profile_id`

Nenhum deles substitui `user_id`. Isso vale para toda tabela, em toda fase, sem exceção.

### 7.3 Regras de isolamento

| # | Regra | Fonte |
|---|---|---|
| 1 | O usuário A nunca acessa dados do usuário B — leitura, escrita, alteração ou exclusão | Func. AC-19, RNF-01, RNF-02; Téc. §7, §21 |
| 2 | RLS é criada **junto com** cada tabela, na mesma migration. Nunca em migration posterior | Este documento |
| 3 | As políticas são idênticas para identidade pseudônima e conta permanente, porque ambas usam o papel `authenticated` | D-01 |
| 4 | Nenhuma escrita direta de dados sensíveis pelo cliente. Toda mutação passa por caso de uso no servidor | Téc. §3, §5, §13 |
| 5 | Service role apenas no servidor, apenas para operações justificadas. Nunca para contornar autorização | Téc. §7, §22 |
| 6 | Teste de acesso cruzado é critério de aceite da Fase 1, não da Fase 10 | Téc. §17, §21 |

---

## 8. Registro de consentimento

### 8.1 Entidade própria

Existirá entidade própria de consentimento, justificada por: histórico, versionamento, auditabilidade, concessão, revogação, e impossibilidade de representar isso adequadamente com um booleano em `profiles`.

**A entidade de consentimento não se confunde com:**

| Entidade | Escopo real |
|---|---|
| `support_permissions` | Autorização de compartilhamento com pessoa de apoio — recebe C-APOIO, não C-PRINCIPAL |
| `notifications` | Agenda e entrega, não permissão |
| Telemetria de produto | Téc. §12 e §16 exigem separar telemetria de auditoria. A auditoria de consentimento não pode depender de pipeline analítico |

**O registro de consentimento é metadado de auditoria, não conteúdo de usuário.**

### 8.2 Comportamento

| Aspecto | Regra |
|---|---|
| Vinculação | Todo registro está vinculado a `user_id` |
| Mutabilidade | **Append-only** |
| Sobrescrita | Proibida. Não sobrescrever fatos históricos (Téc. §12) |
| Nova concessão ou nova versão | Gera **novo registro** |
| Revogação | Gera **novo registro**, relacionado ao registro anterior quando aplicável |
| UPDATE pelo usuário | Não existe. Sem política de UPDATE |
| DELETE pelo usuário | Não existe. Sem política de DELETE, nem para o próprio dono |
| Leitura | Usuário lê apenas os próprios registros |
| Estado corrente | Derivado do histórico, nunca armazenado em paralelo |
| Conteúdo | Nenhum texto livre, nenhuma resposta de onboarding, nenhum dado de comportamento, nenhum conteúdo de conversa |

### 8.3 Atributos

**Requisitos do projeto:**

| Atributo | Fonte |
|---|---|
| `user_id` | Téc. §7; D-01 |
| Tipo do consentimento | BR-09, AC-12 exigem distinguir autorização de compartilhamento das demais |
| Estado — concedido / revogado | Téc. §15 |
| Timestamp | Téc. §12, §21 |
| Identificador de versão do documento aceito | Téc. §21 |
| Relação com o registro anterior, na revogação | Téc. §12 |

**Recomendação, não requisito:** origem ou canal, em antecipação a RNF-08. Não é dado pessoal adicional e não custa nada incluir agora.

---

## 9. D-02.9 — Integridade

### 9.1 Estratégia aprovada para a primeira versão

```
RLS  +  constraints normais  +  testes automatizados de invariantes
```

**Não criar triggers complexos** para impor o invariante de consentimento nesta etapa. Se posteriormente houver evidência de que a aplicação não garante adequadamente o invariante, isso poderá ser reavaliado em decisão técnica futura.

### 9.2 Invariante do sistema

> **Não pode existir nenhuma linha, em nenhuma tabela de dados de usuário do Retoma, cujo `user_id` não possua um registro de aceite principal com timestamp anterior ou igual ao da própria linha.**

Vale para `profiles`, para toda entidade de domínio, para telemetria vinculada à identidade, e para toda tabela criada em qualquer fase futura.

### 9.3 Verificação — três níveis, todos objetivos

1. **Consulta de invariante:** percorre as tabelas de usuário e procura qualquer linha cujo `user_id` não tenha aceite anterior. Resultado esperado: conjunto vazio, sempre. Executável em CI contra banco de teste.
2. **Teste de fluxo negativo:** exercita entrada, recusa e abandono, e verifica que nenhuma linha foi criada em `auth.users` nem em qualquer tabela do Retoma.
3. **Teste de ordem:** exercita o fluxo completo e verifica que o timestamp do aceite é anterior ao da primeira resposta de onboarding.

Os três integram o critério de aceite da Fase 1.

---

## 10. D-02.13 — Versionamento do documento

### 10.1 Decisão

**Não armazenar o texto integral do documento dentro de cada registro de consentimento.**

O registro identifica de maneira inequívoca: tipo, versão, identificador da versão, estado, timestamp e `user_id`.

### 10.2 Documento de origem

O documento correspondente a cada versão deve existir **separadamente, em versão imutável e recuperável**. Uma versão publicada nunca é editada; alteração produz nova versão com novo identificador.

**Consequência operacional:** deve ser possível, a partir de um registro de consentimento, recuperar exatamente o texto que aquele usuário viu naquele momento. Um identificador de versão que aponte para um documento mutável esvazia a auditoria e não satisfaz Téc. §21.

### 10.3 Pendência

O esquema de identificação de versão e a imutabilidade do documento foram **fixados pela emenda E-04, seção 17.2**: slug + versão explícita, no formato `consentimento-principal-v1.0`. A revisão jurídica do conteúdo permanece pendente (P-04).

A definição jurídica sobre retenção, prova e exclusão desses registros permanece pendente de revisão jurídica (P-04).

---

## 11. D-09 — Fase 1 incremental

### 11.1 Decisão

A Fase 1 é **incremental**. Não criar as entidades do Modelo Operacional de uma vez. Criar somente o subconjunto necessário para sustentar as próximas fases imediatas.

Cada entidade futura será criada quando entrar no caminho de implementação correspondente, com sua RLS na mesma migration.

### 11.2 Núcleo mínimo — o que entra

| Item | Justificativa documental |
|---|---|
| Identidade via Supabase Auth | D-01. Não é tabela criada por nós |
| `profiles` | D-01.3; Func. §24; Téc. §8 |
| Entidade de consentimento | D-02; Téc. §12, §15, §21 |
| `recovery_goals` | Recebe Etapa 1 (motivação) e Etapa 6 (objetivo imediato) do onboarding. Func. §5, §24; Op. §8, §12 |
| `gambling_history` | Recebe Etapas 3, 4 e 5 (frequência, dimensão financeira, consequência principal). Func. §5, §24; Op. §5, §12 |
| `commitments` | AC-03 exige síntese e compromisso após o onboarding; Func. §4 e §5 colocam o compromisso de 24h no caminho crítico imediato. Func. §24 |
| Infraestrutura de verificação de invariante | Seção 9.3 |

### 11.3 O que não entra

Não criar antecipadamente: módulos completos de check-in; recaída; estratégias; barreiras; métricas completas; rede de apoio completa; notificações completas; PGSI completo; padrões e memória; conversas e mensagens; planos e versionamento de planos; eventos de segurança; e qualquer outro módulo não necessário às próximas fases.

> Nota de remissão (emenda E-07): **"conversas e mensagens" saiu desta lista**
> — a seção 20 removeu o bloqueio de existência dessas duas entidades, que
> entraram no caminho de implementação previsto em 11.1. Todos os demais
> itens seguem valendo, inclusive **"padrões e memória"**, que é item
> separado e permanece vedado.

### 11.4 Subdivisão obrigatória da Fase 1

Duas pendências afetavam diretamente tabelas do núcleo mínimo. Por isso a Fase 1 se divide:

| Sub-fase | Conteúdo | Pré-requisito |
|---|---|---|
| **Fase 1A** | `profiles`, entidade de consentimento, RLS de ambas, infraestrutura de invariante, testes de acesso cruzado | **Nenhum. Pode começar imediatamente** |
| **Fase 1B** | `recovery_goals`, `gambling_history`, `commitments`, com RLS | **Desbloqueada** pela emenda E-01 — P-01 e P-02 fechadas na seção 11.5. Atributos e regras fixados pela emenda E-02, seção 11.6; termos de precisão, início normalizado e base definidos pela emenda E-03, seção 11.7 |

**P-01 (CF-09) — propriedade do dado da Etapa 2.** Era: Op. §4 atribui as tentativas anteriores de parar ao perfil; Op. §5 as atribui ao histórico de apostas. **Fechada na seção 11.5.1.**

**P-02 — representação de estimativas.** Era: BR-12 proíbe inventar precisão, e Func. §5 registra que frequência e valores são estimativas. A forma de representar incerteza em `gambling_history` precisava estar decidida antes da migration. **Fechada na seção 11.5.2.**

### 11.5 Fechamento de P-01 e P-02 (emenda E-01)

Esta seção fecha as duas pendências que bloqueavam a Fase 1B. Ela não altera
nenhuma outra decisão deste documento e não afeta a Fase 1A, já implementada.

#### 11.5.1 P-01 — propriedade do dado da Etapa 2

**Decisão.** A **tentativa anterior de parar pertence a `gambling_history`.**
`profiles` fica com o **histórico de ajuda e recursos** — psicólogo,
psiquiatra, Jogadores Anônimos, outros recursos e acompanhamento atual
(Op. §4).

Regras vinculantes:

1. O mesmo fato **não é duplicado** em `profiles`. Estado duplicado é estado
   que diverge — mesma razão já registrada em §6.2.4 para o consentimento.
2. A **declaração original do usuário é preservada**. A estrutura não pode
   descartar o que a pessoa disse em favor apenas de uma classificação.
3. **Dado retrospectivo declarado não se confunde com evento observado.** O
   que o usuário relata sobre o passado e o que o sistema registra depois são
   naturezas distintas e não podem ocupar o mesmo campo sem distinção
   explícita. Isso decorre de Op. §3, que separa *declarado* de *observado*.

Consequência para CF-09: o conflito está resolvido em favor de Op. §5 para
este item específico. Op. §4 permanece válido para o restante do histórico
de ajuda.

#### 11.5.2 P-02 — representação de estimativas

**Decisão.** Frequência e valor são representados preservando o que foi
declarado, sem conversão silenciosa e sem precisão inventada.

**Frequência.** Usa as categorias **já definidas no Modelo Operacional §5**:
ocasional; semanal; várias vezes por semana; diariamente; várias vezes ao
dia. **Não converter categoria em número, nem número em categoria, sem
confirmação do usuário.**

**Valor.** Preservar, quando existirem: valor declarado; moeda; período;
base; natureza (declarada ou estimada); data; e a expressão original quando
relevante.

**Períodos admitidos:** por aposta; dia; semana; mês; ano; acumulado/total;
outro.

- Quando o período for **"outro"**, preservar **obrigatoriamente** a
  expressão original do usuário.
- **"Não informado" não é período.** A ausência de valor é representada no
  estado da resposta, nunca como período.

**Estados da resposta:** informado; não sabe; recusou informar; não
perguntado.

Regras vinculantes:

1. **Não inventar precisão**, intervalos nem conversões. Fonte: BR-12.
2. **Confiança não se aplica a dado declarado ou estimado.** O atributo de
   confiança permanece exclusivo de inferências e padrões (Op. §7). Aplicá-lo
   a uma declaração transformaria o relato do usuário em hipótese do sistema.

### 11.6 Atributos e regras da Fase 1B (emenda E-02)

E-01 fixou a quem pertence o dado e como estimativas são representadas, mas
não descia ao nível de atributo das três entidades da Fase 1B. Esta seção
fecha essa lacuna.

Ela **não cria entidade alguma** além das já listadas em 11.2, **não altera**
nenhuma outra decisão deste documento e **não revoga** 11.3.

#### 11.6.1 `recovery_goals`

**Q-01 — cardinalidade.** `recovery_goals` mantém **um objetivo ativo por
usuário**.

**Q-02 — tipo do objetivo.** O tipo é um entre: **interromper**, **reduzir**,
**ainda não decidido**. **Não criar meta numérica de redução na Fase 1B** —
coerente com a proibição de inventar precisão fixada em 11.5.2.

**Q-03 — versionamento.** Mudança relevante de objetivo ou de motivos **gera
nova versão do plano**, alinhado a Op. §8 ("planos terão versões; versões
anteriores não serão apagadas").

> Nota de escopo: 11.3 mantém "planos e versionamento de planos" fora do
> núcleo mínimo. Q-03 vale a partir do momento em que o plano existir;
> **nenhuma tabela de plano é criada na Fase 1B**.

#### 11.6.2 `gambling_history`

**Q-04 — tentativas anteriores.** Registradas como **agregado**, não como
coleção de tentativas individuais. Compatível com Op. §5, cujos itens de
tentativa anterior já são agregados por natureza — quantidade aproximada e
maior período sem apostar.

**Q-05 — consequências.** **Múltiplas categorias** do Modelo Operacional §5 —
financeiras, familiares, relacionamentos, profissionais, emocionais, outras
relevantes — com **texto livre para "outras"**. A **consequência principal é
campo separado**, correspondente à Etapa 5 do onboarding (Op. §12).

**Q-08 — início do histórico.** O início **não pode ganhar precisão
inventada**. Preservar a **expressão original** e, **quando possível**, um
valor normalizado acompanhado de **estado de precisão**. Op. §5 já admite
estimativa quando necessário; 11.5.2 já proíbe inventar precisão.

#### 11.6.3 `commitments`

**Q-06 — resultado.** O resultado de um compromisso é um entre: **cumprido**,
**não_cumprido**, **sem_resposta**.

> Nota de remissão (emenda E-05): a seção 18 **não altera este domínio**. Ela
> fixa o que cada valor significa e quem pode produzi-lo — em especial que
> `sem_resposta` designa ausência de resposta e **não** o ato de adiar (18.3),
> e que esse valor **não tem produtor persistente** enquanto P-29 estiver
> aberta (18.5).

**Q-07 — independência.** `commitments` é **independente de
`recovery_plans`**; o vínculo com plano é **opcional**. **O compromisso
inicial de 24 horas existe antes do plano** (Op. §12: "síntese inicial +
compromisso mínimo para as próximas 24 horas").

> Nota de escopo: como 11.3 mantém planos fora do núcleo mínimo, na Fase 1B
> o vínculo opcional simplesmente não tem contraparte. Isso não autoriza
> criar `recovery_plans`.

#### 11.6.4 Regras transversais

**Q-09 — natureza da informação.** Manter a separação entre **declarado**,
**observado**, **inferido** e **segurança**, conforme Op. §3. **Não
transformar inferência em fato** e **não misturar observado com declaração**.
Estende a 11.5.1.3, que já separava declarado de observado.

**Q-10 — correção de declaração.** Corrigir uma declaração **não apaga
histórico**: a declaração anterior é preservada e o novo estado declarado é
registrado. Mesma lógica append-only já adotada para o consentimento em 8.2 e
para a trajetória em Op. §18.

### 11.7 Fechamento de L-01, L-02 e L-03 (emenda E-03)

O portão de implementação da Fase 1B identificou três termos usados por
11.5.2 e por Q-08 sem domínio ou definição: **estado de precisão**, **valor
normalizado do início** e **base**. Sem eles, `gambling_history` não podia
ser escrita sem inventar.

Esta seção **complementa** 11.5.2 e Q-08 sem alterá-los, **não cria entidade
alguma** e **não modifica** nenhuma outra decisão deste documento.

#### 11.7.1 L-01 — estado de precisão

O estado de precisão é um entre: **exato**, **aproximado**, **estimado**.

> Não confundir com a **natureza do valor financeiro** de 11.5.2, que é
> *declarada* ou *estimada*. São campos distintos sobre objetos distintos: a
> natureza qualifica o valor financeiro; o estado de precisão qualifica o
> início normalizado. A coincidência de vocabulário não os torna o mesmo
> atributo.

#### 11.7.2 L-02 — início normalizado

1. A **expressão original é preservada**, sempre.
2. A normalização vai **somente até o nível de precisão efetivamente
   suportado pela declaração**: **ano**, **mês/ano** ou **data completa**.
3. **Nunca inventar precisão.** Reafirma 11.5.2.1 e Q-08.
4. O **estado de precisão acompanha o valor normalizado** — um não existe
   sem o outro.

Nenhum mapeamento automático entre nível de normalização e estado de
precisão é estabelecido: um ano declarado pode ser exato ou aproximado, e
determinar isso é leitura da declaração, não regra estrutural.

#### 11.7.3 L-03 — base

**Base** designa a **base de cálculo associada ao valor financeiro
declarado**.

1. Preservar como **texto livre** quando informada.
2. **Não criar enumeração sem base documental.**

> Este termo não guarda relação com "base legal", que 4.2 proíbe afirmar em
> qualquer artefato do projeto. A base de que trata esta seção é de cálculo,
> não jurídica.

---

## 12. Regras de segurança

Vinculantes em todas as fases, sem exceção.

1. **Nenhum dado de domínio antes do aceite.** Inclui telemetria vinculada à identidade.
2. **Nenhuma escrita direta de dados sensíveis pelo cliente.** Toda mutação passa por caso de uso no servidor, conforme Téc. §3, §5 e §13.
3. **Nenhum conteúdo sensível em eventos de telemetria.**
4. **Nenhum texto livre em eventos analíticos.** Nem resposta de onboarding, nem conteúdo de conversa, nem valor financeiro.
5. **RLS desde a criação das tabelas**, na mesma migration.
6. **Nenhuma decisão sobre LGPD inventada pelo Claude Code.**
7. **Nenhum uso de conteúdo para treinamento de modelos no MVP.**
8. Segredos apenas no servidor. Nunca em variáveis `NEXT_PUBLIC_*` (Téc. §6).
9. Logs técnicos não contêm conversas completas (Téc. §15).
10. Nenhum caminho do sistema invalida, rotaciona ou recria a identidade pseudônima sem ato explícito do usuário.

### 12.1 Regra de exposição

Enquanto o protocolo clínico de segurança (P-05) e a revisão jurídica (P-04) estiverem pendentes, **o ambiente não deve estar acessível a usuários reais**. Téc. §23 já registra a definição de domínio e Deployment Protection da Vercel como pendência aberta; ela deve ser tratada antes de qualquer divulgação, ainda que informal.

---

## 13. Pendências futuras

Nenhuma destas bloqueia a Fase 1A. As que bloqueiam o lançamento estão
marcadas. **P-01 e P-02, que bloqueavam a Fase 1B, foram fechadas pela
emenda E-01 (seção 11.5) e permanecem listadas apenas como registro
histórico.**

### Decisão de produto

| ID | Pendência | Bloqueia |
|---|---|---|
| ~~P-01~~ | ~~Propriedade do dado da Etapa 2 — perfil ou histórico de apostas (CF-09)~~ | **FECHADA** pela emenda E-01 — seção 11.5.1 |
| ~~P-02~~ | ~~Representação de estimativas de frequência e valor, conforme BR-12~~ | **FECHADA** pela emenda E-01 — seção 11.5.2 |
| P-03 | Definição operacional de "primeiro valor" e se o número pessoal entra no MVP | Fase 3 |
| P-28 | Origem de `goal_type`: nenhuma das seis etapas de Op. §12 o coleta, mas a coluna é NOT NULL e Q-02 fecha o domínio. A Fase 3 pergunta os três valores explicitamente na Etapa 6, como **solução técnica provisória** — classificar o texto livre exigiria inferência (bloqueada por D-03) e preencher por conta própria inventaria declaração, contra §11.5.1.2. Formalizar ou substituir essa extensão da Etapa 6 é decisão de produto | Fase 3 |
| ~~P-08~~ | ~~Esquema de identificação de versão do documento e local imutável~~ | **FECHADA** pela emenda E-04 — seção 17.2 |
| ~~P-09~~ | ~~C-CONTA é consentimento próprio ou absorvido pelo ato de criar conta~~ | **FECHADA** pela emenda E-04 — seção 17.6 |
| P-10 | C-NOTIF: registro na entidade de consentimento ou preferência | Fase 10 |
| P-11 | Momento e frequência do convite à criação de conta permanente | Fase 3 |
| P-12 | Conteúdo da tela de recusa | Fase 3 |
| ~~P-13~~ | ~~Ação de encerrar sessão em dispositivo compartilhado~~ | **FECHADA** pela emenda E-04 — seção 17.5 |
| P-16 | Idade mínima e se há verificação | **Lançamento** |
| P-17 | Se a taxa de aceite é medida de forma agregada | Não bloqueante |
| P-18 | Material já compartilhado após revogação de C-APOIO | Fase 8 |
| P-19 | Analytics de terceiros, se houver | Fase 10 |
| P-20 | Política de expurgo de identidades pseudônimas inativas | **Lançamento** |
| P-32 | **`profiles` não tem as colunas que 11.5.1 lhe atribuiu.** A emenda E-01 decidiu que `profiles` fica com o **histórico de ajuda e recursos** — psicólogo, psiquiatra, Jogadores Anônimos, outros recursos, acompanhamento atual (Op. §4). A tabela aplicada tem apenas `user_id` e `created_at`. Op. §12 também não coleta esses itens em nenhuma das seis etapas, então hoje não há origem para eles. Decidir se o histórico de ajuda entra no MVP — e por qual etapa — é decisão de produto; criar as colunas antes disso gravaria estrutura sem fonte | Histórico de ajuda no perfil |
| P-31 | **Horizonte do compromisso declarado fora do onboarding.** Op. §12 fixa 24 horas para o compromisso **inicial**, e 11.6.3 o nomeia assim; nenhum documento define prazo para os seguintes, e a seção 19 registra que nenhuma duração é imposta pela função. O "Hoje" passou a oferecer a declaração autorizada por 18.1.1 gravando `due_at` **nulo** — o schema admite, e nulo não afirma prazo algum. Decidir o horizonte (repetir 24 horas, deixar o usuário escolher, ou manter sem prazo) é decisão de produto | Contagem regressiva e derivação de vencimento (18.5) para compromissos não iniciais |
| P-29 | Se um compromisso vencido sem resposta deve **produzir registro persistente** de `sem_resposta`, ou permanecer apenas derivável em leitura. Fechada Q-13, o valor ficou sem produtor: não há gatilho — 9.1 e 14.3.21 os vedam —, não há rotina agendada, e adiar não o produz. Decidir isso determina o que a trajetória passa a afirmar sobre o usuário. Aberta pela emenda E-05 — seção 18.5 | Registro persistente de `sem_resposta` |
| ~~P-30~~ | ~~Modelo de escrita do resultado do compromisso — supersessão append-only ou preenchimento restrito de `outcome` — e, por consequência, a forma de garantir Q-12, que **não é imponível por restrição declarativa** sobre o schema atual. Aberta pela emenda E-05 — seção 18.6~~ | **FECHADA** pela emenda E-06 — seção 19. Modelo A com função transacional, trava por usuário e escrita exclusiva pelas funções |

### Decisão técnica

| ID | Pendência | Bloqueia |
|---|---|---|
| ~~P-14~~ | ~~Forma da compensação quando o registro de aceite falha após criar a identidade~~ | **FECHADA** pela emenda E-04 — seção 17.3 |
| ~~P-15~~ | ~~Duração da sessão e política de expiração do refresh token~~ | **FECHADA** pela emenda E-04 — seção 17.4. **Decisão inexequível no plano Free**; ver 17.4 |
| ~~P-33~~ | ~~**Modelo de dados da conversa.** A emenda E-07 (seção 20) autorizou a existência das entidades de conversa e mensagem, não a sua forma: quantas entidades, quais atributos, como a autoria é distinguida, se são append-only, e o que a finalidade de Op. §15 admite guardar. Parte das respostas depende de P-04 (retenção, dados de terceiros), de D-04 (política do provedor) e de P-05 (o que se registra diante de sinal de risco). Ver 20.5~~ | **FECHADA** pela emenda E-08 — seção 21. Duas entidades, mínimo em cada uma; o que dependia de P-04, P-05 e D-04 continua fora do schema |
| P-21 | Mecanismo antiabuso na criação de identidade | Antes de exposição pública |
| P-22 | Onde a telemetria de produto é armazenada — tabela própria ou ferramenta externa | Fase 3 |
| P-23 | Versão efetiva do Next.js, conforme divergência registrada em Téc. §1 | Antes de alterar dependências |

### Pendência jurídica / LGPD

| ID | Pendência | Bloqueia |
|---|---|---|
| P-04 | Base legal; classificação dos dados; retenção; sobrevivência dos registros de aceite à exclusão; conflito CF-08 entre exclusão e auditoria de segurança; dados de terceiros mencionados pelo usuário | **Lançamento** |

### Dependência de D-03 / D-04

| ID | Pendência |
|---|---|
| P-06 | D-03 — IA no onboarding: runtime determinístico ou IA. Afeta CF-10 e o texto da menção à IA |
| P-07 | D-04 — provedor, modelo, jurisdição, política de retenção, vedação contratual de treinamento |

### Outras, fora do caminho atual

| ID | Pendência | Bloqueia |
|---|---|---|
| P-05 | Protocolo clínico de segurança e critérios de risco/crise | **Exposição a usuários reais** |
| P-24 | PGSI: quais itens, em que etapas, com que pontuação | Fase de PGSI |
| P-25 | Validação do conteúdo das estratégias por profissional | Fase 6 |
| P-26 | Regras de monetização | Pós-MVP |

---

## 14. Regras que o Claude Code NÃO pode decidir

Esta seção é vinculante. Diante de qualquer item abaixo, o Claude Code **interrompe e pergunta**; não escolhe, não infere, não adota um padrão comum de mercado, e não resolve pelo caminho mais fácil.

### 14.1 Identidade

1. Substituir Supabase Anonymous Sign-In por qualquer outro mecanismo.
2. Criar `public.users`, tabela intermediária de identidade ou mecanismo próprio de sessão.
3. Usar `owner_id`, `account_id`, `profile_id` ou qualquer outro nome no lugar de `user_id`.
4. Implementar qualquer forma de recuperação de identidade pseudônima perdida.
5. Escrever lógica de fusão entre sessão pseudônima e conta preexistente.
6. Criar identidade antes do ato de aceite, por qualquer motivo, inclusive conveniência de desenvolvimento.
7. Restringir funcionalidade com base em `is_anonymous`.

### 14.2 Consentimento

8. Alterar o momento do aceite no fluxo canônico.
9. Criar caminho, ainda que temporário ou de teste, que persista dado antes do aceite.
10. Permitir UPDATE ou DELETE de registro de consentimento.
11. Representar consentimento como booleano em `profiles` ou em qualquer outra entidade.
12. Usar `support_permissions`, `notifications` ou telemetria como substituto da entidade de consentimento.
13. Afirmar, nomear ou pressupor base legal em qualquer artefato do projeto.
14. Pré-marcar, antecipar ou agrupar consentimentos contextuais.
15. Redigir o texto jurídico definitivo.
16. Implementar uso de conteúdo de usuário para treinamento de modelo.

### 14.3 Dados e segurança

17. Criar tabela com dados de usuário sem RLS na mesma migration.
18. Desabilitar RLS, ainda que temporariamente.
19. Usar service role no cliente, ou usá-la no servidor para contornar
    problema de autorização. `security definer` é mecanismo diverso de
    service role e está admitido **apenas** nas condições cumulativas da
    seção 19.2, que o restringem à escrita em `commitments`; fora delas,
    `security invoker` continua sendo a regra (17.1).
20. Alterar schema fora de migration versionada.
21. Criar triggers complexos para impor o invariante de consentimento nesta etapa (D-02.9).
22. Incluir texto livre ou conteúdo sensível em telemetria.
23. Definir critérios clínicos de risco ou crise.
24. Definir política de retenção ou exclusão.

### 14.4 Escopo

25. Criar entidades além do núcleo mínimo da seção 11.2. **Exceção única,
    nominal e delimitada:** as entidades de **conversa e mensagem**, cuja
    existência foi autorizada pela seção 20 (emenda E-07), observados os
    limites de 20.4 e a pendência P-33 de 20.5. A exceção se esgota nessas
    duas entidades e não alcança memória, padrões, check-in nem qualquer
    outro item de 11.3.
26. Contrariar, na Fase 1B, as regras de propriedade e de representação
    fixadas na seção 11.5 — duplicar a tentativa anterior de parar em
    `profiles`, converter categoria de frequência em número ou o inverso sem
    confirmação, descartar a expressão original quando o período for "outro",
    tratar ausência de valor como período, ou aplicar confiança a dado
    declarado — ou as regras de atributo fixadas na seção 11.6: mais de um
    objetivo ativo por usuário, meta numérica de redução, tentativas
    anteriores como coleção em vez de agregado, precisão inventada para o
    início do histórico, criação de `recovery_plans`, ou perda da declaração
    anterior ao corrigir uma declaração — ou as definições da seção 11.7:
    normalizar o início além do nível de precisão suportado pela declaração,
    gravar valor normalizado sem o estado de precisão que o acompanha, ou
    enumerar a base de cálculo sem base documental — ou as regras da seção 18:
    fazer o "Hoje" registrar resultado de dia em vez de resultado de
    compromisso, afirmar comportamento de aposta sem fonte declarada, admitir
    mais de um compromisso ativo por usuário, gravar qualquer coisa ao acionar
    "Depois", tratar `sem_resposta` como adiamento ou gravá-lo por qualquer
    caminho enquanto P-29 estiver aberta, implementar o registro de resultado
    ou a imposição de Q-12 enquanto P-30 estiver aberta, ou tratar a
    anti-bifurcação como se garantisse a cardinalidade do compromisso ativo
    — ou as regras da seção 19: escrever em `commitments` por INSERT direto
    em vez das funções, verificar a existência de compromisso ativo sem
    tomar antes a trava por usuário, aceitar identidade por parâmetro,
    repetir a declaração na linha de resultado, ou estender `security
    definer` além do delimitado em 19.2.
27. Adicionar funcionalidades fora do MVP.
28. Alterar o onboarding definido em Func. §5 e Op. §12.
29. Adicionar dependências relevantes sem justificar.
30. Escolher provedor de IA ou introduzir chamada a modelo nesta fase.

### 14.5 Procedimento obrigatório

Antes de qualquer alteração: inspecionar o repositório e o estado real (Téc. §19), incluindo a versão efetiva do Next.js (P-23). Após cada fase: build, typecheck, lint, testes, revisão do diff e commit.

---

## 15. Critérios de aceite da arquitetura

### 15.1 Identidade

| ID | Critério |
|---|---|
| AA-01 | Não existe `public.users` nem tabela intermediária de identidade |
| AA-02 | Toda entidade de domínio referencia a identidade por `user_id` apontando para `auth.users(id)` |
| AA-03 | Não existe nenhuma coluna `owner_id`, `account_id` ou `profile_id` usada como referência à identidade principal |
| AA-04 | A sessão é gerida exclusivamente por `@supabase/ssr`, sem identificador paralelo em qualquer outro armazenamento |
| AA-05 | Nenhum segredo de servidor aparece em variável `NEXT_PUBLIC_*` |
| AA-06 | Nenhum código implementa recuperação de identidade pseudônima |
| AA-07 | Nenhum código implementa fusão de sessão pseudônima com conta preexistente |

### 15.2 Consentimento e invariante

| ID | Critério |
|---|---|
| AA-08 | Não existe linha em `auth.users` sem registro de aceite principal correspondente |
| AA-09 | Nenhuma linha em tabela de usuário tem timestamp anterior ao aceite do seu `user_id` |
| AA-10 | Percorrer entrada, recusa e abandono não cria identidade, linha ou evento algum |
| AA-11 | O registro de aceite está vinculado ao `user_id` que praticou o ato, e a nenhum outro |
| AA-12 | O registro identifica de forma inequívoca a versão do documento apresentada |
| AA-13 | O texto integral do documento não está armazenado dentro do registro |
| AA-14 | A partir de um registro é possível recuperar exatamente o texto exibido naquele momento |
| AA-15 | Uma revogação cria novo registro; o anterior permanece inalterado e consultável |
| AA-16 | Não existe política de UPDATE nem de DELETE na entidade de consentimento |
| AA-17 | O estado corrente do consentimento é derivado do histórico, não armazenado em duplicidade |
| AA-18 | Se a gravação do aceite falhar, não resta identidade utilizável nem dado persistido |
| AA-19 | A verificação de invariante roda em CI e retorna conjunto vazio |

### 15.3 Isolamento e RLS

| ID | Critério |
|---|---|
| AA-20 | Toda tabela de dados de usuário tem RLS habilitada na mesma migration em que é criada |
| AA-21 | Usuário A não lê, altera nem apaga qualquer dado do usuário B, em nenhuma tabela |
| AA-22 | Usuário A não lê registro de consentimento do usuário B |
| AA-23 | As políticas são idênticas para identidade pseudônima e conta permanente |
| AA-24 | Existe teste automatizado de acesso cruzado entre duas identidades |
| AA-25 | Nenhuma escrita de dado de usuário ocorre diretamente do cliente sem caso de uso no servidor |

### 15.4 Escopo, telemetria e execução

| ID | Critério |
|---|---|
| AA-26 | O schema contém apenas as entidades do núcleo mínimo da seção 11.2 |
| AA-27 | `profiles` é criado após a identidade e antes de qualquer dado de domínio |
| AA-28 | Nenhum evento de telemetria contém texto livre, resposta de onboarding, conteúdo de conversa ou valor financeiro |
| AA-29 | `onboarding_started` nunca ocorre antes de `consent_updated` do mesmo `user_id` |
| AA-30 | Migrations são versionadas e reproduzem o schema do zero |
| AA-31 | Build, typecheck, lint e testes passam |
| AA-32 | Casos de uso não dependem de componentes React (Téc. §21) |

---

## 16. Próximo passo técnico

**FASE 1 — preparação e implementação do núcleo Supabase / Auth / schema / RLS conforme esta decisão.**

Executada em duas partes, conforme a seção 11.4:

**Fase 1A — pode começar imediatamente.** `profiles`, entidade de consentimento, RLS de ambas na mesma migration, infraestrutura de verificação de invariante e testes de acesso cruzado.

**Fase 1B — desbloqueada pela emenda E-01.** `recovery_goals`, `gambling_history` e `commitments`, com RLS, observando as regras de propriedade e de representação da seção 11.5, os atributos e regras da seção 11.6 fixados pela emenda E-02, e as definições da seção 11.7 fixadas pela emenda E-03.

Precede ambas a verificação de estado real do repositório prevista em Téc. §19, incluindo a versão efetiva do Next.js registrada como divergência em Téc. §1.

Nada além disso está autorizado nesta etapa. Autenticação, sessão, tela de aceite, onboarding e telemetria pertencem às Fases 2 e 3 e não devem ser antecipados.

**FASE 2 — desbloqueada pela emenda E-04.** Fechadas P-27, P-08, P-14, P-15,
P-13 e P-09 na seção 17, a Fase 2 pode ser implementada: anonymous sign-in,
criação atômica de `profiles` com o registro do aceite, tela e fluxo de
consentimento, proteção de rotas, manutenção de sessão, logout irreversível com
confirmação, tratamento de falha do aceite e conversão para conta permanente
com C-CONTA. O onboarding em si e a telemetria permanecem na Fase 3.

**FASE 5 — parcialmente desbloqueada pela emenda E-05.** Fixadas Q-11 a Q-14 na
seção 18, o ambiente "Hoje" pode apresentar o compromisso ativo e a ausência
dele, o botão "Depois" pode ser implementado — ele não grava —, e a proteção
anti-bifurcação pode ser estendida a `commitments` e `gambling_history`. **O
registro do resultado do compromisso e a imposição de Q-12 permanecem
bloqueados por P-30**; a gravação de `sem_resposta`, por P-29; e qualquer
entidade de registro diário, por CF-11 e P-05. O detalhamento está em 18.8.

**Conversa — modelo fixado pela emenda E-08.** Fechada P-33 na seção 21,
`conversations` e `messages` existem, com RLS, chave composta e a consulta
de invariante estendida. A pessoa escreve e o que escreve é guardado.
**Não há resposta**: D-04/P-07 segue aberta e 14.4.30 íntegra. Memória e
padrões seguem vedados por 20.4.5, e a exposição, por 12.1.

**Conversa — bloqueio de existência removido pela emenda E-07.** A seção 20
autoriza a criação futura das entidades de conversa e mensagem, e **só
isso**: nenhuma tabela é criada por ela, e P-33 mantém o modelo de dados em
aberto. A implementação da conversa com IA continua bloqueada por
**D-04/P-07** (provedor, modelo, jurisdição, retenção) e a exposição, por
**P-04** e **P-05**. As proibições 14.3.23 e 14.4.30 permanecem íntegras.

**P-30 foi fechada pela emenda E-06.** Com a seção 19, o registro do
resultado do compromisso e a imposição de Q-12 deixam de estar bloqueados e
podem ser implementados. P-29 e CF-11 seguem abertas e continuam bloqueando
o que 18.8 lista nos itens 3 a 6.

A seção 12.1 continua valendo: enquanto P-04 e P-05 estiverem abertas, o
ambiente não deve estar acessível a usuários reais.

---

## 17. Fase 2 — fechamento de P-27, P-08, P-14, P-15, P-13 e P-09 (emenda E-04)

Esta seção fecha as seis pendências que bloqueavam a Fase 2. Não altera E-01,
E-02 nem E-03, não cria entidade nova e não modifica o schema das Fases 1A/1B.

### 17.1 P-27 — ordem entre `profiles` e o registro de aceite

**P-27 não constava da seção 13.** Foi identificada durante a auditoria de
porta da Fase 2 e é **registrada e fechada nesta mesma emenda**.

**O conflito.** A seção 5.1 ordena `auth.users → profiles → REGISTRO DO
ACEITE`. A seção 9.2 exige que nenhuma linha exista cujo `user_id` não possua
aceite principal com timestamp **anterior ou igual** ao da própria linha.
Executada em duas transações, a ordem de 5.1 produz
`profiles.created_at < consent_records.recorded_at` — e a consulta de
invariante acusa `public.profiles`.

**Decisão.** A ordem da seção 5.1 é **mantida**. A criação de `profiles` e o
registro do aceite principal passam a ser **uma única operação atômica**.

**Consequência normativa.** `now()` em PostgreSQL devolve o horário da
transação, não o do comando. Executados na mesma transação, os dois registros
recebem timestamp **idêntico** — e 9.2 admite explicitamente a igualdade. A
ordem de 5.1 e o invariante de 9.2 deixam de se contradizer sem que nenhum dos
dois seja emendado.

**Consequência técnica vinculante.** Atomicidade aqui significa uma transação
de banco. Duas chamadas sucessivas à API de dados são duas transações e **não**
satisfazem esta decisão. A operação é exposta como função de banco em migration
versionada, executada com o papel do próprio usuário, de modo que a RLS
continue valendo dentro dela. Isto **não** é um trigger: 9.1 e a proibição
14.3.21 seguem íntegras.

**Não pode existir estado utilizável em que `profiles` exista sem o aceite
principal correspondente.**

### 17.2 P-08 — identificação de versão do documento de consentimento

**Decisão.** O identificador é **slug + versão explícita**, no formato
`consentimento-principal-v1.0`. `consent_records.document_version_id` registra
exatamente esse identificador, sem abreviação e sem derivação.

O documento correspondente é **versionado e imutável**: uma versão publicada
nunca é editada. Alteração de conteúdo produz nova versão com novo
identificador, e as versões anteriores permanecem recuperáveis. Isto satisfaz a
exigência da seção 10.2 — recuperar, a partir de um registro, exatamente o
texto que aquele usuário viu.

**Permanece pendente:** a revisão jurídica do conteúdo (P-04). O identificador
e a imutabilidade estão fechados; a redação definitiva do texto não. Enquanto
P-04 e P-05 estiverem abertas, a seção 12.1 continua proibindo exposição a
usuários reais.

### 17.3 P-14 — falha na gravação do registro de aceite

**Decisão.** Se o registro do consentimento falhar, a identidade recém-criada
**não pode permanecer utilizável**. Prioriza-se remover a identidade recém-criada
quando tecnicamente possível; quando não for, a sessão é invalidada.

Isto **não** relaxa a regra da seção 5.4 — apenas escolhe entre as duas saídas
que ela oferecia sem decidir. O piso permanece: nunca resta identidade
utilizável sem aceite.

**Nota de execução.** Remover linha de `auth.users` exige credencial
administrativa. Onde ela não estiver disponível, a invalidação de sessão é o
comportamento correto por esta decisão, e a identidade órfã permanece
detectável pelo ramo AA-08 da consulta de invariante.

### 17.4 P-15 — duração da sessão e refresh

**Decisão.** Sessão de **30 dias**, com refresh automático enquanto houver
atividade válida.

**Nenhum mecanismo de recuperação** da identidade anônima após perda definitiva
da sessão. A seção 3.5 permanece integralmente em vigor, inclusive a proibição
de implementar, sugerir ou simular recuperação.

**Nota de execução.** Duração de sessão e expiração de refresh token são
configuração do projeto Supabase, não schema. Não são definíveis por migration.
Caminho: Dashboard → Authentication → Sessions → *Time-box user sessions* = 30
dias, *Inactivity timeout* = 0. A expiração do JWT fica noutro lugar e não deve
ser alterada sem necessidade.

**INEXEQUÍVEL NO PLANO ATUAL.** A organização `ProjetoAppBet` está no plano
**Free**, e *Time-box user sessions* exige plano Pro ou superior. A decisão dos
30 dias **permanece válida como objetivo** e não foi substituída por outro
prazo — substituí-la exigiria nova decisão de produto. Enquanto não for
aplicável, o comportamento efetivo é o padrão do Supabase: sessão sem prazo
máximo, encerrada por logout ou perda dos dados do navegador (§3.5).

**Consequência vinculante:** nenhum artefato pode afirmar ao usuário que a
sessão dura 30 dias enquanto a configuração não estiver aplicada. Afirmá-lo
seria descrever um comportamento que o sistema não tem.

### 17.5 P-13 — encerrar sessão

**Decisão.** O logout **existe** e, para identidade anônima, é
**irreversível**. Exige **confirmação explícita** e deve deixar claro, antes do
ato, que a identidade não poderá ser recuperada depois.

Isto não conflita com a proibição 10 da seção 12: o ato explícito do usuário é
justamente a condição que aquela regra exige.

### 17.6 P-09 — C-CONTA na conversão para conta permanente

**Decisão.** **C-CONTA é consentimento próprio e auditável.** A conversão para
conta permanente registra C-CONTA explicitamente em `consent_records`, como
qualquer outro consentimento.

Os dados existentes permanecem vinculados à identidade convertida — o UUID não
muda, conforme a seção 3.4. Não há migração de dados, não há re-vinculação.

A regra inegociável da seção 4.3 continua valendo: C-CONTA não é pré-marcado,
não é antecipado na entrada, não é agrupado com o aceite principal, e não
condiciona funcionalidade central. A coluna "Revogável isoladamente" da tabela
4.3, antes marcada como pendência P-09, é resolvida pela natureza da própria
conversão: revogar C-CONTA equivale a desfazer a conta permanente, o que não
está no MVP e permanece fora de escopo.

---

## 18. Fase 5 — semântica do ambiente "Hoje" (emenda E-05)

Esta seção fixa o que o ambiente **"Hoje"** registra, o que é um **compromisso
ativo**, quantos podem existir, o que o botão **"Depois"** significa, o que
`sem_resposta` significa, e estende a proteção anti-bifurcação já existente em
`recovery_goals` às outras duas entidades que usam `supersedes_id`.

Ela **não cria entidade alguma** além das já listadas em 11.2, **não revoga**
11.3, **não altera** E-01, E-02, E-03 nem E-04, e **não modifica** o domínio de
Q-06. As Fases 1A, 1B e 2 já aplicadas permanecem válidas como estão.

**Esta emenda é normativa, não executiva.** Nada do que ela fixa está
autorizado a ser implementado por força dela própria: 18.8 delimita o que a
próxima rodada pode fazer e o que continua bloqueado.

### 18.1 Q-11 — o que o ambiente "Hoje" registra

**Decisão.** O "Hoje" registra o **resultado de um compromisso**. Não registra
"o resultado do dia".

**Fundamento.** Q-06 já define o domínio `cumprido` / `não_cumprido` /
`sem_resposta` como resultado **de um compromisso**, e não de um período.
`commitments` não possui, nem passa a possuir por esta emenda, qualquer noção
de dia: `due_at` é o prazo daquele compromisso e `recorded_at` é o instante da
gravação.

**Consequências vinculantes.**

1. Em um momento sem compromisso ativo, o "Hoje" **não pergunta** cumpriu ou
   não cumpriu — não há sujeito para a pergunta. O que ele pode oferecer é
   **declarar um compromisso**.
2. **"Cumpri" não significa "não apostou".** Um compromisso pode ser de
   qualquer natureza declarada pelo usuário. Derivar comportamento de aposta a
   partir de `outcome` seria inferência apresentada como declaração, contra
   Q-09 e contra 11.5.1.3.
3. Enquanto não existir fonte declarada de comportamento de aposta, **nenhum
   artefato pode afirmar que houve ou não houve aposta em um dia**. O estado
   correspondente na representação gráfica da trajetória permanece **sem
   fonte** e não deve ser produzido.

### 18.2 Q-12 — compromisso ativo: definição e cardinalidade

**Definição.** É **compromisso ativo** a linha de `commitments` que
simultaneamente:

1. pertence ao usuário;
2. possui `outcome IS NULL`;
3. **não foi superada** por outra versão.

**Decisão.** Nesta fase, o Retoma admite **no máximo um compromisso ativo por
usuário**. Enquanto houver um ativo, o "Hoje" pede o resultado dele e **não
oferece declarar outro**.

> Esta regra é análoga — não idêntica — a Q-01, que fixa um objetivo ativo por
> usuário em `recovery_goals`. Q-01 trata de objetivo; Q-12 trata de
> compromisso. Uma não implica a outra.

**A definição é deliberadamente independente de recência.** Nenhum dos três
critérios acima menciona "o mais recente". Isso é intencional: satisfeita a
cardinalidade, existe no máximo uma linha que atende aos três critérios, e a
identificação do compromisso ativo **não depende de ordenação**. Onde outras
leituras de `commitments` dependerem de "o mais recente" — listagens de
trajetória, por exemplo — vale integralmente a ordenação canônica
registrada em 18.4.1: sob empate de `recorded_at` a ordem só é determinística
se a cláusula de ordenação incluir o identificador como critério de desempate.
**A garantia vem da cláusula de ordenação, não do formato do índice.**

**Nota de exequibilidade — vinculante.** O critério 3 ("não foi superada") é
**propriedade da cadeia, não da linha**: saber se uma linha foi superada exige
consultar outras linhas. Índices parciais e restrições de unicidade em
PostgreSQL só enxergam a própria linha. **Q-12 portanto não é imponível por
restrição declarativa sobre o schema atual** — nem por índice parcial sobre
`outcome IS NULL`, nem sobre `outcome IS NULL AND supersedes_id IS NULL`: em
ambos os casos a linha-raiz de um compromisso já respondido continua com
`outcome IS NULL` para sempre e bloquearia todo compromisso seguinte. A forma
de garantir Q-12 é decisão em aberto, registrada como **P-30** em 18.6. Q-12
vale como regra normativa desde já; sua **forma de imposição** não está
decidida.

### 18.3 Q-13 — "Depois" e a semântica de `sem_resposta`

**Decisão — "Depois".** O botão "Depois" **não grava resultado**. Ao ser
acionado:

1. **nenhuma linha nova é criada**;
2. **nenhum `outcome` é alterado**;
3. o compromisso **permanece sem resposta**, no mesmo estado em que estava;
4. a interface **apenas encerra a interação atual**.

**Decisão — `sem_resposta`.** `sem_resposta` **não significa "Depois"**.
Significa o que o termo diz: **o compromisso não obteve resposta**. Adiar é
ato deliberado do usuário; ausência de resposta é a falta desse ato. Registrar
um como o outro gravaria como declarado um fato que não ocorreu, contra Q-09.

**Fundamento estrutural.** `commitments` é append-only: a migration não
concede `update` nem `delete`, e Q-10 preserva a declaração anterior. Uma
linha `sem_resposta` gravada ao adiar seria **permanente e não corrigível**, e
conviveria com a resposta verdadeira dada depois. O estado "declarado e ainda
não respondido" **já é representado** por `outcome IS NULL`; não precisa de
linha nova para existir.

**Consequência.** Nenhum caminho de escrita da aplicação produz
`sem_resposta` a partir do ato de adiar. O valor **permanece no domínio de
Q-06** — o domínio não é alterado por esta emenda — mas fica sem produtor
definido, o que é registrado em 18.5 como pendência.

### 18.4 Q-14 — proteção anti-bifurcação em `commitments` e `gambling_history`

#### 18.4.1 Registro normativo prévio — L-04 e L-05

Duas regras foram decididas durante a implementação da Fase 1B e aplicadas a
`recovery_goals`, mas **nunca entraram neste documento**: existem apenas como
comentário na migration. Q-14 estende uma delas, e não se estende o que não
está registrado. Esta emenda **as registra normativamente**, sem alterá-las e
sem alterar o que já está aplicado.

**L-04 — ordenação canônica.** `recorded_at` sozinho **não ordena de forma
determinística**: `now()` devolve o horário da transação, de modo que duas
inserções na mesma transação recebem o mesmo instante e "a mais recente" fica
ambígua. O desempate é pelo identificador, em ordem decrescente — critério
**puramente técnico**, para tornar a leitura única e estável. O significado de
`recorded_at` não muda, e o identificador **não** é ordem cronológica.
**A garantia vem da cláusula de ordenação; o índice apenas evita o
reordenamento.**

**L-05 — anti-bifurcação.** Uma versão é superada **no máximo uma vez** pelo
mesmo usuário. Sem isso, duas linhas podem superar a mesma anterior, a cadeia
passa a ter duas cabeças simultâneas e "a versão corrente" deixa de ter
leitura única. Valores nulos de `supersedes_id` **não** são restringidos:
unicidade em PostgreSQL não colide entre nulos, então a linha de origem de
cada cadeia permanece livre.

#### 18.4.2 Q-14 — extensão às demais entidades

**Decisão.** A proteção anti-bifurcação de L-05, hoje aplicada apenas a
`recovery_goals`, é **estendida a `commitments` e a `gambling_history`**, com a
mesma lógica e sobre a mesma coluna `supersedes_id`.

**Fundamento.** As três entidades usam o mesmo padrão append-only com
supersessão. O argumento que justificou L-05 — uma cadeia de correções precisa
ser **linear** para que "a versão corrente" seja única — vale identicamente nas
outras duas. A ausência da proteção em `commitments` e `gambling_history`
**não é decisão registrada em lugar algum**: é omissão de L-05, que não foi
generalizada.

**Registro obrigatório — são duas garantias diferentes.**

| Garantia | O que protege | O que **não** faz |
|---|---|---|
| Anti-bifurcação (Q-14 / L-05) | Impede que duas linhas superem a **mesma** versão. Mantém a cadeia de correções **linear** | **Não** limita o número de cadeias. Como unicidade não colide entre nulos, múltiplas linhas com `supersedes_id` nulo — múltiplas raízes — permanecem possíveis |
| Um compromisso ativo (Q-12) | Impede que o usuário tenha mais de um compromisso ativo ao mesmo tempo | **Não** lineariza cadeia alguma |

**Nenhuma das duas substitui a outra, e nenhuma das duas implica a outra.**
Tratar a anti-bifurcação como se resolvesse a cardinalidade de Q-12 é erro
expressamente proibido por esta seção.

**Nota de aplicação.** A extensão é **aditiva** — não cria coluna, não altera
coluna, não altera domínio. Aplicá-la exige verificar antes se já existe
bifurcação gravada; se existir, **a correção dos dados é decisão do
responsável de produto**, não do implementador.

### 18.5 P-29 — `sem_resposta` não tem produtor persistente

**Pendência registrada e deliberadamente mantida aberta.**

Fechada Q-13, `sem_resposta` fica sem nenhum caminho que o grave: não há
gatilho — 9.1 e a proibição 14.3.21 os vedam —, não há rotina agendada, e o
ato de adiar não o produz.

**Enquanto P-29 estiver aberta, `sem_resposta` só pode ser obtido por
derivação em leitura** — um compromisso ativo cujo prazo já passou —, nunca
por gravação. Derivação em leitura é consulta, não registro, e não afirma nada
sobre o usuário no banco.

Decidir se um compromisso vencido sem resposta deve **produzir registro
persistente** é decisão de produto: determina o que a trajetória do usuário
passa a afirmar sobre ele. **Não pode ser resolvida pelo implementador.** Se a
decisão for persistir, a forma continuará restrita pela proibição 14.3.21.

### 18.6 P-30 — modelo de escrita do resultado e forma de garantia de Q-12

**Pendência registrada e deliberadamente mantida aberta.** Bloqueia a
implementação de Q-12.

`commitments` não concede `update`. Logo, registrar o resultado de um
compromisso **não é alterar a linha existente**. Dois modelos são coerentes
com o schema atual, e a escolha entre eles é decisão de produto e arquitetura:

**Modelo 1 — supersessão (append-only estrito).** O resultado é uma **linha
nova** com `supersedes_id` apontando para a versão respondida e `outcome`
preenchido. Preserva integralmente o padrão append-only de 8.2 e Q-10. Sob
este modelo, Q-14 tem função adicional relevante: impede que o mesmo
compromisso seja respondido duas vezes. Em contrapartida, Q-12 **não é
imponível declarativamente** (18.2) e precisaria da mesma estratégia adotada
para o invariante de consentimento — regra garantida na construção, com
**verificação por consulta**, conforme 9.1 e 9.3, sem gatilho. Fica em aberto,
ainda, se a linha de resultado repete a declaração e o prazo ou os deixa
nulos.

**Modelo 2 — preenchimento restrito de `outcome`.** Conceder `update` apenas
da coluna `outcome`, apenas sobre linha própria e apenas quando `outcome` for
nulo. Torna o estado "ativo" local à linha e permite impor Q-12 por índice
único parcial. Em contrapartida, **afasta `commitments` do padrão append-only**
e perde o instante da resposta, salvo se uma coluna própria for acrescentada —
o que seria alteração de schema, não restrição aditiva.

**Nenhum dos dois está escolhido.** Enquanto P-30 estiver aberta, a
implementação do registro de resultado no "Hoje" **não está autorizada**.

### 18.7 CF-11 — check-in diário previsto no MVP sem entidade no núcleo mínimo

**Conflito documental registrado, NÃO resolvido.**

Op. §22 lista **Check-in** entre os itens do MVP; Op. §6 define o check-in
mínimo — fissura, autoeficácia, comportamento desde o último check-in — e Op.
§14 o descreve novamente. Nenhuma entidade do núcleo mínimo de 11.2 recebe
esses dados; 11.3 mantém "módulos completos de check-in" fora do escopo
antecipado; e a proibição 14.4.25 veda criar entidade além do núcleo mínimo.

**Efeito prático.** Não existe hoje entidade capaz de registrar o estado de um
dia, e criar uma **não está autorizado**. Isto **não é lacuna de
implementação** — é conflito entre documentos do próprio projeto, e sua
resolução é decisão de produto.

**Dependência.** Fissura e autoeficácia são medidas de estado clínico. Defini-las
— escala, formulação da pergunta, leitura do resultado — recai sobre a
proibição 14.3.23 e depende de **P-05**, aberta. Enquanto P-05 estiver aberta,
CF-11 **não pode ser resolvido**, ainda que a decisão de escopo seja tomada.

> Q-11 não resolve nem contorna CF-11: ela apenas registra que o "Hoje", como
> existe hoje, trata de compromisso e não de dia.

### 18.8 O que esta emenda autoriza e o que permanece bloqueado

**Autorizado pela emenda E-05, em rodada própria e sob aprovação explícita:**

1. **Q-13 — "Depois".** Não depende de banco: o comportamento decidido é
   *não gravar*. Pode ser implementado na interface.
2. **Q-14 — anti-bifurcação** em `commitments` e `gambling_history`. Restrição
   aditiva, precedida de verificação de bifurcação existente.
3. **Q-11 na leitura.** Apresentar o compromisso ativo e a ausência dele;
   derivar em leitura o vencimento sem resposta, conforme 18.5.

**Bloqueado:**

1. **Registro do resultado do compromisso** — depende de **P-30**.
2. **Imposição de Q-12** — depende de **P-30**.
3. **Qualquer entidade de registro diário** — depende de **CF-11** e de
   **P-05**, e esbarra em 14.4.25.
4. **Gravação de `sem_resposta`** por qualquer caminho — depende de **P-29**.
5. **Qualquer afirmação sobre aposta em um dia** — sem fonte declarada,
   conforme 18.1.3.
6. **Exposição a usuários reais** — 12.1 segue valendo enquanto P-04 e P-05
   estiverem abertas.

---

## 19. Fase 5 — fechamento de P-30 (emenda E-06)

P-30, aberta em 18.6, perguntava **como** garantir Q-12 — a regra de no máximo
um compromisso ativo por usuário —, já que 18.2 demonstrou que ela não é
imponível por restrição declarativa sobre o schema atual.

Esta seção fecha P-30. Ela **não cria entidade alguma**, **não altera** o
domínio de Q-06, **não revoga** 11.3 e **não modifica** E-01 a E-05.

### 19.1 Decisão — Modelo A, variante A3

**Decisão.** O resultado de um compromisso é registrado por **supersessão
append-only**: uma **linha nova**, com `supersedes_id` apontando para a versão
respondida e `outcome` preenchido. A linha anterior **não é alterada** —
`commitments` continua sem `update` e sem `delete`.

**Q-12 é imposta por função transacional**, com estas quatro propriedades,
todas obrigatórias:

1. **Trava por usuário.** A função toma uma trava transacional derivada do
   `user_id` **antes** de verificar a existência de compromisso ativo. Sem
   ela, duas transações concorrentes leem "nenhum ativo" e ambas inserem —
   a verificação sozinha **não é garantia**.
2. **Escrita exclusiva pelas funções.** O privilégio de `insert` em
   `commitments` é **revogado** do papel do cliente. Nenhum caminho fora das
   funções escreve na tabela.
3. **Identidade da sessão.** A identidade vem sempre de `auth.uid()`. Nenhuma
   função de escrita aceita `user_id` por parâmetro.
4. **Verificação por consulta.** Uma view de verificação expõe violações,
   no mesmo papel que 9.3.1 dá à consulta de invariante — verificar, não
   impor.

**Nenhum trigger é criado.** 9.1 e a proibição 14.3.21 permanecem íntegras e
não são reinterpretadas por esta emenda.

### 19.2 A ressalva de SECURITY DEFINER — alcance estrito

Revogar `insert` da tabela e manter a função em `security invoker` é
contraditório: uma função `security invoker` roda com o papel de quem a chama
e, sem o privilégio, também não escreve. A variante A3 exige, portanto,
**`security definer`**.

**Ressalva concedida, e apenas ela:** as funções de escrita de `commitments`
podem ser `security definer`.

**Condições cumulativas. Falhando qualquer uma, a ressalva não se aplica:**

1. A identidade é lida **exclusivamente** de `auth.uid()`. **Nenhuma função
   coberta por esta ressalva aceita `user_id`, `id` de usuário ou qualquer
   identificador de identidade como parâmetro.**
2. `search_path` é fixado explicitamente na definição da função.
3. A função **reimplementa a verificação de posse** que a RLS faria: toda
   linha lida ou escrita é confrontada com `auth.uid()`. Dentro de uma função
   `security definer`, a RLS da tabela **não** protege — a verificação passa a
   ser responsabilidade da função, e é obrigatória.
4. Todos os parâmetros são validados contra domínio ou formato antes do uso.
5. `execute` é revogado de `public` e de `anon`, e concedido **somente** a
   `authenticated`.
6. A ressalva alcança **apenas a escrita** em `commitments`. **A leitura
   continua sob RLS**: a política de `select` e o privilégio de `select`
   permanecem como estão.

**Alcance negativo, vinculante.** Esta ressalva **não** vale para
`profiles`, `consent_records`, `recovery_goals` nem `gambling_history`. Não
autoriza `security definer` em nenhuma outra função, presente ou futura, sem
nova emenda.

**14.3.19 permanece íntegra.** Ela proíbe **service role** para contornar
autorização — coisa diversa. Nada aqui usa service role, e nada aqui contorna
autorização: a verificação de posse é feita, apenas deixa de ser feita pela
RLS e passa a ser feita pela função.

**17.1 permanece a regra geral.** Ali, `security invoker` foi escolhido de
propósito, para que a RLS continuasse valendo dentro da função. Esta seção é
**exceção delimitada**, não reversão: onde `security invoker` bastar,
`security invoker` continua sendo o padrão.

### 19.3 Q-14 e a view de verificação

A proteção anti-bifurcação decidida em 18.4.2 é aplicada nesta mesma etapa a
`commitments` e a `gambling_history`.

Antes de aplicá-la, é obrigatório **verificar** se já existe bifurcação
gravada ou usuário com mais de um compromisso ativo. Encontrando qualquer uma,
a aplicação **para** e relata. **Nenhum dado é apagado ou corrigido
automaticamente** — corrigir dado é decisão do responsável de produto, nunca
do implementador.

### 19.4 A linha de resultado não repete a declaração

18.6 deixou em aberto se a linha de resultado repete `commitment_declaration`
e `due_at` ou os deixa nulos.

**Decisão.** **Não repete.** A linha de resultado carrega o `outcome`, o
`supersedes_id` e o próprio `recorded_at`; a declaração e o prazo permanecem
onde foram declarados.

**Fundamento.** 8.2 e 6.2.4 já fixam que estado duplicado é estado que
diverge, e que o estado corrente é derivado do histórico, nunca armazenado em
paralelo. Repetir a declaração numa segunda linha gravaria o mesmo fato
declarado duas vezes, com dois timestamps distintos, e faria qualquer
contagem de declarações contar duas vezes o que a pessoa disse uma só.

**Consequência.** Ler a declaração de um compromisso já respondido exige
percorrer a cadeia por `supersedes_id`. O histórico permanece integralmente
reconstruível, e o instante de cada ato — declarar, corrigir, responder —
permanece registrado separadamente.

### 19.5 O que esta emenda não altera

1. **Q-11 (18.1):** o "Hoje" continua registrando resultado **de
   compromisso**, não resultado de dia.
2. **Q-13 (18.3):** "Depois" continua **não gravando nada**, e `sem_resposta`
   continua não significando adiamento.
3. **P-29 (18.5)** permanece **aberta**: `sem_resposta` continua sem produtor
   persistente.
4. **CF-11 (18.7)** permanece **não resolvido**: nenhuma entidade de registro
   diário é criada, e 14.4.25 segue valendo.
5. **18.1.3** permanece: nenhum artefato afirma aposta em um dia sem fonte
   declarada.
6. **12.1** permanece: enquanto P-04 e P-05 estiverem abertas, o ambiente não
   deve estar acessível a usuários reais.

Com P-30 fechada, os itens 1 e 2 da lista de bloqueios de 18.8 deixam de
bloquear. Os itens 3, 4, 5 e 6 daquela lista continuam valendo integralmente.

---

## 20. Conversa — remoção do bloqueio de existência (emenda E-07)

A funcionalidade de conversa não podia sequer ser projetada: 11.3 mantém
"conversas e mensagens" entre o que não se cria antecipadamente, e a
proibição 14.4.25 veda criar entidade além do núcleo mínimo de 11.2. Somadas,
as duas impediam não só a implementação como a própria discussão de modelo.

Esta seção remove **apenas esse bloqueio de existência**. Ela **não cria
tabela, não define coluna, não escolhe retenção, não escolhe provedor** e
**não altera P-04, P-05 nem D-04**.

### 20.1 Fundamento — a conversa já está no escopo do produto

Não se trata de escopo novo. Op. §22 lista **IA conversacional** e **Memória**
entre os itens do **MVP**; Op. §13 descreve a primeira conversa; Op. §14
descreve a conversa profunda; Op. §15 descreve a memória da IA. A conversa é o
que Op. §14 chama de "interface de um sistema estruturado" — não um módulo
acessório.

A exclusão de 11.3 é regra de **momento**, não de mérito: 11.1 já fixa que
"cada entidade futura será criada **quando entrar no caminho de implementação
correspondente**, com sua RLS na mesma migration". A conversa entrou nesse
caminho. O que faltava era retirar a trava de 14.4.25, que é absoluta como
está redigida e por isso exigiu emenda em cada expansão anterior (E-01 a
E-06).

### 20.2 Decisão

**As entidades de conversa e mensagem podem ser criadas**, quando a
implementação correspondente for executada.

A proibição 14.4.25 passa a admitir essa exceção — **e somente ela**.

**A criação não acontece nesta emenda.** Tabelas, colunas, migrations,
políticas e privilégios pertencem à rodada de implementação, e a decisão de
modelo permanece aberta (P-33, seção 20.5).

### 20.3 O que a conversa herda, sem exceção

Nada abaixo é criado por esta emenda: tudo já vale por força própria e
alcança a conversa no momento em que ela existir.

1. **7.1 — propriedade.** A entidade referencia a identidade por `user_id`
   apontando para `auth.users(id)`. Nenhum outro padrão é admitido, e 7.2
   segue proibindo `owner_id`, `account_id` e `profile_id`.
2. **7.3 e 12.5 — isolamento.** RLS habilitada **na mesma migration** que
   cria a tabela, restringindo leitura e escrita ao dono.
3. **9.2 — invariante do consentimento.** Já alcança, textualmente, "toda
   tabela criada em qualquer fase futura": nenhuma linha de conversa pode
   existir para identidade sem aceite principal anterior ou igual. A consulta
   de verificação de 9.3.1 deverá cobri-la, como cobriu as entidades da
   Fase 1B.
4. **12.1 — nada antes do aceite.** Nenhuma mensagem antes do ato explícito.
5. **12.2 — mutação no servidor.** Nenhuma escrita direta pelo cliente.
6. **12.3 e 12.4 — telemetria.** Conteúdo de conversa **nunca** entra em
   evento analítico. 12.4 é explícita quanto a "conteúdo de conversa".
7. **12.9 — logs.** Logs técnicos não contêm conversas completas.
8. **4.5 — treinamento.** Conteúdo de conversa não é usado para treinar
   modelo no MVP, e isso é exigência contratual perante o provedor.
9. **Op. §15 — finalidade.** "Não guardar indiscriminadamente toda conversa;
   memória precisa ter finalidade." A persistência não pode nascer como
   "gravar tudo por padrão".
10. **Op. §21 — limites da IA.** Não diagnosticar, não se apresentar como
    terapeuta, não substituir atendimento, não prescrever, não afirmar
    certezas clínicas sem base, não pressionar, não culpar após recaída, não
    inventar gatilhos.

### 20.4 O que esta emenda NÃO autoriza

Delimitação vinculante. Cada item abaixo continua bloqueado exatamente como
estava, e nenhum deles é afetado por 20.2:

1. **Escolher provedor de IA ou introduzir chamada a modelo.** A proibição
   14.4.30 permanece íntegra, e **D-04/P-07** — provedor, modelo, jurisdição,
   política de retenção, vedação contratual de treinamento — permanece
   aberta. Sem ela não há conversa com IA, apenas a possibilidade de existir
   a entidade.
2. **Definir critérios clínicos de risco ou crise.** A proibição 14.3.23
   permanece íntegra e **P-05** permanece aberta. A conduta da conversa
   diante de sinal de risco não é decidida aqui.
3. **Decidir retenção, exclusão, base legal ou tratamento de dados de
   terceiros mencionados pelo usuário.** **P-04** permanece aberta, e 12.6
   continua proibindo decisão de LGPD inventada.
4. **Expor a usuários reais.** 12.1 continua valendo enquanto P-04 e P-05
   estiverem abertas.
5. **Memória e padrões.** 11.3 exclui "padrões e memória" como item
   **separado** de "conversas e mensagens". Esta emenda alcança apenas o
   segundo. A entidade de memória exige emenda própria.
6. **Check-in diário.** CF-11 (18.7) permanece **não resolvido**, e 14.4.25
   continua vedando essa entidade. Esta emenda não é abertura geral do núcleo
   mínimo.
7. **Qualquer outra entidade de 11.3.** A exceção de 20.2 é nominal e se
   esgota em conversa e mensagem.

### 20.5 P-33 — modelo de dados da conversa

**Pendência registrada e deliberadamente mantida aberta.**

Esta emenda autoriza a existência; **não** decide a forma. Permanecem em
aberto, entre outros: quantas entidades (conversa e mensagem separadas ou
uma só), quais atributos, se a autoria de cada mensagem é distinguida e como,
se a tabela é append-only como 8.2 e Q-10 fixaram para as entidades já
existentes, e o que a finalidade de Op. §15 admite guardar.

Parte dessas respostas **depende de decisões que não são de engenharia**: a
retenção depende de P-04 e da política do provedor em D-04; o que a conversa
registra diante de sinal de risco depende de P-05. Fixar estrutura antes
delas gravaria schema que a decisão seguinte obrigaria a refazer.

**Enquanto P-33 estiver aberta, nenhuma migration de conversa deve ser
escrita.** O preâmbulo da seção 14 permanece: diante de qualquer item que ela
lista, o Claude Code interrompe e pergunta — não escolhe, não infere e não
adota um padrão comum de mercado.

---

## 21. Modelo de dados da conversa — fechamento de P-33 (emenda E-08)

P-33, aberta em 20.5, mantinha em aberto a **forma** das entidades que E-07
autorizou a existir, e proibia escrever migration de conversa enquanto assim
fosse. O responsável de produto determinou a implementação e o desenho do
menor schema necessário. Esta seção registra o que foi decidido, para que o
documento não fique atrás do banco.

Ela **não** altera E-07 e **não** toca P-04, P-05 nem D-04/P-07.

### 21.1 Decisão — duas entidades, e o mínimo em cada uma

**`conversations`** — `id`, `user_id`, `created_at`. Existe para agrupar
mensagens. **Sem título, sem estado, sem resumo, sem rótulo**: cada um deles
seria decisão de produto que nenhum documento tomou, ou inferência gravada
como fato, contra Op. §2.

**`messages`** — `id`, `user_id`, `conversation_id`, `author`, `content`,
`created_at`.

**Sem restrição de unicidade de conversa por usuário.** Fixar "uma conversa
para sempre" ou "uma por sessão" é decisão de produto ainda não tomada. O
schema não impede nenhum dos dois futuros; a aplicação obtém a mais recente
ou cria a primeira.

### 21.2 `author` — domínio fechado, produtor parcial

O domínio é **usuário** ou **ia**. Op. §2, §13 e §21 tratam a IA como
interlocutor, então os dois lados existem no domínio desde já.

**`ia` não tem produtor nesta fase, e isso é deliberado:** 14.4.30 proíbe a
chamada ao modelo enquanto D-04/P-07 estiver aberta. Nenhum caminho da
aplicação grava esse valor. É a mesma situação já registrada para
`sem_resposta` em 18.5 — valor de domínio à espera da decisão que o produz.

### 21.3 `messages` não carrega natureza da informação

Q-09 separa **declarado**, **observado**, **inferido** e **segurança** para
os **fatos** que o sistema guarda sobre a pessoa. Mensagem é **conteúdo bruto
de conversa**, não fato extraído — Op. §15 separa justamente as duas coisas,
e extrair fato de conversa é **memória**, que 20.4.5 mantém vedada.

Acrescentar a coluna sugeriria que a mensagem já é um fato classificado.
Quando a memória existir, ela será entidade própria, com emenda própria.

### 21.4 Ordem do diálogo

`created_at` de `messages` usa **`clock_timestamp()`**, não `now()`.

`now()` devolve o horário da **transação**: duas mensagens gravadas na mesma
transação — pergunta e resposta, no dia em que houver resposta — receberiam
o mesmo instante, e a ordem passaria a depender do desempate por `id`, que é
uuid v4, aleatório. Metade das vezes a resposta apareceria antes da pergunta.

É a lição de L-04 aplicada onde a ordem **é** o significado. A leitura
continua ordenando por `created_at` e `id`; a garantia vem da cláusula, não
do índice.

### 21.5 O que a conversa herda, e o que continua vedado

Vale integralmente 20.3 — 7.1, 7.2, 7.3, 9.2, 9.3.1, 12.1, 12.2, 12.3, 12.4,
12.5, 12.9, 4.5, Op. §15 e Op. §21 — e a consulta de invariante de 9.3.1 foi
estendida às duas tabelas nesta mesma migration.

Duas garantias merecem registro explícito:

1. **A mensagem não pendura em fio alheio.** A chave estrangeira é
   **composta** — `(user_id, conversation_id)` referenciando
   `conversations (user_id, id)` —, pelo mesmo motivo de R5: a política de
   escrita confere de quem é a linha, mas não de quem é a conversa apontada.
2. **Sem UPDATE e sem DELETE**, como nas demais entidades de usuário. Editar
   ou apagar mensagem é decisão de produto que nenhum documento tomou, e
   exclusão depende de P-04.

E 20.4 permanece inteira: **nenhuma tabela de memória ou padrões**, nenhuma
coluna de risco ou crise, nenhuma coluna de retenção, nenhuma referência a
provedor. **Nada é derivado da conversa** — sem resumo, sem rótulo, sem
extração de fato.

### 21.6 O que permanece aberto

1. **Resposta.** Não existe. **D-04/P-07** segue aberta, 14.4.30 íntegra.
2. **Conduta diante de sinal de risco.** **P-05** segue aberta, 14.3.23
   íntegra.
3. **Retenção, exclusão e dados de terceiros citados na conversa.** **P-04**
   segue aberta.
4. **Memória e padrões.** Vedados por 20.4.5; exigem emenda própria.
5. **Editar ou apagar mensagem, e quantas conversas um usuário tem.**
   Decisões de produto não tomadas; o schema não as antecipa.
6. **Exposição a usuários reais.** 12.1 continua valendo.

---

*Fim do documento normativo. Versão 1.0.*
