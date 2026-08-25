import { APIGatewayProxyHandler } from "aws-lambda";
import { broadcastGuest } from "../../helpers/reminders";

/**
 * Cron para dispositivos con SESIÓN CERRADA (estado="invitado"):
 * 2 mensajes al día (09:00 y 16:00 hora local UTC-5) tipo
 * "tus metas te esperan / te extrañamos / vuelve pronto".
 *
 * Los dispositivos con sesión iniciada NO reciben estos mensajes
 * (ellos reciben los 8 momentos diarios de cronMoments).
 */
export const handler: APIGatewayProxyHandler = async () => {
  console.log("cronGuestMoments iniciando…");
  await broadcastGuest();
  return { statusCode: 200, body: "ok" };
};
