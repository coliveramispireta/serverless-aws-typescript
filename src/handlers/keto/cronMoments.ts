import { APIGatewayProxyHandler } from "aws-lambda";
import { broadcastDaily } from "../../helpers/reminders";
import { MomentKinds } from "../../helpers/motivationalpools";

/**
 * CronMoments: UNA lambda con múltiples reglas EventBridge.
 * Cada regla (slot) dispara un momento del día; el enfoque del mensaje
 * se elige aleatoriamente entre los candidatos del slot para mantener
 * variedad: motivación, tentaciones, reflexión, fe, hidratación…
 *
 * La regla que disparó la ejecución llega en event.resources[0]:
 *   arn:aws:events:…:rule/ketoflow-slot-1400-dev  →  slot "1400"
 *
 * Horarios definidos en cronMoments.yml (UTC → hora local UTC-5):
 *   0900 → 09:00 | 1100 → 11:00 | 1230 → 12:30 | 1400 → 14:00
 *   1600 → 16:00 | 1800 → 18:00 | 1930 → 19:30 | 2100 → 21:00
 *   weekend (solo viernes) → 17:00
 */
const SLOT_KINDS: Record<string, MomentKinds[]> = {
  "0900": ["animo", "amorpropio"],
  "1100": ["reflexion", "metas"],
  "1230": ["alerta", "antojos"],
  "1400": ["hidratacion"],
  "1600": ["orgullo", "metas"],
  "1800": ["antojos", "alerta"],
  "1930": ["fe"],
  "2100": ["transformacion"],
  weekend: ["weekend"],
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("cronMoments iniciando…");

  const resources = ((event as unknown as { resources?: string[] }).resources) ?? [];
  const ruleName = resources[0]?.split("/").pop() ?? "";
  // ketoflow-slot-<id>-<stage> → <id>
  const slot = ruleName.replace(/^ketoflow-slot-/, "").replace(/-[^-]+$/, "");

  const kinds = SLOT_KINDS[slot];
  if (!kinds) {
    console.warn(`cronMoments: slot desconocido "${slot}" (regla: ${ruleName})`);
    return { statusCode: 200, body: `slot desconocido: ${slot}` };
  }

  await broadcastDaily(kinds);
  return { statusCode: 200, body: "ok" };
};
