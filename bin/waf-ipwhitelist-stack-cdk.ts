#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { WafIpwhitelistStackCdkStack } from '../lib/waf-ipwhitelist-stack-cdk-stack';

const app = new cdk.App();
new WafIpwhitelistStackCdkStack(app, 'WafIpwhitelistStackCdkStack');
