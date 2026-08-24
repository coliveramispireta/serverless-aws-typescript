import { APIGatewayProxyHandler } from "aws-lambda";
import { response } from "../../helpers/response";
import { getAuth } from "../../helpers/auth";
import { queryGsi, T } from "../../data/ketoRepo";
import { PostItem } from "../../interfaces/keto";

/** GET /posts — feed global (más recientes primero, máx. 50) */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.Origin || event.headers?.origin;
  try {
    const auth = getAuth(event);
    if (!auth) return response(401, { message: "Unauthorized" }, origin);

    const posts = await queryGsi<PostItem>(T.posts(), "gsi1pk", "FEED", "gsi1sk", {
      limit: 50,
      ascending: false,
    });
    return response(200, posts, origin);
  } catch (err) {
    console.error("listPosts error:", err);
    return response(500, { message: "Internal server error" }, origin);
  }
};
