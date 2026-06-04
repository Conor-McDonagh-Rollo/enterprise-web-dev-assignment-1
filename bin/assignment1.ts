#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { Assignment1Stack } from "../lib/assignment1-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();
new Assignment1Stack(app, "Assignment1Stack");
new FrontendStack(app, "FrontendStack");
