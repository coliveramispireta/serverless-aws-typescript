import { APIGatewayProxyHandler } from "aws-lambda";
import { broadcastDaily } from "../../helpers/reminders";

/**
 * Cron viernes 17:00 (hora México / UTC-6): aviso de fin de semana
 * ("no te excedas en…") antes de las reuniones y antojos.
 */
export const handler: APIGatewayProxyHandler = async () => {
  console.log("cronWeekendGuard iniciando…");
  await broadcastDaily("weekend");
  return { statusCode: 200, body: "ok" };
};
