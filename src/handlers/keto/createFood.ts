import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { putItem, T } from "../../data/ketoRepo";
import { FoodCategory, FoodItem } from "../../interfaces/keto";

/**
 * POST /foods — agregar alimento al catálogo (solo coach).
 * Body: { nombre, unidad, equivalenciaGramos?, categoria? }
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    const nombre = body.nombre ? String(body.nombre).trim() : "";
    const unidad = body.unidad ? String(body.unidad).trim() : "";
    const categoria = body.categoria ? String(body.categoria).trim() : "";

    if (!nombre) return response(400, { message: "Missing nombre" }, origin);
    if (!["g", "und", "ml"].includes(unidad)) {
      return response(400, { message: "unidad debe ser 'g', 'und' o 'ml'" }, origin);
    }

    const VALID_CATEGORIES: FoodCategory[] = [
      "proteina",
      "verdura",
      "grasa",
      "lacteo",
      "fruto_seco",
      "semilla",
      "otro",
      "no_keto",
    ];
    if (categoria && !VALID_CATEGORIES.includes(categoria as FoodCategory)) {
      return response(400, { message: "categoria inválida" }, origin);
    }

    const food: FoodItem = {
      foodId: uuidv4(),
      nombre,
      unidad: unidad as "g" | "und" | "ml",
      equivalenciaGramos: body.equivalenciaGramos != null ? Number(body.equivalenciaGramos) : undefined,
      categoria: categoria ? (categoria as FoodCategory) : undefined,
      emoji: body.emoji ? String(body.emoji).trim().slice(0, 8) : undefined,
    };

    await putItem(T.foods(), food as unknown as Record<string, unknown>);
    return response(201, food, origin);
  } catch (err) {
    console.error("createFood error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
