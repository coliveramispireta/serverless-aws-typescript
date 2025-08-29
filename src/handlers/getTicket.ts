import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
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

    // Obtener item
    console.log(`Fetching ticket with id=${id}`);
    const { Item } = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));

    if (!Item) {
      console.warn(`Ticket not found: id=${id}`);
      return response(404, { message: "Ticket not found" });
    }

    console.log("Ticket fetched successfully:", { id });
    return response(200, Item);
  } catch (err) {
    console.error("Internal error:", err);
    return response(500, {
      message: "Internal server error",
      error: String(err),
    });
  }
};
