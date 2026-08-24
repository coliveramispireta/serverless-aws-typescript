import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryByUser, T } from "../../data/ketoRepo";
import { AchievementItem } from "../../interfaces/keto";

/** GET /achievements — logros persistidos del usuario (auto sincronizados + coach) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    // SK=codigo → orden alfabético; el front decide cómo presentarlos
    const items = await queryByUser<AchievementItem>(T.achievements(), auth.userId, {
      ascending: true,
      limit: 100,
    });
    return response(200, items, origin);
  } catch (err) {
    console.error("listAchievements error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
