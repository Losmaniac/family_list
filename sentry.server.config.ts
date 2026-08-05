import * as Sentry from "@sentry/nextjs";

// Inert until NEXT_PUBLIC_SENTRY_DSN is set — Sentry.init() with an empty
// DSN is a documented no-op, so this is safe to ship even without an
// account. Create a free project at sentry.io and set the env var to
// activate error reporting.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
