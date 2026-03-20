import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import * as jwt from "jsonwebtoken";

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken?.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

    // check if token has been invalidated by logout
    const blocked = await docClient.send(new GetCommand({
      TableName: process.env.INVALIDATED_TOKENS_TABLE,
      Key: { token },
    }));

    if (blocked.Item) {
      return buildPolicy("unauthorized", "Deny", event.methodArn);
    }

    return buildPolicy(decoded.userId, "Allow", event.methodArn);
  } catch {
    return buildPolicy("unauthorized", "Deny", event.methodArn);
  }
};

function buildPolicy(principalId: string, effect: "Allow" | "Deny", resource: string): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{ Action: "execute-api:Invoke", Effect: effect, Resource: resource }],
    },
  };
}
