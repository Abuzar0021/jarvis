// Runs once when the server starts. Used here to validate env configuration
// and warn about anything missing for production.
export async function register() {
  const { validateEnv } = await import("./lib/env");
  const { logger } = await import("./lib/logger");
  for (const warning of validateEnv()) {
    logger.warn(warning, { scope: "env" });
  }
}
