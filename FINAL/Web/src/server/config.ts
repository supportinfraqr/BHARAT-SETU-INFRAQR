import 'server-only';

export type DataMode = 'demo' | 'remote';

export function getDataMode(): DataMode {
  return 'remote';
}

export function getRuntimeConfig() {
  return {
    mode: getDataMode(),
    apiBaseUrl: process.env.BSS_API_BASE_URL?.replace(/\/$/, ''),
    authBaseUrl: (process.env.BSS_AUTH_API_URL ?? process.env.BSS_API_BASE_URL)?.replace(/\/$/, ''),
    serviceToken: process.env.BSS_SERVICE_TOKEN,
    paymentHosts: (process.env.BSS_PAYMENT_HOSTS ?? '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean),
    appOrigin: process.env.BSS_APP_ORIGIN?.replace(/\/$/, ''),
    sessionSecret: process.env.BSS_SESSION_SECRET,
    requestTimeoutMs: Number(process.env.BSS_API_TIMEOUT_MS ?? 10_000),
  };
}

export function configurationErrors(): string[] {
  const config = getRuntimeConfig();
  const errors: string[] = [];
  if (!config.apiBaseUrl) errors.push('BSS_API_BASE_URL is required (remote-only mode).');
  if (!config.authBaseUrl) errors.push('BSS_AUTH_API_URL or BSS_API_BASE_URL is required (remote-only mode).');
  if (!config.paymentHosts.length) errors.push('BSS_PAYMENT_HOSTS must list the approved hosted-checkout domains.');
  for (const [name, value] of [['BSS_API_BASE_URL', config.apiBaseUrl], ['BSS_AUTH_API_URL', config.authBaseUrl], ['BSS_APP_ORIGIN', config.appOrigin]] as const) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') errors.push(`${name} must use HTTPS in production.`);
      if (url.username || url.password) errors.push(`${name} must not contain embedded credentials.`);
    } catch { errors.push(`${name} must be a valid absolute URL.`); }
  }
  if (process.env.NODE_ENV === 'production' && (!config.sessionSecret || config.sessionSecret.length < 32)) errors.push('BSS_SESSION_SECRET must contain at least 32 characters in production.');
  if (!Number.isFinite(config.requestTimeoutMs) || config.requestTimeoutMs < 1_000 || config.requestTimeoutMs > 60_000) errors.push('BSS_API_TIMEOUT_MS must be between 1000 and 60000.');
  return errors;
}

export function assertRuntimeConfigured(): ReturnType<typeof getRuntimeConfig> {
  const errors = configurationErrors();
  if (errors.length) throw new Error(errors.join(' '));
  return getRuntimeConfig();
}
