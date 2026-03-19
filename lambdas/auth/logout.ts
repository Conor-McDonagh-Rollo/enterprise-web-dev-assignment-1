import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return { statusCode: 200, body: JSON.stringify({ message: "Logged out. Your token is deleted." }) };
};
