/**
 * Segredo do provedor de IA — leitura estritamente de servidor.
 *
 * §12.8 é a regra que este arquivo existe para cumprir: "Segredos apenas no
 * servidor. Nunca em variáveis `NEXT_PUBLIC_*`". O nome da variável **não
 * tem** o prefixo `NEXT_PUBLIC_`, e é por isso que o Next não a inclui no
 * bundle do cliente — o prefixo é o que faz uma variável atravessar para o
 * navegador, e a sua ausência é a proteção.
 *
 * Diferença deliberada em relação a `@/lib/supabase/ambiente`: aquele lê
 * valores **públicos** (a chave publicável do Supabase é protegida por RLS,
 * não por sigilo) e pode ser importado de qualquer lugar. Este aqui não.
 *
 * A barreira de tempo de execução abaixo é a segunda camada. A primeira é o
 * nome da variável; a segunda garante que, se algum dia este módulo for
 * importado por engano de um componente de cliente, a falha seja imediata e
 * legível em vez de silenciosa.
 *
 * NENHUMA CHAMADA A MODELO ACONTECE AQUI. Este módulo lê uma variável e
 * mais nada: sem cliente HTTP, sem SDK, sem prompt. §14.4.30 permanece
 * íntegra, e D-04/P-07 segue aberta quanto a modelo, jurisdição, política
 * de retenção e vedação contratual de treinamento.
 */

const NOME = "OPENAI_API_KEY";

/**
 * A chave, ou erro nomeado.
 *
 * O valor **nunca** é registrado, devolvido em mensagem de erro, incluído em
 * log ou exposto em resposta. Quem chama usa e descarta.
 */
export function chaveDoProvedorDeIa(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      `${NOME} é segredo de servidor e não pode ser lida no navegador (§12.8).`,
    );
  }

  const valor = process.env[NOME];

  if (!valor) {
    throw new Error(
      `Variável de ambiente ausente: ${NOME}. Em desenvolvimento, defina-a ` +
        `em .env.local (que o .gitignore já ignora). Em produção, no painel ` +
        `da Vercel, em Settings > Environment Variables — nunca em arquivo ` +
        `versionado. Veja .env.example.`,
    );
  }

  return valor;
}

/**
 * Se o segredo está configurado, sem revelá-lo.
 *
 * Existe para que a aplicação consiga decidir se a conversa com IA está
 * disponível sem precisar ler o valor — e para diagnóstico, que precisa
 * responder "está lá?" sem nunca responder "é isto".
 */
export function provedorDeIaConfigurado(): boolean {
  if (typeof window !== "undefined") return false;
  return Boolean(process.env[NOME]);
}
