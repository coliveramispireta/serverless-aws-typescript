import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { response } from "../../helpers/response";
import { getAuth, isCoach } from "../../helpers/auth";
import { ddb } from "../../lib/dynamo";
import { T } from "../../data/ketoRepo";

/** DELETE /recipes/{id} — solo coach */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);
    if (!isCoach(auth)) return response(403, { message: "Forbidden: solo el coach" }, origin);

    const recipeId = event.pathParameters?.id;
    if (!recipeId) return response(400, { message: "Missing id" }, origin);

    await ddb.send(new DeleteCommand({ TableName: T.recipes(), Key: { recipeId } }));
    return response(200, { message: "Deleted", recipeId }, origin);
  } catch (err) {
    console.error("deleteRecipe error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
