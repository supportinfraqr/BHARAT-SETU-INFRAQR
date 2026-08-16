(function (global, $) {
    "use strict";

    if (!$) {
        throw new Error("BharatSetuApi legacy adapter requires jQuery.");
    }

    function ApiError(code, message, status) {
        this.name = "ApiError";
        this.code = code;
        this.message = message;
        this.status = status || 0;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    ApiError.prototype = Object.create(Error.prototype);
    ApiError.prototype.constructor = ApiError;

    function readLegacySession() {
        let session = null;

        try {
            session = JSON.parse(global.sessionStorage.getItem("userSession") || "null");
        } catch (error) {
            session = null;
        }

        return session || {};
    }

    function normalizeSession(legacyUser) {
        if (!legacyUser || !legacyUser.LoginId) {
            return null;
        }

        return {
            user: {
                id: String(legacyUser.LoginId),
                name: legacyUser.Name || "",
                role: String(legacyUser.LoginType || ""),
                email: legacyUser.EmailId || null,
                branchId: legacyUser.BranchCode ? String(legacyUser.BranchCode) : null
            },
            permissions: legacyUser.Permissions || [],
            redirectPath: legacyUser.RPath || null,
            legacy: legacyUser
        };
    }

    function saveLegacySession(legacyUser) {
        const sessionData = {
            LoginId: legacyUser.LoginId,
            MapId: legacyUser.MapId,
            MapUser: legacyUser.MapUser,
            BranchCode: legacyUser.BranchCode,
            LoginType: legacyUser.LoginType,
            LastLogin: legacyUser.LastLogin,
            Desig: legacyUser.Desig,
            Name: legacyUser.Name,
            BranchName: legacyUser.BranchName,
            ContactNo: legacyUser.ContactNo,
            CreatedOn: legacyUser.CreatedOn,
            Photo: legacyUser.Photo,
            UserName: legacyUser.UserName,
            BranchAddress: legacyUser.BranchAddress,
            SessionId: legacyUser.SessionId,
            EmailId: legacyUser.EmailId,
            PartyEMail: legacyUser.PartyEMail,
            RPath: legacyUser.RPath,
            Permissions: legacyUser.Permissions || [],
            Loadonce: 0
        };

        global.sessionStorage.setItem("userSession", JSON.stringify(sessionData));
        if (legacyUser.UserName && global.localStorage) {
            global.localStorage.setItem("LastUserName", legacyUser.UserName);
        }

        return normalizeSession(sessionData);
    }

    function clearSession() {
        global.sessionStorage.clear();
    }

    function parseLegacyLoginResponse(response) {
        let data = response;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (error) {
                if (data === "-11") {
                    throw new ApiError("SESSION_CONFLICT", "Another session is already active. Close it before signing in again.", 409);
                }
                if (data === "-1") {
                    throw new ApiError("INVALID_CREDENTIALS", "The supplied credentials are not valid.", 401);
                }
                throw new ApiError("INVALID_RESPONSE", "The login service returned an unreadable response.", 502);
            }
        }

        if (String(data) === "-11") {
            throw new ApiError("SESSION_CONFLICT", "Another session is already active. Close it before signing in again.", 409);
        }
        if (String(data) === "-1") {
            throw new ApiError("INVALID_CREDENTIALS", "The supplied credentials are not valid.", 401);
        }

        if (!Array.isArray(data) || !data.length) {
            throw new ApiError("INVALID_CREDENTIALS", "The supplied credentials are not valid.", 401);
        }

        if (String(data[0].LoginId) === "-11") {
            throw new ApiError("SESSION_CONFLICT", "Another session is already active. Close it before signing in again.", 409);
        }
        if (String(data[0].LoginId) === "-1") {
            throw new ApiError("INVALID_CREDENTIALS", "The supplied credentials are not valid.", 401);
        }

        return data[0];
    }

    function loginLegacy(credentials) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: "/Login/NGetUserId",
                type: "POST",
                data: JSON.stringify({ obj: credentials }),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (response) {
                    try {
                        resolve(saveLegacySession(parseLegacyLoginResponse(response)));
                    } catch (error) {
                        reject(error);
                    }
                },
                error: function (xhr) {
                    reject(mapHttpError(xhr));
                }
            });
        });
    }

    function saveTargetSession(sessionData) {
        const user = sessionData.user || {};
        const legacyUser = {
            LoginId: user.id,
            Name: user.name,
            LoginType: user.role,
            EmailId: user.email,
            BranchCode: user.branchId,
            BranchName: user.branchName,
            Desig: user.designation,
            ContactNo: user.contactNumber,
            Photo: user.photo,
            UserName: user.username,
            MapId: user.mapId,
            MapUser: user.mapUser,
            RPath: sessionData.redirectPath,
            Permissions: sessionData.permissions || []
        };
        const normalized = saveLegacySession(legacyUser);
        return normalized;
    }

    function login(credentials) {
        const methodByAction = {
            "43": "otp",
            "44": "mpin",
            "45": "password"
        };
        const method = methodByAction[String(credentials.Action || "")];

        if (!method) {
            return loginLegacy(credentials);
        }

        return new Promise(function (resolve, reject) {
            $.ajax({
                url: "/api/v1/auth/login",
                type: "POST",
                data: JSON.stringify({
                    username: credentials.Username || credentials.UserName,
                    password: credentials.Password,
                    method: method
                }),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (response) {
                    if (!response || !response.data || !response.data.user) {
                        reject(new ApiError("INVALID_RESPONSE", "The login service returned an unreadable response.", 502));
                        return;
                    }
                    resolve(saveTargetSession(response.data));
                },
                error: function (xhr) {
                    reject(mapHttpError(xhr));
                }
            });
        });
    }

    function refreshSession() {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: "/api/v1/session",
                type: "GET",
                dataType: "json",
                success: function (response) {
                    if (!response || !response.data || !response.data.user) {
                        reject(new ApiError("INVALID_RESPONSE", "The session service returned an unreadable response.", 502));
                        return;
                    }
                    resolve(saveTargetSession(response.data));
                },
                error: function (xhr) {
                    reject(mapHttpError(xhr));
                }
            });
        });
    }

    function logout() {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: "/api/v1/auth/logout",
                type: "POST",
                success: function () {
                    clearSession();
                    resolve();
                },
                error: function (xhr) {
                    reject(mapHttpError(xhr));
                }
            });
        });
    }

    function mapHttpError(xhr) {
        const status = xhr.status || 0;
        const responseError = xhr.responseJSON && xhr.responseJSON.error;

        if (responseError && responseError.code && responseError.message) {
            const error = new ApiError(responseError.code, responseError.message, status);
            error.fieldErrors = responseError.fieldErrors || null;
            error.requestId = responseError.requestId || null;
            return error;
        }

        if (status === 401) {
            return new ApiError("AUTH_REQUIRED", "Your session has expired. Sign in again, then resubmit your grievance.", status);
        }
        if (status === 403) {
            return new ApiError("FORBIDDEN", "You do not have permission to submit this grievance.", status);
        }
        if (status === 413) {
            return new ApiError("PAYLOAD_TOO_LARGE", "The selected files are too large. Remove one or more images and try again.", status);
        }
        if (status === 429) {
            return new ApiError("RATE_LIMITED", "Too many submissions were attempted. Wait a moment and try again.", status);
        }
        if (status >= 500) {
            return new ApiError("SERVICE_UNAVAILABLE", "The grievance service is temporarily unavailable. Your entries are still here; try again shortly.", status);
        }

        return new ApiError("NETWORK_ERROR", "Your grievance could not be submitted. Check your connection and try again.", status);
    }

    function createGrievance(input) {
        const formData = new FormData();
        const documents = input.documents || [];

        formData.append("details", input.details || "");
        formData.append("subject", input.subject || "");

        if (input.audio) {
            formData.append("audio", input.audio, "recording.webm");
        }

        for (let index = 0; index < documents.length; index++) {
            formData.append("documents", documents[index], documents[index].name);
        }

        return new Promise(function (resolve, reject) {
            $.ajax({
                url: "/api/v1/grievances",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    if (!response || !response.data || response.data.status !== "submitted") {
                        reject(new ApiError("INVALID_RESPONSE", "The grievance service returned an unreadable response.", 502));
                        return;
                    }

                    resolve(response);
                },
                error: function (xhr) {
                    reject(mapHttpError(xhr));
                }
            });
        });
    }

    global.BharatSetuApi = Object.freeze({
        ApiError: ApiError,
        auth: Object.freeze({
            login: login,
            logout: logout
        }),
        session: Object.freeze({
            clear: clearSession,
            current: function () {
                return normalizeSession(readLegacySession());
            },
            refresh: refreshSession,
            saveLegacy: saveLegacySession
        }),
        grievances: Object.freeze({
            create: createGrievance
        })
    });
})(window, window.jQuery);
