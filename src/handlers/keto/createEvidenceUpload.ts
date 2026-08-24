import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { evidenceKey, presignUpload } from "../../helpers/s3";
import { queryByUser, updateItemFields, T } from "../../data/ketoRepo";
import { WeightEntryItem } from "../../interfaces/keto";

/**
 * POST /weights/{weightId}/evidence
 * Devuelve una URL prefirmada para subir la foto y guarda la clave en el registro.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const weightId = event.pathParameters?.weightId;
    if (!weightId) return response(400, { message: "Missing weightId" }, origin);

    if (!event.body) return response(400, { message: "Missing request body" }, origin);
    let body: { fileName?: string; contentType?: string };
    try {
      body = JSON.parse(event.body);
    } catch {
      return response(400, { message: "Invalid JSON" }, origin);
    }

    if (!body.fileName || !body.contentType?.startsWith("image/")) {
      return response(400, { message: "fileName y contentType de imagen son requeridos" }, origin);
    }

    // Verificar propiedad del registro
    const items = await queryByUser<WeightEntryItem>(T.weights(), auth.userId, { limit: 500 });
    const weight = items.find((w) => w.id === weightId);
    if (!weight) return response(404, { message: "Weight not found" }, origin);

    const key = evidenceKey(auth.userId, weight.id, body.fileName);
    const uploadUrl = await presignUpload(key, body.contentType);

    // Persistir la clave sobre el item correcto (clave compuesta)
    await updateItemFields(
      T.weights(),
      { userId: auth.userId, fechaHora: weight.fechaHora },
      {
        evidenciaKey: key,
      },
    );

    return response(201, { uploadUrl, evidenciaFotoUrl: key }, origin);
  } catch (err) {
    console.error("createEvidenceUpload error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
