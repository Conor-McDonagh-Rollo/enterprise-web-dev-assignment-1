import * as cdk from "aws-cdk-lib/core";
import { Template } from "aws-cdk-lib/assertions";
import { Assignment1Stack } from "../lib/assignment1-stack";

test("SSM Parameter is created with correct properties", () => {
  const app = new cdk.App();
  const stack = new Assignment1Stack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::SSM::Parameter", {
    Name: "/assignment1/hello",
    Value: "Hello from CDK!",
    Type: "String",
  });
});
