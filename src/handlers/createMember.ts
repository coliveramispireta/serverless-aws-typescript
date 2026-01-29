import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { v4 as uuidv4 } from "uuid";
import { Participante } from "../interfaces/Participante";
import { response } from "../helpers/response";

const requiredFields: (keyof Omit<Participante, "id" | "createdAt" | "updatedAt">)[] = [
  "email",
  "nombreCompleto",
  "edad",
  "pesoInicial",
  "pesoActual",
  "sexo",
  "talla",
  "anchoMuneca",
  "pesoIdeal",
];

export const handler: APIGatewayProxyHandler = async (event) => {
  const TABLE = process.env.TABLE_NAME!;
  const AUTH_TOKEN = process.env.AUTH_TOKEN!;

  try {
    // 🔐 Auth
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return response(401, { message: "Unauthorized" });
    }

    if (!event.body) {
      return response(400, { message: "Missing body" });
    }

    const body = JSON.parse(event.body);

    const missingFields = requiredFields.filter((f) => !body[f]);
    if (missingFields.length > 0) {
      return response(400, { message: "Missing fields", fields: missingFields });
    }

    const pesoInicial = Number(body.pesoInicial);
    const pesoActual = Number(body.pesoActual);

    if (pesoInicial !== pesoActual) {
      return response(400, {
        message: "pesoInicial must be equal to pesoActual on registration",
      });
    }

    const now = new Date().toISOString();

    const item: Participante = {
      id: uuidv4(),
      email: body.email,
      nombreCompleto: body.nombreCompleto,
      edad: Number(body.edad),
      pesoInicial: Number(body.pesoInicial),
      pesoActual: Number(body.pesoActual),
      sexo: body.sexo,
      talla: Number(body.talla),
      anchoMuneca: Number(body.anchoMuneca),
      pesoIdeal: Number(body.pesoIdeal),
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: item,
      }),
    );

    return response(201, item);
  } catch (err) {
    console.error(err);
    return response(500, { message: "Internal server error" });
  }
};
