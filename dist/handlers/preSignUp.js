"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    try {
        console.log("Incoming PreSignUp event:", JSON.stringify(event, null, 2));
        const attributes = event.request?.userAttributes || {};
        // Autoconfirmar usuario
        event.response.autoConfirmUser = true;
        // Autoverificar email si existe
        if (attributes.email) {
            event.response.autoVerifyEmail = true;
        }
        console.log("Modified event response:", JSON.stringify(event.response, null, 2));
        return event;
    }
    catch (err) {
        console.error("Error en PreSignUp Lambda:", err);
        throw new Error("Internal error during PreSignUp trigger");
    }
};
exports.handler = handler;
