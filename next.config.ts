import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A tela de aceite lê o documento versionado direto de docs/, para que não
  // exista uma segunda cópia do texto capaz de divergir (§10.2). O arquivo
  // precisa acompanhar o bundle de servidor.
  outputFileTracingIncludes: {
    "/aceite": ["./docs/consentimento/**"],
  },
};

export default nextConfig;
