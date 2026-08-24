import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { ddb } from "../../lib/dynamo";
import { T } from "../../data/ketoRepo";

/**
 * DELETE /notifications/subscriptions
 * Elimina la suscripción push de un dispositivo. Body: { endpoint }
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);
    let body: { endpoint?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    if (!body.endpoint || !String(body.endpoint).startsWith("http")) {
      return response(400, { message: "endpoint requerido" }, origin);
    }

    await ddb.send(
      new DeleteCommand({
        TableName: T.pushsubs(),
        Key: { userId: auth.userId, endpoint: String(body.endpoint) },
      }),
    );

    return response(200, { message: "Unsubscribed" }, origin);
  } catch (err) {
    console.error("deletePushSubscription error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
