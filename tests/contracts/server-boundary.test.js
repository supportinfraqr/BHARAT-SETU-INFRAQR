const assert = require("node:assert/strict");
const fs = require("node:fs");

const routes = fs.readFileSync("EesassinErp/EesassinErp/App_Start/RouteConfig.cs", "utf8");
const grievances = fs.readFileSync("EesassinErp/EesassinErp/Controllers/GrievancesController.cs", "utf8");
const login = fs.readFileSync("EesassinErp/EesassinErp/Controllers/LoginController.cs", "utf8");

assert.match(routes, /url:\s*"api\/v1\/grievances"/);
assert.match(routes, /url:\s*"api\/v1\/auth\/login"/);
assert.match(routes, /url:\s*"api\/v1\/auth\/logout"/);
assert.match(routes, /url:\s*"api\/v1\/session"/);

const createV1 = grievances.slice(
    grievances.indexOf("public async Task<ActionResult> CreateV1"),
    grievances.indexOf("private JsonResult V1Error")
);
assert.match(createV1, /Session\["LoginId"\]/);
assert.doesNotMatch(createV1, /string\s+LoginId\s*[,)]/);
assert.match(createV1, /Response\.StatusCode\s*=\s*201/);
assert.match(createV1, /await DAL\.DLL\.InsertGrivances/);
assert.match(createV1, /"AUTH_REQUIRED"/);
assert.match(createV1, /"VALIDATION_ERROR"/);

assert.match(login, /public ActionResult LoginV1/);
assert.match(login, /public ActionResult SessionV1/);
assert.match(login, /public ActionResult LogoutV1/);
assert.match(login, /case "password":/);
assert.match(login, /case "mpin":/);
assert.match(login, /case "otp":/);

process.stdout.write("ASP.NET versioned boundary source checks passed\n");
