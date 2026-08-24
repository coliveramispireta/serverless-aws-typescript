import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { hasValue } from "../../helpers/values";
import { getItem, putItem, T } from "../../data/ketoRepo";
import { RecipeItem } from "../../interfaces/keto";

/** PUT /recipes/{id} — solo coach */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const recipeId = event.pathParameters?.id;
    if (!recipeId) return response(400, { message: "Missing id" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    const existing = await getItem<RecipeItem>(T.recipes(), { recipeId });
    if (!existing) return response(404, { message: "Recipe not found" }, origin);

    const updated: RecipeItem = {
      ...existing,
      titulo: body.titulo ? String(body.titulo).trim() : existing.titulo,
      descripcion: hasValue(body.descripcion) ? String(body.descripcion) : existing.descripcion,
      ingredientes: Array.isArray(body.ingredientes)
        ? (body.ingredientes as unknown[]).map(String)
        : existing.ingredientes,
      pasos: Array.isArray(body.pasos) ? (body.pasos as unknown[]).map(String) : existing.pasos,
      minutosPreparacion: hasValue(body.minutosPreparacion)
        ? Number(body.minutosPreparacion)
        : existing.minutosPreparacion,
      porciones: hasValue(body.porciones) ? Number(body.porciones) : existing.porciones,
      carbohidratosNetosPorPorcion: hasValue(body.carbohidratosNetosPorPorcion)
        ? Number(body.carbohidratosNetosPorPorcion)
        : existing.carbohidratosNetosPorPorcion,
      imagenUrl: hasValue(body.imagenUrl) ? String(body.imagenUrl) : existing.imagenUrl,
      source: "coach",
    };

    await putItem(T.recipes(), updated as unknown as Record<string, unknown>);
    return response(200, updated, origin);
  } catch (err) {
    console.error("updateRecipe error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
