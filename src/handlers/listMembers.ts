import { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { response } from "../helpers/response";

export const handler: APIGatewayProxyHandler = async (event) => {
  const TABLE = process.env.MEMBERS_TABLE!;
  const AUTH_TOKEN = process.env.AUTH_TOKEN!;

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return response(401, { message: "Unauthorized" });
    }

    const { Items } = await ddb.send(new ScanCommand({ TableName: TABLE }));

    return response(200, Items || []);
  } catch (err) {
    console.error(err);
    return response(500, { message: "Internal server error" });
  }
};
