import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { getItem, T } from "../../data/ketoRepo";
import { ddb } from "../../lib/dynamo";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { FoodItem } from "../../interfaces/keto";

/**
 * DELETE /foods/{foodId} — eliminar alimento del catálogo (solo coach).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const foodId = event.pathParameters?.foodId;
    if (!foodId) return response(400, { message: "Missing foodId" }, origin);

    const existing = await getItem<FoodItem>(
      process.env.KETO_FOODS_TABLE!,
      { foodId },
    );
    if (!existing) return response(404, { message: "Alimento no encontrado" }, origin);

    await ddb.send(
      new DeleteCommand({
        TableName: process.env.KETO_FOODS_TABLE!,
        Key: { foodId },
      }),
    );

    return response(200, { message: "Deleted", foodId }, origin);
  } catch (err) {
    console.error("deleteFood error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
