import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { LiquidItem } from "../../interfaces/keto";

/**
 * POST /liquids — registrar líquido consumido.
 * Body: { cantidadMl: number, fechaHora?: string, nota?: string }
 *
 * `fechaHora` es opcional: si no se envía se usa la hora actual (UTC).
 * Permite registrar agua de días anteriores (ponerse al día).
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

    // fechaHora opcional (para registrar agua de días pasados)
    let fechaHora = new Date().toISOString();
    if (body.fechaHora !== undefined && body.fechaHora !== null && body.fechaHora !== "") {
      const ts = Date.parse(String(body.fechaHora));
      if (Number.isNaN(ts)) {
        return response(400, { message: "fechaHora inválida" }, origin);
      }
      // No permitir fechas futuras lejanas (máx 1 día por delante por zona horaria)
      if (ts > Date.now() + 24 * 60 * 60 * 1000) {
        return response(400, { message: "fechaHora no puede ser futura" }, origin);
      }
      fechaHora = new Date(ts).toISOString();
    }

    // nota opcional
    let nota: string | undefined;
    if (body.nota !== undefined && body.nota !== null && String(body.nota).trim() !== "") {
      nota = String(body.nota).trim();
      if (nota.length > 200) {
        return response(400, { message: "nota excede 200 caracteres" }, origin);
      }
    }

    const item: LiquidItem = {
      id: uuidv4(),
      userId: auth.userId,
      fechaHora,
      cantidadMl,
      nota,
    };

    await putItem(T.liquids(), item as unknown as Record<string, unknown>);
    return response(201, item, origin);
  } catch (err) {
    console.error("createLiquid error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
