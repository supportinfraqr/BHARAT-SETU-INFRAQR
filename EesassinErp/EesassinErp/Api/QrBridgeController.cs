using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.SessionState;
using System.Web.Configuration;

namespace EesassinErp.Controllers
{
    /// <summary>
    /// QrBridgeController — transparent HTTP proxy from ERP → Django QR backend.
    /// Every route under /Api/QrBridge/** is forwarded to BssQrBaseUrl/api/**
    /// The JWT token is stored in Session["BssQrToken"] after login.
    /// </summary>
    [RoutePrefix("Api/QrBridge")]
    public class QrBridgeController : ApiController, IRequiresSessionState
    {
        private static readonly string QrBaseUrl =
            (WebConfigurationManager.AppSettings["BssQrBaseUrl"] ?? "https://bharat-shramsetu.infraqr.com").TrimEnd('/');

        // ─── Auth ──────────────────────────────────────────────────────────────

        /// <summary>POST /Api/QrBridge/auth/login/ — login and store JWT in session</summary>
        [HttpPost]
        [Route("auth/login/")]
        [AllowAnonymous]
        public async Task<IHttpActionResult> Login()
        {
            // Capture the session id BEFORE ANY await — Mono replaces HttpContext
            // across continuations, losing cookies/session on the other side.
            string sid = HttpContext.Current?.Request?.Cookies["ASP.NET_SessionId"]?.Value;

            var body = await Request.Content.ReadAsStringAsync();

            // The QR backend only accepts JSON — normalize form-encoded bodies too
            string payload = body;
            if (string.IsNullOrWhiteSpace(body) || !body.TrimStart().StartsWith("{"))
            {
                var form = await Request.Content.ReadAsFormDataAsync();
                var dict = new Dictionary<string, string>();
                foreach (var key in form.AllKeys) dict[key] = form[key];
                payload = Newtonsoft.Json.JsonConvert.SerializeObject(dict);
            }

            var result = await ForwardAsync("POST", "/api/auth/login/", payload, null);

            // If login succeeded, extract token and store it against this session
            try
            {
                var jo = Newtonsoft.Json.Linq.JObject.Parse(result.Body);
                string token = (string)jo.SelectToken("Data.access") ?? (string)jo.SelectToken("access");
                if (!string.IsNullOrEmpty(token))
                {
                    StoreToken(token, sid);
                    System.Web.HttpRuntime.Cache["BssQrLastLoginErr"] =
                        "stored key=" + TokenCacheKey(sid) + " readback=" + (GetToken() != null);
                }
                else
                    System.Web.HttpRuntime.Cache["BssQrLastLoginErr"] = "no access token in body: "
                        + result.Body.Substring(0, Math.Min(120, result.Body.Length));
            }
            catch (Exception ex)
            {
                System.Web.HttpRuntime.Cache["BssQrLastLoginErr"] = "parse error: " + ex.Message;
            }

            return ResponseMessage(BuildResponse(result));
        }

        /// <summary>GET /Api/QrBridge/auth/me/</summary>
        [HttpGet]
        [Route("auth/me/")]
        public async Task<IHttpActionResult> Me()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/auth/me/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/auth/dbg/ — session diagnostics (temporary)</summary>
        [HttpGet]
        [Route("auth/dbg/")]
        [AllowAnonymous]
        public IHttpActionResult Dbg()
        {
            var c = System.Web.HttpRuntime.Cache;
            c["BssQrSelfTest"] = "x";
            var err = c["BssQrLastLoginErr"] as string;
            return Ok($"selftest={c["BssQrSelfTest"] as string ?? "NULL"} key={TokenCacheKey()} " +
                      $"tokenPresent={GetToken() != null} lastErr={err ?? "none"}");
        }

        // ─── Workers ───────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/me/ — Return the logged-in user's QR code as a PNG image</summary>
        [HttpGet]
        [Route("qr/me/")]
        public async Task<IHttpActionResult> MyQrCode()
        {
            var result = await ForwardAsync("GET", "/api/qr/me/", null, GetToken(), binary: true);
            var resp = new HttpResponseMessage((HttpStatusCode)result.StatusCode);
            resp.Content = new ByteArrayContent(result.BinaryBody ?? new byte[0]);
            resp.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
            return ResponseMessage(resp);
        }

