import * as Sentry from "@sentry/nextjs";

// Inert until NEXT_PUBLIC_SENTRY_DSN is set — see sentry.server.config.ts.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
