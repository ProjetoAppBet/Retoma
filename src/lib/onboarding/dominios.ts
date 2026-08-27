/**
 * Domínios do onboarding, transcritos das fontes normativas.
 *
 * Nenhum valor aqui é inventado: cada lista reproduz literalmente o domínio
 * fixado em D-01/D-02/D-09 (E-01 §11.5.2, E-02 §11.6) e no Modelo Operacional
 * §5 e §12. Os mesmos valores estão nos CHECK das migrations da Fase 1B — se
 * divergirem, o banco recusa a linha.
 */

/** §11.5.2 · categorias de frequência (Op. §5). */
export const FREQUENCIAS = [
  "ocasional",
  "semanal",
  "várias vezes por semana",
  "diariamente",
  "várias vezes ao dia",
] as const;

/** §11.5.2 · estados da resposta. A ausência de valor mora aqui, não em NULL. */
export const ESTADOS_DE_RESPOSTA = [
  "informado",
  "não sabe",
  "recusou informar",
  "não perguntado",
] as const;

/** §11.5.2 · períodos admitidos para o valor declarado. */
export const PERIODOS = [
  "por aposta",
  "dia",
  "semana",
  "mês",
  "ano",
  "acumulado/total",
  "outro",
] as const;

/** Q-05 · categorias de consequência (Op. §5). */
export const CONSEQUENCIAS = [
  "financeiras",
  "familiares",
  "relacionamentos",
  "profissionais",
  "emocionais",
  "outras relevantes",
] as const;

/** Q-02 · tipo do objetivo. */
export const TIPOS_DE_OBJETIVO = [
  "interromper",
  "reduzir",
  "ainda não decidido",
] as const;

/** Q-09 · as três entidades da Fase 1B são declarativas. */
export const NATUREZA_DECLARADA = "declarado";

/**
 * Op. §12: "compromisso mínimo para as próximas 24 horas". O horizonte é
 * normativo; o schema não o impõe, então é aqui que ele vive.
 */
export const HORIZONTE_DO_COMPROMISSO_MS = 24 * 60 * 60 * 1000;

export type Frequencia = (typeof FREQUENCIAS)[number];
export type EstadoDeResposta = (typeof ESTADOS_DE_RESPOSTA)[number];
export type Periodo = (typeof PERIODOS)[number];
export type Consequencia = (typeof CONSEQUENCIAS)[number];
export type TipoDeObjetivo = (typeof TIPOS_DE_OBJETIVO)[number];
