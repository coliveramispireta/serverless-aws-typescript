"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_1 = require("../lib/dynamo");
const response_1 = require("../helpers/response");
const handler = async (event) => {
    const TABLE = process.env.TABLE_NAME;
    const AUTH_TOKEN = process.env.AUTH_TOKEN;
    console.log("Incoming event:", JSON.stringify(event));
    try {
        //  AUTORIZACION
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
            console.warn("Unauthorized request: missing/invalid token");
            return (0, response_1.response)(401, { message: "Unauthorized" });
        }
        // Validar ID
        const id = event.pathParameters?.id;
        if (!id) {
            return (0, response_1.response)(400, { message: "Missing id" });
        }
        // Obtener item
        console.log(`Fetching ticket with id=${id}`);
        const { Item } = await dynamo_1.ddb.send(new lib_dynamodb_1.GetCommand({ TableName: TABLE, Key: { id } }));
        if (!Item) {
            console.warn(`Ticket not found: id=${id}`);
            return (0, response_1.response)(404, { message: "Ticket not found" });
        }
        console.log("Ticket fetched successfully:", { id });
        return (0, response_1.response)(200, Item);
    }
    catch (err) {
        console.error("Internal error:", err);
        return (0, response_1.response)(500, {
            message: "Internal server error",
            error: String(err),
        });
    }
};
exports.handler = handler;
