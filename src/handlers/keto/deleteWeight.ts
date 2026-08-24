import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { findAndDeleteUserItem, T } from "../../data/ketoRepo";

/** DELETE /weights/{id} — solo el dueño puede eliminar */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const id = event.pathParameters?.id;
    if (!id) return response(400, { message: "Missing id" }, origin);

    const deleted = await findAndDeleteUserItem(T.weights(), auth.userId, id);
    if (!deleted) return response(404, { message: "Not found" }, origin);

    return response(200, { message: "Deleted", id }, origin);
  } catch (err) {
    console.error("deleteWeight error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
