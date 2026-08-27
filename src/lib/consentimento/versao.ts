/**
 * Identificador da versão do documento de aceite principal.
 *
 * Formato fixado em D-01/D-02/D-09 §17.2 (P-08): slug + versão explícita.
 * É gravado em `consent_records.document_version_id` exatamente como está
 * aqui — sem abreviação e sem derivação.
 *
 * O documento correspondente vive em
 * `docs/consentimento/consentimento-principal-v1.0.md` e é imutável (§10.2):
 * publicar alteração significa criar um arquivo novo com identificador novo e
 * apontar esta constante para ele. Editar o arquivo existente esvazia a
 * auditoria — a partir de um registro é preciso recuperar exatamente o texto
 * que aquele usuário viu.
 */
export const VERSAO_ACEITE_PRINCIPAL = "consentimento-principal-v1.0";

/**
 * Identificador da versão do documento de criação de conta permanente
 * (C-CONTA, §17.6). Mesmo formato de §17.2 e mesma regra de imutabilidade.
 *
 * Artefato derivado: §17.2 nomeou explicitamente apenas o documento do aceite
 * principal. Como C-CONTA é consentimento próprio e auditável e
 * `document_version_id` é NOT NULL, o formato foi aplicado ao segundo
 * documento. Pende de ratificação do responsável de produto.
 */
export const VERSAO_ACEITE_CONTA = "consentimento-conta-v1.0";
