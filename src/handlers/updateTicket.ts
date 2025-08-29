import { APIGatewayProxyHandler } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { response } from "../helpers/response";
import { Ticket } from "../interfaces/Ticket";

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

    // ID obligatorio
    const id = event.pathParameters?.id;
    if (!id) return response(400, { message: "Missing id" });

    // BODY
    if (!event.body) {
      return response(400, { message: "Missing request body" });
    }

    let body: Partial<Ticket>;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      console.error("Invalid JSON body:", err);
      return response(400, { message: "Invalid JSON" });
    }

    if (Object.keys(body).length === 0) {
      return response(400, { message: "Nothing to update" });
    }

    // Evitar update de campos sensibles
    const forbidden = ["id", "createdAt"];
    for (const key of Object.keys(body)) {
      if (forbidden.includes(key)) {
        return response(400, { message: `Field '${key}' cannot be updated` });
      }
    }

    // Construir expresión dinámica
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const sets: string[] = [];
    let idx = 0;

    for (const key of Object.keys(body)) {
      idx++;
      const nk = `#k${idx}`;
      const vk = `:v${idx}`;
      names[nk] = key;
      values[vk] = (body as any)[key];
      sets.push(`${nk} = ${vk}`);
    }

    // siempre actualizar updatedAt
    idx++;
    const nk = `#k${idx}`;
    const vk = `:v${idx}`;
    names[nk] = "updatedAt";
    values[vk] = new Date().toISOString();
    sets.push(`${nk} = ${vk}`);

    console.log("Updating ticket:", { id, updates: body });

    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );

    if (!res.Attributes) {
      return response(404, { message: "Ticket not found" });
    }

    return response(200, res.Attributes);
  } catch (err) {
    console.error("Internal error:", err);
    return response(500, { message: "Internal server error", error: String(err) });
  }
};
