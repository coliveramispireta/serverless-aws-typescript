"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_1 = require("../lib/dynamo");
const uuid_1 = require("uuid");
const response_1 = require("../helpers/response");
const requiredFields = [
    "passengerName",
    "flightNumber",
    "origin",
    "destination",
    "seatNumber",
    "price",
];
const handler = async (event) => {
    const TABLE = process.env.TABLE_NAME;
    const AUTH_TOKEN = process.env.AUTH_TOKEN;
    console.log("AUTH_TOKEN:", AUTH_TOKEN);
    console.log("Incoming event:", JSON.stringify(event));
    try {
        //  AUTORIZACION
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
            console.warn("Unauthorized request: missing/invalid token");
            return (0, response_1.response)(401, { message: "Unauthorized" });
        }
        //  BODY
        if (!event.body) {
            return (0, response_1.response)(400, { message: "Missing request body" });
        }
        let body;
        try {
            body = JSON.parse(event.body);
        }
        catch (err) {
            console.error("Invalid JSON body:", err);
            return (0, response_1.response)(400, { message: "Invalid JSON" });
        }
        //  VALIDACIÓN DE CAMPOS
        const missingFields = requiredFields.filter((f) => !body[f]);
        if (missingFields.length > 0) {
            console.warn("Missing required fields:", missingFields);
            return (0, response_1.response)(400, { message: "Missing fields", fields: missingFields });
        }
        //  CREAR ITEM
        const now = new Date().toISOString();
        const item = {
            id: (0, uuid_1.v4)(),
            passengerName: body.passengerName,
            flightNumber: body.flightNumber,
            origin: body.origin,
            destination: body.destination,
            seatNumber: body.seatNumber,
            price: body.price,
            status: body.status || "booked",
            createdAt: now,
            updatedAt: now,
        };
        //  GUARDAR EN DYNAMODB
        console.log("Saving item to DynamoDB:", { ...item, price: "***" });
        await dynamo_1.ddb.send(new lib_dynamodb_1.PutCommand({ TableName: TABLE, Item: item }));
        return (0, response_1.response)(201, item);
    }
    catch (err) {
        console.error("Internal error:", err);
        return (0, response_1.response)(500, { message: "Internal server error", error: String(err) });
    }
};
exports.handler = handler;
