import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { hasValue } from "../../helpers/values";
import { putItem, T } from "../../data/ketoRepo";
import { RecipeItem } from "../../interfaces/keto";

/** POST /recipes — solo coach */
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

    const missing: string[] = [];
    if (!body.titulo || typeof body.titulo !== "string") missing.push("titulo");
    if (!Array.isArray(body.ingredientes)) missing.push("ingredientes");
    if (missing.length > 0) {
      return response(400, { message: "Missing fields", fields: missing }, origin);
    }

    const recipe: RecipeItem = {
      recipeId: uuidv4(),
      titulo: String(body.titulo).trim(),
      descripcion: hasValue(body.descripcion) ? String(body.descripcion) : undefined,
      ingredientes: (body.ingredientes as unknown[]).map(String),
      pasos: Array.isArray(body.pasos) ? (body.pasos as unknown[]).map(String) : undefined,
      minutosPreparacion: hasValue(body.minutosPreparacion)
        ? Number(body.minutosPreparacion)
        : undefined,
      porciones: hasValue(body.porciones) ? Number(body.porciones) : undefined,
      carbohidratosNetosPorPorcion: hasValue(body.carbohidratosNetosPorPorcion)
        ? Number(body.carbohidratosNetosPorPorcion)
        : undefined,
      imagenUrl: hasValue(body.imagenUrl) ? String(body.imagenUrl) : undefined,
      source: "coach",
      creadaPor: auth.userId,
      fechaCreacion: new Date().toISOString(),
    };

    await putItem(T.recipes(), recipe as unknown as Record<string, unknown>);
    return response(201, recipe, origin);
  } catch (err) {
    console.error("createRecipe error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
