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
        // ID obligatorio
        const id = event.pathParameters?.id;
        if (!id)
            return (0, response_1.response)(400, { message: "Missing id" });
        // BODY
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
        if (Object.keys(body).length === 0) {
            return (0, response_1.response)(400, { message: "Nothing to update" });
        }
        // Evitar update de campos sensibles
        const forbidden = ["id", "createdAt"];
        for (const key of Object.keys(body)) {
            if (forbidden.includes(key)) {
                return (0, response_1.response)(400, { message: `Field '${key}' cannot be updated` });
            }
        }
        // Construir expresión dinámica
        const names = {};
        const values = {};
        const sets = [];
        let idx = 0;
        for (const key of Object.keys(body)) {
            idx++;
            const nk = `#k${idx}`;
            const vk = `:v${idx}`;
            names[nk] = key;
            values[vk] = body[key];
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
        const res = await dynamo_1.ddb.send(new lib_dynamodb_1.UpdateCommand({
            TableName: TABLE,
            Key: { id },
            UpdateExpression: `SET ${sets.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
        }));
        if (!res.Attributes) {
            return (0, response_1.response)(404, { message: "Ticket not found" });
        }
        return (0, response_1.response)(200, res.Attributes);
    }
    catch (err) {
        console.error("Internal error:", err);
        return (0, response_1.response)(500, { message: "Internal server error", error: String(err) });
    }
};
exports.handler = handler;
