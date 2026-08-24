import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { hasValue } from "../../helpers/values";
import { putItem, T } from "../../data/ketoRepo";
import { MealEntryItem, MealType } from "../../interfaces/keto";
import { validateMealBody } from "./mealsShared";

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

    // El userId SIEMPRE viene del token; se ignora el del body
    delete body.userId;

    const missing = validateMealBody(body);
    if (missing.length > 0) {
      return response(400, { message: "Missing fields", fields: missing }, origin);
    }

    const meal: MealEntryItem = {
      id: uuidv4(),
      userId: auth.userId,
      fechaHora: new Date(String(body.fechaHora)).toISOString(),
      alimento: String(body.alimento).trim(),
      gramos: Number(body.gramos),
      comida: body.comida as MealType | undefined,
      carbohidratosNetos:
        hasValue(body.carbohidratosNetos) && body.carbohidratosNetos !== ""
          ? Number(body.carbohidratosNetos)
          : undefined,
      nota: body.nota ? String(body.nota) : undefined,
    };

    await putItem(T.meals(), meal as unknown as Record<string, unknown>);
    return response(201, meal, origin);
  } catch (err) {
    console.error("createMeal error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
