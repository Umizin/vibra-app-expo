import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const testEnv = {
  FRONTEND_ORIGIN: 'http://localhost:8081',
  JWT_SECRET: 'test-only-jwt-secret-with-32-plus-bytes',
  JAMENDO_CLIENT_ID: 'test-client-id',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/vibra_test',
};

for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}
