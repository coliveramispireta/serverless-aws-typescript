import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryByUser, T } from "../../data/ketoRepo";
import { LiquidItem } from "../../interfaces/keto";

/**
 * GET /liquids — listar líquidos del usuario.
 * Opcionalmente filtra por ?fecha=YYYY-MM-DD. Por defecto devuelve los últimos 100.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const all = await queryByUser<LiquidItem>(T.liquids(), auth.userId, { limit: 500 });

    // Filtrar por fecha si se envía
    const fecha = event.queryStringParameters?.fecha;
    const filtered = fecha
      ? all.filter((l) => l.fechaHora.startsWith(fecha))
      : all;

    return response(200, filtered, origin);
  } catch (err) {
    console.error("listLiquids error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
