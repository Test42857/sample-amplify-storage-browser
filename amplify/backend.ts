import { defineBackend } from '@aws-amplify/backend';
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { auth } from './auth/resource';

// Define the backend with just auth and data resources
const backend = defineBackend({
  auth,
});


const customBucketStack = backend.createStack("custom-bucket-stack");

// Import existing bucket
const customBucket = Bucket.fromBucketAttributes(customBucketStack, "MyCustomBucket", {
  bucketArn: `arn:aws:s3:::baff-demo-storage-browser-test2`,
  region: "us-east-1"
});

// Add storage configuration directly without using CDK constructs
backend.addOutput({
  storage: {
    aws_region: "us-east-1",
    bucket_name: "baff-demo-storage-browser-test2",
    buckets: [
      {
        aws_region: "us-east-1",
        bucket_name: "baff-demo-storage-browser-test2",
        name: "baff-demo-storage-browser-test2",
        paths: {
          "public/*": {
            guest: ["get", "list"],
          },
          "admin/*": {
            authenticated: ["get", "list"],
            groupsadmin: ["get", "list", "write", "delete"],
          },
        },
      }
    ]
  },
});

const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject", "s3:ListBucket"],
      resources: [
        `${customBucket.bucketArn}`,
        `${customBucket.bucketArn}/*`
      ],
      conditions: {
        StringLike: {
          "s3:prefix": ["public/", "public/*"],
        },
      },
    }),
  ],
});

// Add the policies to the authenticated user role
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(
  authPolicy,
);


const adminPolicy = new Policy(backend.stack, "customBucketAdminPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "s3:GetObject",
        "s3:PutObject", 
        "s3:DeleteObject"
      ],
      resources: [ `${customBucket.bucketArn}/admin/*`],
    }),
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:ListBucket"],
      resources: [
        `${customBucket.bucketArn}`,
        `${customBucket.bucketArn}/*`
      ],
      conditions: {
        StringLike: {
          "s3:prefix": ["admin/*", "admin/"],
        },
      },
    }),
  ],
});


// Add the policies to the "admin" user group role
backend.auth.resources.groups["admin"].role.attachInlinePolicy(adminPolicy);