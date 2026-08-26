import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { LiquidItem } from "../../interfaces/keto";

/**
 * POST /liquids — registrar líquido consumido.
 * Body: { cantidadMl: number }
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    const cantidadMl = Number(body.cantidadMl);
    if (!body.cantidadMl || Number.isNaN(cantidadMl) || cantidadMl <= 0 || cantidadMl > 10000) {
      return response(400, { message: "cantidadMl inválida (1–10000)" }, origin);
    }

    const item: LiquidItem = {
      id: uuidv4(),
      userId: auth.userId,
      fechaHora: new Date().toISOString(),
      cantidadMl,
    };

    await putItem(T.liquids(), item as unknown as Record<string, unknown>);
    return response(201, item, origin);
  } catch (err) {
    console.error("createLiquid error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
