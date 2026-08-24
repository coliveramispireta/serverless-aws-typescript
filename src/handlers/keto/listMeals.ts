import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryByUser, T } from "../../data/ketoRepo";
import { MealEntryItem } from "../../interfaces/keto";

export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const meals = await queryByUser<MealEntryItem>(T.meals(), auth.userId, { limit: 500 });
    return response(200, meals, origin);
  } catch (err) {
    console.error("listMeals error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
