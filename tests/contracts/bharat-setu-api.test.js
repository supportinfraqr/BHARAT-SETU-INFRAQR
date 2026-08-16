const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class FakeFormData {
    constructor() {
        this.entries = [];
    }

    append(name, value, fileName) {
        this.entries.push({ name, value, fileName });
    }
}

class FakeFile {
    constructor(parts, name, options) {
        this.parts = parts;
        this.name = name;
        this.type = options.type;
        this.lastModified = options.lastModified;
    }
}

function loadAdapter(ajaxHandler, session) {
    const values = {
        userSession: JSON.stringify(session || {})
    };
    const storage = {
        getItem(key) {
            return values[key] || null;
        },
        setItem(key, value) {
            values[key] = value;
        },
        clear() {
            Object.keys(values).forEach((key) => delete values[key]);
        }
    };
    const localStorage = {
        setItem(key, value) {
            values["local:" + key] = value;
        }
    };
    const jquery = function () {};
    jquery.ajax = ajaxHandler;
    const window = {
        jQuery: jquery,
        sessionStorage: storage,
        localStorage
    };
    const context = vm.createContext({
        window,
        FormData: FakeFormData,
        File: FakeFile,
        Promise,
        Error,
        Object,
        Math
    });
    const source = fs.readFileSync(
        "EesassinErp/EesassinErp/scripts/api/bharat-setu-api.js",
        "utf8"
    );

    vm.runInContext(source, context);
    return window.BharatSetuApi;
}

async function testSuccessfulLegacyMapping() {
    let request;
    const api = loadAdapter(function (options) {
        request = options;
        options.success({ data: { id: "grievance-7", status: "submitted" } });
    }, { LoginId: "worker-42" });
    const document = new FakeFile([], "letter.png", { type: "image/png", lastModified: 1 });

    const response = await api.grievances.create({
        subject: "Missing wages",
        details: "Payment has not arrived.",
        audio: null,
        documents: [document]
    });

    assert.equal(request.url, "/api/v1/grievances");
    assert.equal(request.type, "POST");
    assert.equal(response.data.status, "submitted");
    assert.deepEqual(
        request.data.entries.map((entry) => entry.name),
        ["details", "subject", "documents"]
    );
    assert.equal(request.data.entries[1].value, "Missing wages");
}

async function testInvalidSuccessResponse() {
    const api = loadAdapter(function (options) {
        options.success({ status: true });
    }, { LoginId: "worker-42" });

    await assert.rejects(
        api.grievances.create({ subject: "Test", details: "Details", documents: [] }),
        (error) => error.code === "INVALID_RESPONSE" && error.status === 502
    );
}

async function testHttpFailureMapping() {
    const api = loadAdapter(function (options) {
        options.error({ status: 413 });
    }, { LoginId: "worker-42" });

    await assert.rejects(
        api.grievances.create({ subject: "Test", details: "Details", documents: [] }),
        (error) => error.code === "PAYLOAD_TOO_LARGE" && error.status === 413
    );
}

async function testLoginNormalizesAndStoresSession() {
    const api = loadAdapter(function (options) {
        assert.equal(options.url, "/api/v1/auth/login");
        options.success({
            data: {
                user: {
                    id: "42",
                    name: "Worker One",
                    role: "7",
                    branchId: "9",
                    username: "worker.one"
                },
                permissions: [],
                redirectPath: "/Dashboard/workerDashboard"
            }
        });
    }, {});

    const session = await api.auth.login({ Username: "worker.one", Password: "secret", Action: "45" });

    assert.equal(session.user.id, "42");
    assert.equal(session.user.role, "7");
    assert.equal(session.redirectPath, "/Dashboard/workerDashboard");
    assert.equal(api.session.current().user.name, "Worker One");
}

async function testLoginSentinels() {
    const invalidApi = loadAdapter(function (options) {
        options.error({
            status: 401,
            responseJSON: { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } }
        });
    }, {});
    const conflictApi = loadAdapter(function (options) {
        options.error({
            status: 409,
            responseJSON: { error: { code: "SESSION_CONFLICT", message: "Session active" } }
        });
    }, {});

    await assert.rejects(
        invalidApi.auth.login({}),
        (error) => error.code === "INVALID_CREDENTIALS"
    );
    await assert.rejects(
        conflictApi.auth.login({}),
        (error) => error.code === "SESSION_CONFLICT"
    );
}

async function testLegacyAccountActionRemainsAdapted() {
    const api = loadAdapter(function (options) {
        assert.equal(options.url, "/Login/NGetUserId");
        options.success([{
            LoginId: 42,
            Name: "Worker One",
            LoginType: 7,
            RPath: "/registration/complete"
        }]);
    }, {});

    const session = await api.auth.login({ Username: "worker.one", Password: "123456", Action: "48" });
    assert.equal(session.user.id, "42");
}

async function testRefreshAndLogout() {
    const requestedUrls = [];
    const api = loadAdapter(function (options) {
        requestedUrls.push(options.url);
        if (options.url === "/api/v1/session") {
            options.success({
                data: {
                    user: { id: "42", name: "Worker One", role: "7" },
                    permissions: ["grievances:create"],
                    redirectPath: "/Dashboard/workerDashboard"
                }
            });
            return;
        }
        options.success();
    }, {});

    const session = await api.session.refresh();
    assert.deepEqual(session.permissions, ["grievances:create"]);
    assert.equal(api.session.current().user.id, "42");

    await api.auth.logout();
    assert.equal(api.session.current(), null);
    assert.deepEqual(requestedUrls, ["/api/v1/session", "/api/v1/auth/logout"]);
}

(async function run() {
    await testSuccessfulLegacyMapping();
    await testInvalidSuccessResponse();
    await testHttpFailureMapping();
    await testLoginNormalizesAndStoresSession();
    await testLoginSentinels();
    await testLegacyAccountActionRemainsAdapted();
    await testRefreshAndLogout();
    process.stdout.write("bharat-setu-api contract adapter tests passed\n");
})().catch(function (error) {
    process.stderr.write(error.stack + "\n");
    process.exitCode = 1;
});
