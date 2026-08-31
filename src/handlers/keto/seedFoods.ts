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
  { nombre: "Carne de res", unidad: "g", categoria: "proteina", emoji: "🥩" },
  { nombre: "Bistec", unidad: "g", categoria: "proteina", emoji: "🥩" },
  { nombre: "Carne molida", unidad: "g", categoria: "proteina", emoji: "🥩" },
  { nombre: "Lomo de res", unidad: "g", categoria: "proteina", emoji: "🥩" },
  { nombre: "Cerdo", unidad: "g", categoria: "proteina", emoji: "🐷" },
  { nombre: "Lomo de cerdo", unidad: "g", categoria: "proteina", emoji: "🐷" },
  { nombre: "Chuleta de cerdo", unidad: "g", categoria: "proteina", emoji: "🐷" },
  { nombre: "Chicharrón", unidad: "g", categoria: "proteina", emoji: "🍖" },
  { nombre: "Piel de cerdo", unidad: "g", categoria: "proteina", emoji: "🍖" },
  { nombre: "Pollo", unidad: "g", categoria: "proteina", emoji: "🍗" },
  { nombre: "Pechuga de pollo", unidad: "g", categoria: "proteina", emoji: "🍗" },
  { nombre: "Muslo de pollo", unidad: "g", categoria: "proteina", emoji: "🍗" },
  { nombre: "Pescado", unidad: "g", categoria: "proteina", emoji: "🐟" },
  { nombre: "Atún", unidad: "g", categoria: "proteina", emoji: "🐟" },
  { nombre: "Salmón", unidad: "g", categoria: "proteina", emoji: "🍣" },
  { nombre: "Sardina", unidad: "g", categoria: "proteina", emoji: "🐟" },
  { nombre: "Mariscos", unidad: "g", categoria: "proteina", emoji: "🦐" },
  // Lácteos y huevos
  { nombre: "Huevo", unidad: "und", equivalenciaGramos: 50, categoria: "lacteo", emoji: "🥚" },
  { nombre: "Queso fresco", unidad: "g", categoria: "lacteo", emoji: "🧀" },
  { nombre: "Queso mozzarella", unidad: "g", categoria: "lacteo", emoji: "🧀" },
  { nombre: "Queso parmesano", unidad: "g", categoria: "lacteo", emoji: "🧀" },
  { nombre: "Queso tipo amarillo", unidad: "g", categoria: "lacteo", emoji: "🧀" },
  { nombre: "Mantequilla", unidad: "g", categoria: "lacteo", emoji: "🧈" },
  // Grasas
  { nombre: "Palta", unidad: "und", equivalenciaGramos: 150, categoria: "grasa", emoji: "🥑" },
  { nombre: "Aceitunas verdes", unidad: "g", categoria: "grasa", emoji: "🫒" },
  { nombre: "Aceitunas negras", unidad: "g", categoria: "grasa", emoji: "🫒" },
  // Verduras
  { nombre: "Lechuga", unidad: "g", categoria: "verdura", emoji: "🥬" },
  { nombre: "Espinaca", unidad: "g", categoria: "verdura", emoji: "🥬" },
  { nombre: "Brócoli", unidad: "g", categoria: "verdura", emoji: "🥦" },
  { nombre: "Coliflor", unidad: "g", categoria: "verdura", emoji: "🥦" },
  { nombre: "Pepino", unidad: "g", categoria: "verdura", emoji: "🥒" },
  { nombre: "Zucchini", unidad: "g", categoria: "verdura", emoji: "🥒" },
  { nombre: "Apio", unidad: "g", categoria: "verdura", emoji: "🥬" },
  { nombre: "Espárragos", unidad: "g", categoria: "verdura", emoji: "🌱" },
  { nombre: "Champiñones", unidad: "g", categoria: "verdura", emoji: "🍄" },
  { nombre: "Tomate", unidad: "g", categoria: "verdura", emoji: "🍅" },
  { nombre: "Cebolla", unidad: "g", categoria: "verdura", emoji: "🧅" },
  { nombre: "Pimiento", unidad: "g", categoria: "verdura", emoji: "🫑" },
  // Frutos secos
  { nombre: "Almendras", unidad: "g", categoria: "fruto_seco", emoji: "🥜" },
  { nombre: "Nueces", unidad: "g", categoria: "fruto_seco", emoji: "🌰" },
  { nombre: "Pecanas", unidad: "g", categoria: "fruto_seco", emoji: "🌰" },
  { nombre: "Maní", unidad: "g", categoria: "fruto_seco", emoji: "🥜" },
  { nombre: "Macadamias", unidad: "g", categoria: "fruto_seco", emoji: "🌰" },
  // Semillas
  { nombre: "Chía", unidad: "g", categoria: "semilla", emoji: "🌱" },
  { nombre: "Linaza", unidad: "g", categoria: "semilla", emoji: "🌱" },
  // Alimentos no KETO (altos en carbohidratos)
  { nombre: "Pan blanco", unidad: "g", categoria: "no_keto", emoji: "🍞" },
  { nombre: "Pan francés", unidad: "g", categoria: "no_keto", emoji: "🥖" },
  { nombre: "Pan de molde", unidad: "g", categoria: "no_keto", emoji: "🍞" },
  { nombre: "Petipán", unidad: "und", equivalenciaGramos: 60, categoria: "no_keto", emoji: "🍞" },
  { nombre: "Tortilla de trigo", unidad: "und", equivalenciaGramos: 30, categoria: "no_keto", emoji: "🌮" },
  { nombre: "Oblea de arroz", unidad: "und", equivalenciaGramos: 10, categoria: "no_keto", emoji: "🍘" },
  { nombre: "Arroz blanco", unidad: "g", categoria: "no_keto", emoji: "🍚" },
  { nombre: "Fideos", unidad: "g", categoria: "no_keto", emoji: "🍜" },
  { nombre: "Papa", unidad: "g", categoria: "no_keto", emoji: "🥔" },
  { nombre: "Camote", unidad: "g", categoria: "no_keto", emoji: "🍠" },
  { nombre: "Yuca", unidad: "g", categoria: "no_keto", emoji: "🥔" },
  { nombre: "Choclo", unidad: "und", equivalenciaGramos: 200, categoria: "no_keto", emoji: "🌽" },
  { nombre: "Cancha", unidad: "g", categoria: "no_keto", emoji: "🌽" },
  { nombre: "Azúcar", unidad: "g", categoria: "no_keto", emoji: "🍬" },
  { nombre: "Miel", unidad: "g", categoria: "no_keto", emoji: "🍯" },
  { nombre: "Gaseosa", unidad: "ml", categoria: "no_keto", emoji: "🥤" },
  { nombre: "Cerveza", unidad: "ml", categoria: "no_keto", emoji: "🍺" },
  { nombre: "Jugo de frutas con azúcar", unidad: "ml", categoria: "no_keto", emoji: "🧃" },
  { nombre: "Helado", unidad: "g", categoria: "no_keto", emoji: "🍨" },
  { nombre: "Galletas", unidad: "g", categoria: "no_keto", emoji: "🍪" },
  { nombre: "Torta", unidad: "g", categoria: "no_keto", emoji: "🍰" },
  { nombre: "Pan de hamburguesa", unidad: "und", equivalenciaGramos: 70, categoria: "no_keto", emoji: "🍔" },
  { nombre: "Pan de hot dog", unidad: "und", equivalenciaGramos: 60, categoria: "no_keto", emoji: "🌭" },
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
