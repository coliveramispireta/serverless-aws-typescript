/**
 * Respuestas HTTP con CORS dinámico:
 * - Si el origen de la petición está en ALLOWED_ORIGINS (por stage), se le devuelve ese origen.
 * - Fallback: primer origen configurado; "*" solo si así se configuró.
 * Los handlers nuevos pasan event.headers?.Origin como tercer parámetro.
 */

function resolveCors(originHeader?: string): Record<string, string> {
  const configured = (process.env.ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const wildcardOnly = configured.length === 1 && configured[0] === "*";

  let acao = "*";
  if (!wildcardOnly) {
    if (originHeader && configured.includes(originHeader)) {
      acao = originHeader;
    } else {
      acao = configured[0] ?? "*";
    }
  }

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": acao,
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

export const response = (statusCode: number, body: object, originHeader?: string) => ({
  statusCode,
  headers: resolveCors(originHeader),
  body: JSON.stringify(body),
});
