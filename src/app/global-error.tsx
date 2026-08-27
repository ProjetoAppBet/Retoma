"use client";

/**
 * Última fronteira: erro no próprio layout raiz, quando `error.tsx` já não
 * tem onde renderizar. Precisa trazer <html> e <body> próprios, e por isso
 * não pode depender de nada do layout — nem de fonte, nem de token de tema.
 *
 * As cores estão literais de propósito: se o CSS global falhou, é justamente
 * aqui que a variável não existiria. Os valores são Ardósia (#0f1719) e Cal
 * (#e9e7e2), copiados dos tokens da marca.
 */
export default function ErroGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#0f1719",
          color: "#e9e7e2",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: "28rem", padding: "0 1.5rem" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 600, margin: 0 }}>
            Algo não funcionou aqui.
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.5, opacity: 0.75 }}>
            Seus registros continuam guardados. Você pode tentar de novo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "2rem",
              height: "3rem",
              width: "100%",
              borderRadius: "0.5rem",
              border: 0,
              backgroundColor: "#e9e7e2",
              color: "#0f1719",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
