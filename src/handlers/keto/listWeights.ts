import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { presignDownload } from "../../helpers/s3";
import { queryByUser, T } from "../../data/ketoRepo";
import { WeightEntryItem } from "../../interfaces/keto";

/** Convierte la clave S3 de evidencia en URL firmada temporal */
async function withSignedEvidence(weights: WeightEntryItem[]): Promise<WeightEntryItem[]> {
  return Promise.all(
    weights.map(async (w) => ({
      ...w,
      evidenciaFotoUrl: w.evidenciaKey ? await presignDownload(w.evidenciaKey) : undefined,
    })),
  );
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const weights = await queryByUser<WeightEntryItem>(T.weights(), auth.userId, { limit: 500 });
    const signed = await withSignedEvidence(weights);
    return response(200, signed, origin);
  } catch (err) {
    console.error("listWeights error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};

export { withSignedEvidence };
