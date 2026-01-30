import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { response } from "../helpers/response";
import { v4 as uuidv4 } from "uuid";

export const handler: APIGatewayProxyHandler = async (event) => {
  const TABLE = process.env.PAYMENTS_TABLE!;
  const AUTH_TOKEN = process.env.AUTH_TOKEN!;

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return response(401, { message: "Unauthorized" });
    }

    if (!event.body) {
      return response(400, { message: "Body is required" });
    }

    const body = JSON.parse(event.body);

    const {
      participante,
      monto,
      tipoApuesta,
      nombreTitular,
      fechaHora,
      numeroOperacion,
      email,
      estado,
    } = body;

    if (
      !participante ||
      !monto ||
      !tipoApuesta ||
      !nombreTitular ||
      !fechaHora ||
      !numeroOperacion ||
      !email
    ) {
      return response(400, { message: "Missing required fields" });
    }

    const item = {
      id: uuidv4(),
      participante,
      monto: Number(monto),
      tipoApuesta,
      nombreTitular,
      fechaHora,
      numeroOperacion,
      email,
      estado: estado || "pendiente",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: item,
      }),
    );

    return response(201, {
      message: "Pago registrado correctamente",
      item,
    });
  } catch (err) {
    console.error("Error registering payment:", err);
    return response(500, { message: "Internal server error" });
  }
};
