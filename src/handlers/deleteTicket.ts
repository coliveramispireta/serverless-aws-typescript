import { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { response } from "../helpers/response";

export const handler: APIGatewayProxyHandler = async (event) => {
  const TABLE = process.env.TABLE_NAME!;
  const AUTH_TOKEN = process.env.AUTH_TOKEN!;
  console.log("Incoming event:", JSON.stringify(event));

  try {
    //  AUTORIZACION
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      console.warn("Unauthorized request: missing/invalid token");
      return response(401, { message: "Unauthorized" });
    }

    // Validar ID
    const id = event.pathParameters?.id;
    if (!id) {
      return response(400, { message: "Missing id" });
    }

    // Ejecutar delete
    console.log(`Deleting item with id=${id}`);
    const res = await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { id },
        ReturnValues: "ALL_OLD",
      }),
    );

    if (!res.Attributes) {
      console.warn(`Ticket not found: id=${id}`);
      return response(404, { message: "Ticket not found" });
    }

    console.log("Item deleted successfully:", { id });
    return response(200, res.Attributes);
  } catch (err) {
    console.error("Internal error:", err);
    return response(500, {
      message: "Internal server error",
      error: String(err),
    });
  }
};