        /// <summary>GET /Api/QrBridge/qr/workers/</summary>
        [HttpGet]
        [Route("qr/workers/")]
        public async Task<IHttpActionResult> GetWorkers()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/workers/", null, GetToken())));

        /// <summary>POST /Api/QrBridge/qr/workers/</summary>
        [HttpPost]
        [Route("qr/workers/")]
        public async Task<IHttpActionResult> CreateWorker()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/workers/", body, GetToken())));
        }

        /// <summary>GET /Api/QrBridge/qr/workers/{id}/card/</summary>
        [HttpGet]
        [Route("qr/workers/{workerId}/card/")]
        public async Task<IHttpActionResult> WorkerCard(int workerId)
        {
            string fmt = HttpContext.Current.Request.QueryString["fmt"] ?? "png";
            string side = HttpContext.Current.Request.QueryString["side"] ?? "front";
            var result = await ForwardAsync("GET", $"/api/qr/workers/{workerId}/card/?fmt={fmt}&side={side}", null, GetToken(), binary: true);
            var resp = new HttpResponseMessage((HttpStatusCode)result.StatusCode);
            resp.Content = new ByteArrayContent(result.BinaryBody ?? new byte[0]);
            resp.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                fmt == "pdf" ? "application/pdf" : "image/png");
            return ResponseMessage(resp);
        }

        /// <summary>GET /Api/QrBridge/qr/my-card/ — Render current user's role-based ID card (PNG/PDF)</summary>
        [HttpGet]
        [Route("qr/my-card/")]
        public async Task<IHttpActionResult> MyIdentityCard()
        {
            string fmt  = HttpContext.Current.Request.QueryString["fmt"]  ?? "png";
            string side = HttpContext.Current.Request.QueryString["side"] ?? "front";
            var result = await ForwardAsync("GET", $"/api/qr/qr/my-card/?fmt={fmt}&side={side}", null, GetToken(), binary: true);
            var resp = new HttpResponseMessage((HttpStatusCode)result.StatusCode);
            resp.Content = new ByteArrayContent(result.BinaryBody ?? new byte[0]);
            resp.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                fmt == "pdf" ? "application/pdf" : "image/png");
            return ResponseMessage(resp);
        }

        // ─── QR ────────────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/qr/</summary>
        [HttpGet]
        [Route("qr/qr/")]
        public async Task<IHttpActionResult> GetQr()
        {
            string qs = HttpContext.Current.Request.QueryString.ToString();
            string path = "/api/qr/qr/" + (string.IsNullOrEmpty(qs) ? "" : "?" + qs);
            return ResponseMessage(BuildResponse(await ForwardAsync("GET", path, null, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/qr/scan/</summary>
        [HttpPost]
        [Route("qr/qr/scan/")]
        public async Task<IHttpActionResult> QrScan()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/qr/scan/", body, GetToken())));
        }

        // ─── Dashboard & Stats ─────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/dashboard/</summary>
        [HttpGet]
        [Route("qr/dashboard/")]
        public async Task<IHttpActionResult> Dashboard()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/dashboard/", null, GetToken())));

        // ─── Bindings ──────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/bindings/list/</summary>
        [HttpGet]
        [Route("qr/bindings/list/")]
        public async Task<IHttpActionResult> BindingList()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/bindings/list/", null, GetToken())));

        /// <summary>POST /Api/QrBridge/qr/bindings/</summary>
        [HttpPost]
        [Route("qr/bindings/")]
        public async Task<IHttpActionResult> CreateBinding()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/bindings/", body, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/bindings/{id}/approve/</summary>
        [HttpPost]
        [Route("qr/bindings/{bindingId}/approve/")]
        public async Task<IHttpActionResult> ApproveBinding(int bindingId)
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", $"/api/qr/bindings/{bindingId}/approve/", body, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/bindings/unbind/ — worker direct-assign unbind (body: {"worker": id})</summary>
        [HttpPost]
        [Route("qr/bindings/unbind/")]
        public async Task<IHttpActionResult> WorkerUnbind()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/bindings/unbind/", body, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/bindings/{id}/unbind/ — request unbind (other party must approve)</summary>
        [HttpPost]
        [Route("qr/bindings/{bindingId}/unbind/")]
        public async Task<IHttpActionResult> UnbindBinding(int bindingId)
            => ResponseMessage(BuildResponse(await ForwardAsync("POST", $"/api/qr/bindings/{bindingId}/unbind/", "{}", GetToken())));

        /// <summary>POST /Api/QrBridge/qr/bindings/{id}/unbind/consent/request/</summary>
        [HttpPost]
        [Route("qr/bindings/{bindingId}/unbind/consent/request/")]
        public async Task<IHttpActionResult> UnbindConsentRequest(int bindingId)
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", $"/api/qr/bindings/{bindingId}/unbind/consent/request/", body, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/bindings/{id}/unbind/consent/resolve/</summary>
        [HttpPost]
        [Route("qr/bindings/{bindingId}/unbind/consent/resolve/")]
        public async Task<IHttpActionResult> UnbindConsentResolve(int bindingId)
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", $"/api/qr/bindings/{bindingId}/unbind/consent/resolve/", body, GetToken())));
        }

        // ─── Admin: management ────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/management/employers/?status=</summary>
        [HttpGet]
        [Route("qr/management/employers/")]
        public async Task<IHttpActionResult> AdminEmployers()
        {
            var status = HttpContext.Current.Request.QueryString["status"];
            var qs = string.IsNullOrWhiteSpace(status) ? "" : $"?status={Uri.EscapeDataString(status)}";
            return ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/management/employers/" + qs, null, GetToken())));
        }

        /// <summary>POST /Api/QrBridge/qr/management/employers/{id}/approve/</summary>
        [HttpPost]
        [Route("qr/management/employers/{employerId}/approve/")]
        public async Task<IHttpActionResult> AdminEmployerApprove(int employerId)
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", $"/api/qr/management/employers/{employerId}/approve/", body, GetToken())));
        }

        /// <summary>GET /Api/QrBridge/qr/management/plans/</summary>
        [HttpGet]
        [Route("qr/management/plans/")]
        public async Task<IHttpActionResult> AdminPlans()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/management/plans/", null, GetToken())));

        /// <summary>POST /Api/QrBridge/qr/management/employer/plan/ — attach/change employer plan</summary>
        [HttpPost]
        [Route("qr/management/employer/plan/")]
        public async Task<IHttpActionResult> AdminAttachPlan()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/management/employer/plan/", body, GetToken())));
        }

        /// <summary>GET /Api/QrBridge/qr/management/employers/{id}/tree/</summary>
        [HttpGet]
        [Route("qr/management/employers/{employerId}/tree/")]
        public async Task<IHttpActionResult> AdminEmployerTree(int employerId)
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", $"/api/qr/management/employers/{employerId}/tree/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/management/contractors/{id}/tree/</summary>
        [HttpGet]
        [Route("qr/management/contractors/{contractorId}/tree/")]
        public async Task<IHttpActionResult> AdminContractorTree(int contractorId)
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", $"/api/qr/management/contractors/{contractorId}/tree/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/management/workers/{id}/tree/</summary>
        [HttpGet]
        [Route("qr/management/workers/{workerId}/tree/")]
        public async Task<IHttpActionResult> AdminWorkerTree(int workerId)
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", $"/api/qr/management/workers/{workerId}/tree/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/scans/ — scan logs</summary>
        [HttpGet]
        [Route("qr/scans/")]
        public async Task<IHttpActionResult> AdminScans()
        {
            var worker = HttpContext.Current.Request.QueryString["worker"];
            var qs = string.IsNullOrWhiteSpace(worker) ? "" : $"?worker={Uri.EscapeDataString(worker)}";
            return ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/scans/" + qs, null, GetToken())));
        }

        // ─── Profile ───────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/profile/me/</summary>
        [HttpGet]
        [Route("qr/profile/me/")]
        public async Task<IHttpActionResult> MyProfile()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/profile/me/", null, GetToken())));

        // ─── Employers & Contractors ───────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/employers/</summary>
        [HttpGet]
        [Route("qr/employers/")]
        public async Task<IHttpActionResult> Employers()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/employers/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/contractors/{id}/employments/</summary>
        [HttpGet]
        [Route("qr/contractors/{contractorId}/employments/")]
        public async Task<IHttpActionResult> ContractorEmployments(int contractorId)
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", $"/api/qr/contractors/{contractorId}/employments/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/contractors/</summary>
        [HttpGet]
        [Route("qr/contractors/")]
        public async Task<IHttpActionResult> Contractors()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/contractors/", null, GetToken())));

        // ─── Scan Log ──────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/scans/</summary>
        [HttpGet]
        [Route("qr/scans/")]
        public async Task<IHttpActionResult> Scans()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/scans/", null, GetToken())));

        // ─── Sites ────────────────────────────────────────────────────────────

        /// <summary>GET /Api/QrBridge/qr/sites/ — list the employer's sites</summary>
        [HttpGet]
        [Route("qr/sites/")]
        public async Task<IHttpActionResult> Sites()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/qr/sites/", null, GetToken())));

        /// <summary>POST /Api/QrBridge/qr/sites/ — create a site (belongs to employer)</summary>
        [HttpPost]
        [Route("qr/sites/")]
        public async Task<IHttpActionResult> CreateSite()
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("POST", "/api/qr/sites/", body, GetToken())));
        }

        /// <summary>PUT /Api/QrBridge/qr/sites/{id}/ — update a site</summary>
        [HttpPut]
        [Route("qr/sites/{siteId}/")]
        public async Task<IHttpActionResult> UpdateSite(int siteId)
        {
            var body = await Request.Content.ReadAsStringAsync();
            return ResponseMessage(BuildResponse(await ForwardAsync("PUT", $"/api/qr/sites/{siteId}/", body, GetToken())));
        }

        /// <summary>DELETE /Api/QrBridge/qr/sites/{id}/ — delete a site</summary>
        [HttpDelete]
        [Route("qr/sites/{siteId}/")]
        public async Task<IHttpActionResult> DeleteSite(int siteId)
            => ResponseMessage(BuildResponse(await ForwardAsync("DELETE", $"/api/qr/sites/{siteId}/", null, GetToken())));

        /// <summary>GET /Api/QrBridge/qr/qr/geocode/?lat=..&amp;lng=.. — reverse geocode for the map picker</summary>
        [HttpGet]
        [Route("qr/qr/geocode/")]
        public async Task<IHttpActionResult> Geocode()
        {
            string qs = HttpContext.Current.Request.QueryString.ToString();
            string path = "/api/qr/qr/geocode/" + (string.IsNullOrEmpty(qs) ? "" : "?" + qs);
            return ResponseMessage(BuildResponse(await ForwardAsync("GET", path, null, GetToken())));
        }

        // ─── Proxy Core ────────────────────────────────────────────────────────

        /// <summary>Mono's Web API host provides no HttpSessionState to ApiControllers
        /// (HttpContext.Current.Session == null), so the QR JWT is stored in the
        /// process-wide cache keyed by the caller's ASP.NET_SessionId instead.</summary>
        private const int TokenSlidingMinutes = 480;

        private string TokenCacheKey()
            => TokenCacheKey(HttpContext.Current?.Request?.Cookies["ASP.NET_SessionId"]?.Value);

        private string TokenCacheKey(string sessionId)
            => "BssQrToken_" + (sessionId ?? "anon");

        private void StoreToken(string token)
            => StoreToken(token, HttpContext.Current?.Request?.Cookies["ASP.NET_SessionId"]?.Value);

        private void StoreToken(string token, string sessionId)
        {
            System.Web.HttpRuntime.Cache.Insert(TokenCacheKey(sessionId), token, null,
                System.Web.Caching.Cache.NoAbsoluteExpiration,
                TimeSpan.FromMinutes(TokenSlidingMinutes));
            // Persist across app-pool recycles: cache dies with the process,
            // but the ASP.NET_SessionId cookie survives on the client.
            try
            {
                var dir = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/BssJwt")
                          ?? @"C:\BSS\BssJwt";
                System.IO.Directory.CreateDirectory(dir);
                var sb = new System.Text.StringBuilder();
                foreach (char ch in (sessionId ?? "anon"))
                    if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                var safe = sb.Length == 0 ? "anon" : sb.ToString();
                System.IO.File.WriteAllText(System.IO.Path.Combine(dir, safe + ".txt"), token);
            }
            catch { }
        }

        private string GetToken()
        {
            var key = TokenCacheKey();
            var tok = System.Web.HttpRuntime.Cache[key] as string;
            if (!string.IsNullOrEmpty(tok)) return tok;
            // Cache miss (recycle/idle): hydrate from disk
            try
            {
                var dir = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data/BssJwt")
                          ?? @"C:\BSS\BssJwt";
                var sb = new System.Text.StringBuilder();
                foreach (char ch in (HttpContext.Current?.Request?.Cookies["ASP.NET_SessionId"]?.Value ?? "anon"))
                    if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                var p = System.IO.Path.Combine(dir, (sb.Length == 0 ? "anon" : sb.ToString()) + ".txt");
                if (System.IO.File.Exists(p))
                {
                    tok = System.IO.File.ReadAllText(p).Trim();
                    if (!string.IsNullOrEmpty(tok))
                        System.Web.HttpRuntime.Cache.Insert(key, tok, null,
                            System.Web.Caching.Cache.NoAbsoluteExpiration,
                            TimeSpan.FromMinutes(TokenSlidingMinutes));
                }
            }
            catch { }
            return tok;
        }

        private class ProxyResult
        {
            public int StatusCode { get; set; }
            public string Body { get; set; }
            public byte[] BinaryBody { get; set; }
            public string ContentType { get; set; }
        }

        private async Task<ProxyResult> ForwardAsync(
            string method, string path, string body, string token, bool binary = false)
        {
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(60);
                System.Net.ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                var url = QrBaseUrl + path;
                var req = new HttpRequestMessage(new HttpMethod(method), url);

                if (!string.IsNullOrEmpty(token))
                    req.Headers.TryAddWithoutValidation("Authorization", "Bearer " + token);

                // Dynamically fetch and forward the active ERP user Login ID
                var sessionLoginId = HttpContext.Current?.Session?["LoginId"]?.ToString();
                if (!string.IsNullOrEmpty(sessionLoginId))
                {
                    req.Headers.TryAddWithoutValidation("X-Legacy-Login-Id", sessionLoginId);
                }

                req.Headers.TryAddWithoutValidation("Accept", "application/json, */*");

                if (!string.IsNullOrEmpty(body) && method != "GET")
                    req.Content = new StringContent(body, Encoding.UTF8, "application/json");

                try
                {
                    var resp = await client.SendAsync(req);
                    var result = new ProxyResult
                    {
                        StatusCode = (int)resp.StatusCode,
                        ContentType = resp.Content.Headers.ContentType?.MediaType ?? "application/json"
                    };

                    if (binary)
                        result.BinaryBody = await resp.Content.ReadAsByteArrayAsync();
                    else
                        result.Body = await resp.Content.ReadAsStringAsync();

                    return result;
                }
                catch (Exception ex)
                {
                    return new ProxyResult
                    {
                        StatusCode = 502,
                        Body = $"{{\"error\":\"QR backend unreachable: {ex.Message.Replace("\"", "\\\"")}\"}}"
                    };
                }
            }
        }

        private HttpResponseMessage BuildResponse(ProxyResult result)
        {
            var msg = new HttpResponseMessage((HttpStatusCode)result.StatusCode);
            msg.Content = new StringContent(result.Body ?? "{}", Encoding.UTF8,
                result.ContentType?.Contains("json") == true ? "application/json" : "text/plain");
            return msg;
        }
    }
}
