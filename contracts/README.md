# Frontend/backend contracts

`openapi.yaml` is the target boundary shared by Django, React Native, and compatibility adapters. It describes product behavior, not ASP.NET controller shapes.

## Contract rules

- Keep routes versioned under `/api/v1`.
- Use camelCase JSON and structured success/error envelopes.
- Derive actor identity and permissions from authenticated context. Never accept `loginId` as authority in target request bodies.
- Keep transport concerns inside clients/adapters; screens pass domain values and files.
- Add a contract fixture before changing a response shape.
- Preserve legacy endpoints behind adapters until the replacement passes parity tests.

## First compatibility mapping

| Domain operation | Target contract | Legacy endpoint | Adapter notes |
|---|---|---|---|
| Login | `POST /api/v1/auth/login` | `POST /Login/NGetUserId` | Password, MPIN, and OTP now use the versioned route; registration/recovery actions remain behind the legacy adapter |
| Read session | `GET /api/v1/session` | Browser `userSession` plus ASP.NET session | Adapter normalizes target data and maintains temporary legacy keys |
| Logout | `POST /api/v1/auth/logout` | `POST /Login/GetModulePermission` action 17 | Legacy active-session cleanup runs before the versioned logout |
| Create grievance | `POST /api/v1/grievances` | `POST /Grievances/UploadDocuments` retained for older callers | Active worker grievance screen uses the versioned route and sends no identity field |

The target grievance endpoint returns HTTP `201`. Compatibility endpoints are implemented in ASP.NET MVC because the established server session is available there; Django must implement the same OpenAPI operations before the transport is switched.

Django login returns JWTs in optional session `meta`. `legacyLoginId` is compatibility-only for unversioned routes and is never accepted as authority by `/api/v1`.

## Migration sequence

1. Screens call a domain client instead of URLs or framework transports.
2. The legacy adapter preserves the current ASP.NET implementation.
3. Django implements and tests the OpenAPI operation.
4. Configuration switches the client from compatibility mode to `/api/v1`.
5. React Native consumes the same contract through its typed client.

The ASP.NET compatibility endpoints continue to use the established session cookie. Django issues JWT access and refresh tokens, and enforces environment-configurable grievance evidence limits. Canonical permission names remain an integration decision.
