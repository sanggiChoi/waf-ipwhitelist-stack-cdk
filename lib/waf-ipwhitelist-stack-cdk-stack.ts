import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as wafv2 from '@aws-cdk/aws-wafv2';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import { Construct } from '@aws-cdk/core';

export interface WafIpWhitelistProps {
  ip: string;
}

export class WafIpwhitelistStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
      super(parent, name, props);

      new WafIpwhitelistConstruct(this, 'WafIpWhitelistContruct', {
          ip: this.node.tryGetContext('ip')
      });
  }
}

class WafIpwhitelistConstruct extends Construct {
  constructor(scope: cdk.Construct, id: string, props: WafIpWhitelistProps) {
    super(scope, id);

    // Create S3 Bucket for storing static react app
    const bucket = new s3.Bucket(this, 'WebsiteBucket', {
      versioned: true,
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    new cdk.CfnOutput(this, 'Bucket', { value: bucket.bucketName });

    // Grant CloudFront read access permission to the S3 Bucket created
    const oai = new cloudfront.OriginAccessIdentity(this, 'oai');
    bucket.grantRead(oai);

    // Create IPSet for the whitelist IP
    const ipSet = new wafv2.CfnIPSet(this, 'IPSet', {
      addresses: [props.ip],
      scope: 'CLOUDFRONT',
      ipAddressVersion: 'IPV4'
    });

    // Create WAFv2 Rule IP Whitelisting
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    rules.push(
      {
        name: 'IPWhitelistRule', // Note the PascalCase for all the properties
        priority: 1,
        action: {
          allow: {}
        },
        statement: {
          ipSetReferenceStatement: {
            arn: ipSet.attrArn
          }
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'ipWhitelist',
          sampledRequestsEnabled: false,
        }
      }
    );

    const webACL = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: {
        block: {},
      },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'waf',
        sampledRequestsEnabled: false,
      },
    });
    webACL.addPropertyOverride("rules", rules);

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'CFDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: oai
          },
          behaviors : [ {isDefaultBehavior: true} ]
        }
      ],
      webACLId: webACL.attrArn
    });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'DomainName', { value: distribution.domainName });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [ s3deploy.Source.asset('./react-app') ],
      destinationBucket: bucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });
  }
}
