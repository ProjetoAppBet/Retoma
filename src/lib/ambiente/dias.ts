import type { Dia } from "@/components/marca/linha";
import { createClient } from "@/lib/supabase/server";

/**
 * Deriva os dias da Linha a partir do que já existe no banco.
 *
 * Nada é inventado e nada é gravado: os dias vêm de `profiles.created_at`
 * (quando a pessoa entrou) e das linhas que ela mesma registrou. Um dia com
 * qualquer registro é "com-registro"; os demais são "sem-registro".
 *
 * "com-aposta" NÃO aparece: nenhuma entidade registra dia de aposta hoje. O
 * estado existe no componente porque é regra da marca, mas afirmá-lo sem
 * fonte seria inventar. Quando houver check-in diário, ele passa a ocorrer
 * sem mudar este contrato.
 *
 * Todas as leituras passam pela RLS: cada identidade só enxerga o que é dela.
 */

const UM_DIA = 24 * 60 * 60 * 1000;

/** Data local no formato AAAA-MM-DD, para agrupar por dia. */
function chaveDoDia(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export type Trajetoria = {
  dias: Dia[];
  indiceDeHoje: number;
  /** Dias desde a entrada, inclusive hoje. */
  total: number;
  inicio: Date | null;
};

export async function carregarTrajetoria(limite = 42): Promise<Trajetoria> {
  const supabase = await createClient();

  const [{ data: perfil }, ...registros] = await Promise.all([
    supabase.from("profiles").select("created_at").limit(1).single(),
    supabase.from("commitments").select("recorded_at"),
    supabase.from("gambling_history").select("recorded_at"),
    supabase.from("recovery_goals").select("recorded_at"),
  ]);

  const comRegistro = new Set<string>();
  for (const { data } of registros) {
    for (const linha of data ?? []) comRegistro.add(chaveDoDia(linha.recorded_at));
  }

  const inicio = perfil?.created_at ? new Date(perfil.created_at) : null;
  const hoje = new Date();

  const decorridos = inicio
    ? Math.floor((hoje.getTime() - inicio.getTime()) / UM_DIA) + 1
    : 1;
  const total = Math.max(1, decorridos);
  const mostrados = Math.min(total, limite);

  const dias: Dia[] = [];
  for (let i = mostrados - 1; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * UM_DIA);
    const chave = d.toISOString().slice(0, 10);
    dias.push({
      rotulo: chave.slice(8, 10),
      estado: comRegistro.has(chave) ? "com-registro" : "sem-registro",
    });
  }

  return { dias, indiceDeHoje: dias.length - 1, total, inicio };
}
