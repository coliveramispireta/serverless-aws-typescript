import { APIGatewayProxyHandler } from "aws-lambda";
import { broadcastDaily } from "../../helpers/reminders";

/**
 * Cron diario 15:00 UTC (09:00 hora México / UTC-6):
 * mensajito de ánimo/aliento/resistencia al iniciar el día.
 * Si el usuario lleva ≥4 días sin registrarse, se envía re-encuentro en su lugar.
 */
export const handler: APIGatewayProxyHandler = async () => {
  console.log("cronDailyMotivation iniciando…");
  await broadcastDaily("motivacion");
  return { statusCode: 200, body: "ok" };
};
