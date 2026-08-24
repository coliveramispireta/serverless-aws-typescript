import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { hasValue } from "../../helpers/values";
import { getItem, updateItemFields, T } from "../../data/ketoRepo";
import { KetoUserProfile } from "../../interfaces/keto";

/** PUT /profile — Actualiza altura, peso objetivo y nombre. Solo campos permitidos. */
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

    const fields: Record<string, number | string> = {};
    if (hasValue(body.alturaCm)) {
      const v = Number(body.alturaCm);
      if (Number.isNaN(v) || v < 100 || v > 250)
        return response(400, { message: "alturaCm inválida" }, origin);
      fields.alturaCm = v;
    }
    if (hasValue(body.pesoObjetivoKg)) {
      const v = Number(body.pesoObjetivoKg);
      if (Number.isNaN(v) || v <= 0 || v > 400)
        return response(400, { message: "pesoObjetivoKg inválido" }, origin);
      fields.pesoObjetivoKg = v;
    }
    if (body.nombre && typeof body.nombre === "string") {
      fields.nombre = body.nombre.trim().slice(0, 80);
    }

    if (Object.keys(fields).length === 0 && !("alturaCm" in body)) {
      return response(400, { message: "Nada que actualizar" }, origin);
    }

    const existing = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });
    if (!existing)
      return response(404, { message: "Profile not found; GET /profile first" }, origin);

    fields.updatedAt = new Date().toISOString();
    await updateItemFields(T.users(), { userId: auth.userId }, fields);

    const updated = await getItem<KetoUserProfile>(T.users(), { userId: auth.userId });
    return response(200, updated ?? { ...existing, ...fields }, origin);
  } catch (err) {
    console.error("updateProfile error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
