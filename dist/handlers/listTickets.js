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
        // Escanear tabla
        console.log("Scanning tickets table...");
        const res = await dynamo_1.ddb.send(new lib_dynamodb_1.ScanCommand({ TableName: TABLE }));
        return (0, response_1.response)(200, {
            items: res.Items ?? [],
            count: res.Count ?? 0,
        });
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
