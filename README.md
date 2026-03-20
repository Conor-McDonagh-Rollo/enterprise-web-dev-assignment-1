## Enterprise Web Development - Serverless REST Assignment.

__Name:__ Conor McDonagh Rollo

### Links.

__Demo:__ https://youtu.be/mb0BOnr6Rr4

### Screenshots.

![API Gateway console showing the deployed Movie Reviews and Auth APIs][api]

![DynamoDB console showing the reviews, users, and invalidated tokens tables][db]

###  Implementation Highlights (If relevant).

LSI on the date attribute of the reviews table allows the `GET /reviews?movie=&published=` endpoint to use `begins_with` as a key condition rather than a filter.

API Gateway request validators are applied to the POST and PUT endpoints so they reject requests with missing or incorrectly typed fields before they reach Lambda, meaning invalid requests never invoke a Lambda function and are returned a 400 by API Gateway itself.

Rather than using Cognito for authentication, I chose to implement JWT authentication using the jsonwebtoken library. It works by: on login, a signed JWT is issued with a 1 hour expiry and returned to the client. This token is then passed in the `Authorization: Bearer` header on the protected requests (POST and PUT), where a Lambda Authorizer validates the signature before allowing the request through to the actual Lambda function.

Password security is handled using bcrypt, which hashes passwords (with a salt factor of 10) before storing them in DynamoDB. Token invalidation on logout is handled with a dedicated DynamoDB table that acts as a blocklist so logged out tokens are written to it with a TTL matching the token's expiry, so they get cleaned up as needed.

For API testing, I made a small Python tool with TKinter and the request library. Information on how to run it are in `/api test/README.md`. I preferred this to Postman as it helped me tailor the API to an actual GUI instead of reading and writing requests in the terminal.

[api]: ./images/api-console.png
[db]: ./images/dynamodb.png
