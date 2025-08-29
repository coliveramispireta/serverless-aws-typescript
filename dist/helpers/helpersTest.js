"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.setup = setup;
// Devuelve un event simulado para Lambda
function createEvent(body = {}, token = "test-token", pathId) {
    return {
        headers: {
            authorization: `Bearer ${token}`,
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        pathParameters: pathId ? { id: pathId } : undefined,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        queryStringParameters: null,
        path: "/dummy",
        httpMethod: "POST",
        isBase64Encoded: false,
        stageVariables: null,
        requestContext: {},
        resource: "",
    };
}
// Devuelve context y callback simulados
function setup() {
    const context = {};
    const callback = {};
    return { context, callback };
}
