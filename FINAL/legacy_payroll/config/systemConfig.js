const { mongo } = require("mongoose");

const config = {
    port: process.env.PORT || 3300,
    baseUrl: process.env.BASE_URL || 'http://localhost:3300',
    mongoUrl: process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/hrmsBackend',
    mongoBaseUrl: process.env.MONGODB_BASE_URL || 'mongodb://127.0.0.1:27017/',
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379"
};

function isLocalhostUrl(value = '') {
    return /localhost|127\.0\.0\.1/i.test(String(value));
}

function firstHeader(req, name) {
    const raw = req?.headers?.[name] || (typeof req?.get === 'function' ? req.get(name) : '');
    if (!raw) return '';
    return String(Array.isArray(raw) ? raw[0] : raw).split(',')[0].trim();
}

/** login.peoplehrms.com → loginapi.peoplehrms.com */
function publicApiUrlFromFrontendOrigin(originOrReferer = '') {
    try {
        const parsed = new URL(originOrReferer);
        if (!parsed.hostname || isLocalhostUrl(parsed.hostname)) return '';
        let host = parsed.hostname;
        if (host.startsWith('login.') && !host.startsWith('loginapi.')) {
            host = `loginapi.${host.slice('login.'.length)}`;
        }
        return `${parsed.protocol}//${host}`.replace(/\/$/, '');
    } catch {
        return '';
    }
}

function forceHttpsIfPublic(url = '') {
    try {
        const parsed = new URL(url);
        if (!isLocalhostUrl(parsed.hostname) && parsed.protocol === 'http:') {
            parsed.protocol = 'https:';
        }
        return String(parsed).replace(/\/$/, '');
    } catch {
        return String(url || '').replace(/\/$/, '');
    }
}

/**
 * Never return localhost when the browser is on a live domain.
 * Nginx often proxies to 127.0.0.1 over HTTP — always use https for public hosts.
 */
function resolvePublicBaseUrl(req) {
    const envUrl = forceHttpsIfPublic(String(config.baseUrl || ''));
    if (envUrl && !isLocalhostUrl(envUrl)) {
        return envUrl;
    }

    const forwardedHost = firstHeader(req, 'x-forwarded-host');
    const host = forwardedHost || firstHeader(req, 'host');
    const protoHint = firstHeader(req, 'x-forwarded-proto') || req?.protocol || 'https';
    const proto = host && !isLocalhostUrl(host) ? 'https' : (protoHint || 'http');

    if (host && !isLocalhostUrl(host)) {
        return forceHttpsIfPublic(`${proto}://${host}`);
    }

    const fromFrontend = publicApiUrlFromFrontendOrigin(
        firstHeader(req, 'origin') || firstHeader(req, 'referer')
    );
    if (fromFrontend) {
        return forceHttpsIfPublic(fromFrontend);
    }

    return envUrl || 'http://localhost:3300';
}

function withLoginPath(base = '') {
    const clean = String(base || '').replace(/\/$/, '');
    if (!clean) return '';
    if (/\/login$/i.test(clean)) return clean;
    return `${clean}/login`;
}

/** Employee portal login URL. Emails must not point at localhost. */
const LIVE_LOGIN_URL = 'https://login.peoplehrms.com/login';

function resolveLoginUrl(req) {
    const envRaw = String(
        process.env.FRONTEND_URL || process.env.LOGIN_URL || process.env.CANDIDATE_LOGIN_URL || ''
    ).trim();
    if (envRaw && !isLocalhostUrl(envRaw)) {
        return forceHttpsIfPublic(withLoginPath(envRaw));
    }

    const origin = firstHeader(req, 'origin') || firstHeader(req, 'referer');
    try {
        if (origin) {
            const parsed = new URL(origin);
            if (!isLocalhostUrl(parsed.hostname)) {
                let host = parsed.hostname;
                if (host.startsWith('loginapi.')) {
                    host = `login.${host.slice('loginapi.'.length)}`;
                }
                return forceHttpsIfPublic(`${parsed.protocol}//${host}/login`);
            }
        }
    } catch {
        // ignore
    }

    return LIVE_LOGIN_URL;
}

config.resolvePublicBaseUrl = resolvePublicBaseUrl;
config.resolveLoginUrl = resolveLoginUrl;

module.exports = config;