import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { scanTable, T } from "../../data/ketoRepo";
import { FoodItem } from "../../interfaces/keto";

/**
 * GET /foods — catálogo de alimentos.
 * Público para usuarios autenticados.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const foods = await scanTable<FoodItem>(T.foods(), 200);
    // Ordenar alfabéticamente
    foods.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return response(200, foods, origin);
  } catch (err) {
    console.error("listFoods error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
