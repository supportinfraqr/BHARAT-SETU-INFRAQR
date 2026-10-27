/**
 * Normalize tenant id from request headers.
 * UAT/nginx often drops headers with underscores (org_uuid) unless underscores_in_headers on.
 * Accept x-org-uuid / org-uuid as well and map to req.headers.org_uuid for controllers.
 */
function resolveOrgUuidHeader(req) {
  const raw =
    req.headers['x-org-uuid'] ||
    req.headers['org-uuid'] ||
    req.headers.org_uuid ||
    req.headers.orguuid;

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }
  return String(raw).trim();
}

function orgUuidHeaderMiddleware(req, res, next) {
  const orgUuid = resolveOrgUuidHeader(req);
  if (orgUuid) {
    req.headers.org_uuid = orgUuid;
  }
  next();
}

module.exports = { orgUuidHeaderMiddleware, resolveOrgUuidHeader };
