import { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
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

    // Escanear tabla
    console.log("Scanning tickets table...");
    const res = await ddb.send(new ScanCommand({ TableName: TABLE }));

    return response(200, {
      items: res.Items ?? [],
      count: res.Count ?? 0,
    });
  } catch (err) {
    console.error("Internal error:", err);
    return response(500, {
      message: "Internal server error",
      error: String(err),
    });
  }
};
