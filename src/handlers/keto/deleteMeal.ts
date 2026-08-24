import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { findAndDeleteUserItem, T } from "../../data/ketoRepo";

function sharedDelete(table: () => string) {
  return async (event: Parameters<APIGatewayProxyHandler>[0]) => {
    const origin = event.headers?.Origin || event.headers?.origin;
    try {
      const auth = getAuth(event);
      if (!auth) return response(401, { message: "Unauthorized" }, origin);

      const id = event.pathParameters?.id;
      if (!id) return response(400, { message: "Missing id" }, origin);

      const deleted = await findAndDeleteUserItem(table(), auth.userId, id);
      if (!deleted) return response(404, { message: "Not found" }, origin);

      return response(200, { message: "Deleted", id }, origin);
    } catch (err) {
      console.error("deleteUserItem error:", err);
      return response(500, { message: "Internal server error" }, origin);
    }
  };
}

/** DELETE /meals/{id} — solo el dueño puede eliminar */
export const handler: APIGatewayProxyHandler = sharedDelete(T.meals);
