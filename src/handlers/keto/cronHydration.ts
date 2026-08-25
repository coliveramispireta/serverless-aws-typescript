import { APIGatewayProxyHandler } from "aws-lambda";
import { broadcastDaily } from "../../helpers/reminders";

/**
 * Cron diario 20:00 UTC (14:00 hora México / UTC-6):
 * recordatorio de hidratación ("recuerda tomar agua", "hidrátate bien").
 */
export const handler: APIGatewayProxyHandler = async () => {
  console.log("cronHydration iniciando…");
  await broadcastDaily("hidratacion");
  return { statusCode: 200, body: "ok" };
};
