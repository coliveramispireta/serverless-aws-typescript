import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { WeightEntryItem } from "../../interfaces/keto";

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

    delete body.userId;

    const pesoKg = Number(body.pesoKg);
    const missing: string[] = [];
    if (!body.pesoKg || Number.isNaN(pesoKg) || pesoKg <= 0 || pesoKg > 500) missing.push("pesoKg");
    if (missing.length > 0) {
      return response(400, { message: "Missing fields", fields: missing }, origin);
    }

    // La fecha es el SK: si el front no la envía, se usa ahora.
    const fechaHora = body.fechaHora
      ? new Date(String(body.fechaHora)).toISOString()
      : new Date().toISOString();

    const weight: WeightEntryItem = {
      id: uuidv4(),
      userId: auth.userId,
      fechaHora,
      pesoKg,
      nota: body.nota ? String(body.nota) : undefined,
    };

    await putItem(T.weights(), weight as unknown as Record<string, unknown>);
    return response(201, weight, origin);
  } catch (err) {
    console.error("createWeight error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
