import { config } from "dotenv";

// Neon writes env vars into `.env.local` (no `.env` exists yet).
config({ path: ".env.local" });
config({ path: ".env" }); // fall back if present

export const env = {
  // Postgres
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  // Branch
  branch: process.env.NEON_BRANCH,
  branchId: process.env.NEON_BRANCH_ID,
  // Auth
  authBaseUrl: process.env.NEON_AUTH_BASE_URL,
  authJwksUrl: process.env.NEON_AUTH_JWKS_URL,
  // Functions
  functionHostSuffix: process.env.NEON_FUNCTION_HOST_SUFFIX,
  // Object Storage (S3-compatible)
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsEndpointUrlS3: process.env.AWS_ENDPOINT_URL_S3,
  awsRegion: process.env.AWS_REGION,
  // AI Gateway
  aiGatewayToken: process.env.NEON_AI_GATEWAY_TOKEN,
  aiGatewayBaseUrl: process.env.NEON_AI_GATEWAY_BASE_URL,
  // Realtime
  realtimeUrl: process.env.NEON_REALTIME_URL,
  realtimeSecret: process.env.NEON_REALTIME_SECRET,
} as const;
