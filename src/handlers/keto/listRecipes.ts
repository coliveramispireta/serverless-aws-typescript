import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { scanTable, T } from "../../data/ketoRepo";
import { RecipeItem } from "../../interfaces/keto";

/** GET /recipes — lista todas (más recientes primero) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const recipes = await scanTable<RecipeItem>(T.recipes(), 200);
    recipes.sort((a, b) => (b.fechaCreacion ?? "").localeCompare(a.fechaCreacion ?? ""));
    return response(200, recipes, origin);
  } catch (err) {
    console.error("listRecipes error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
