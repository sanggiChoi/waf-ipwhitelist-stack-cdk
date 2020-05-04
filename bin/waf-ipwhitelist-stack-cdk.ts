#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as stack from '../lib/waf-ipwhitelist-stack-cdk-stack';

const app = new cdk.App();
new stack.WafIpwhitelistStack(app, 'WafIpwhitelistStack', {
    env: {
        region: 'us-east-1'
    }
});
