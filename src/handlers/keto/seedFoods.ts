import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { scanTable, batchPutItems, T } from "../../data/ketoRepo";
import { FoodItem } from "../../interfaces/keto";

/**
 * Datos iniciales del catálogo de alimentos keto.
 */
const SEED_FOODS: Omit<FoodItem, "foodId">[] = [
  // Proteínas
  { nombre: "Carne de res", unidad: "g", categoria: "proteina" },
  { nombre: "Bistec", unidad: "g", categoria: "proteina" },
  { nombre: "Carne molida", unidad: "g", categoria: "proteina" },
  { nombre: "Lomo de res", unidad: "g", categoria: "proteina" },
  { nombre: "Cerdo", unidad: "g", categoria: "proteina" },
  { nombre: "Lomo de cerdo", unidad: "g", categoria: "proteina" },
  { nombre: "Chuleta de cerdo", unidad: "g", categoria: "proteina" },
  { nombre: "Chicharrón", unidad: "g", categoria: "proteina" },
  { nombre: "Piel de cerdo", unidad: "g", categoria: "proteina" },
  { nombre: "Pollo", unidad: "g", categoria: "proteina" },
  { nombre: "Pechuga de pollo", unidad: "g", categoria: "proteina" },
  { nombre: "Muslo de pollo", unidad: "g", categoria: "proteina" },
  { nombre: "Pescado", unidad: "g", categoria: "proteina" },
  { nombre: "Atún", unidad: "g", categoria: "proteina" },
  { nombre: "Salmón", unidad: "g", categoria: "proteina" },
  { nombre: "Sardina", unidad: "g", categoria: "proteina" },
  { nombre: "Mariscos", unidad: "g", categoria: "proteina" },
  // Lácteos y huevos
  { nombre: "Huevo", unidad: "und", equivalenciaGramos: 50, categoria: "lacteo" },
  { nombre: "Queso fresco", unidad: "g", categoria: "lacteo" },
  { nombre: "Queso mozzarella", unidad: "g", categoria: "lacteo" },
  { nombre: "Queso parmesano", unidad: "g", categoria: "lacteo" },
  { nombre: "Queso tipo amarillo", unidad: "g", categoria: "lacteo" },
  { nombre: "Mantequilla", unidad: "g", categoria: "lacteo" },
  // Grasas
  { nombre: "Palta", unidad: "und", equivalenciaGramos: 150, categoria: "grasa" },
  { nombre: "Aceitunas verdes", unidad: "g", categoria: "grasa" },
  { nombre: "Aceitunas negras", unidad: "g", categoria: "grasa" },
  // Verduras
  { nombre: "Lechuga", unidad: "g", categoria: "verdura" },
  { nombre: "Espinaca", unidad: "g", categoria: "verdura" },
  { nombre: "Brócoli", unidad: "g", categoria: "verdura" },
  { nombre: "Coliflor", unidad: "g", categoria: "verdura" },
  { nombre: "Pepino", unidad: "g", categoria: "verdura" },
  { nombre: "Zucchini", unidad: "g", categoria: "verdura" },
  { nombre: "Apio", unidad: "g", categoria: "verdura" },
  { nombre: "Espárragos", unidad: "g", categoria: "verdura" },
  { nombre: "Champiñones", unidad: "g", categoria: "verdura" },
  { nombre: "Tomate", unidad: "g", categoria: "verdura" },
  { nombre: "Cebolla", unidad: "g", categoria: "verdura" },
  { nombre: "Pimiento", unidad: "g", categoria: "verdura" },
  // Frutos secos
  { nombre: "Almendras", unidad: "g", categoria: "fruto_seco" },
  { nombre: "Nueces", unidad: "g", categoria: "fruto_seco" },
  { nombre: "Pecanas", unidad: "g", categoria: "fruto_seco" },
  { nombre: "Maní", unidad: "g", categoria: "fruto_seco" },
  { nombre: "Macadamias", unidad: "g", categoria: "fruto_seco" },
  // Semillas
  { nombre: "Chía", unidad: "g", categoria: "semilla" },
  { nombre: "Linaza", unidad: "g", categoria: "semilla" },
];

/**
 * POST /foods/seed — insertar catálogo inicial (solo coach).
 * Solo inserta alimentos que no existan (por nombre).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    // Verificar si ya existen alimentos
    const existing = await scanTable<FoodItem>(T.foods(), 500);
    const existingNames = new Set(existing.map((f) => f.nombre.toLowerCase()));

    const toInsert = SEED_FOODS.filter(
      (f) => !existingNames.has(f.nombre.toLowerCase()),
    ).map((f) => ({
      ...f,
      foodId: uuidv4(),
    }));

    if (toInsert.length === 0) {
      return response(200, { message: "El catálogo ya está poblado", inserted: 0 }, origin);
    }

    await batchPutItems(T.foods(), toInsert as unknown as Record<string, unknown>[]);

    return response(201, { message: "Catálogo insertado", inserted: toInsert.length }, origin);
  } catch (err) {
    console.error("seedFoods error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
