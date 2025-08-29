import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo";
import { v4 as uuidv4 } from "uuid";
import { Ticket } from "../interfaces/Ticket";
import { response } from "../helpers/response";

const requiredFields: (keyof Ticket)[] = [
  "passengerName",
  "flightNumber",
  "origin",
  "destination",
  "seatNumber",
  "price",
];

export const handler: APIGatewayProxyHandler = async (event) => {
  const TABLE = process.env.TABLE_NAME!;
  const AUTH_TOKEN = process.env.AUTH_TOKEN!;
  console.log("AUTH_TOKEN:", AUTH_TOKEN);
  console.log("Incoming event:", JSON.stringify(event));

  try {
    //  AUTORIZACION
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      console.warn("Unauthorized request: missing/invalid token");
      return response(401, { message: "Unauthorized" });
    }

    //  BODY
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

    //  VALIDACIÓN DE CAMPOS
    const missingFields = requiredFields.filter((f) => !body[f]);
    if (missingFields.length > 0) {
      console.warn("Missing required fields:", missingFields);
      return response(400, { message: "Missing fields", fields: missingFields });
    }

    //  CREAR ITEM
    const now = new Date().toISOString();
    const item: Ticket = {
      id: uuidv4(),
      passengerName: body.passengerName!,
      flightNumber: body.flightNumber!,
      origin: body.origin!,
      destination: body.destination!,
      seatNumber: body.seatNumber!,
      price: body.price!,
      status: body.status || "booked",
      createdAt: now,
      updatedAt: now,
    };

    //  GUARDAR EN DYNAMODB
    console.log("Saving item to DynamoDB:", { ...item, price: "***" });
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));

    return response(201, item);
  } catch (err) {
    console.error("Internal error:", err);
    return response(500, { message: "Internal server error", error: String(err) });
  }
};
