process.env.NODE_ENV ??= "test";

if (process.env.INTEGRATION_TEST === "1") {
  const pad = (c: string, n: number): string => c.repeat(n);
  process.env.JWT_ACCESS_SECRET ??= pad("a", 32);
  process.env.JWT_REFRESH_SECRET ??= pad("b", 32);
  process.env.DATABASE_URL ??= "postgresql://royal:royal@127.0.0.1:5433/royal_test";
  process.env.REDIS_URL ??= "redis://127.0.0.1:6380";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";
  process.env.FRONTEND_URL ??= "http://localhost:3000";
  process.env.INTERNAL_AUTH_BRIDGE_SECRET ??= "int-bridge-secret-16chars!!";
}
