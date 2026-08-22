using System;
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
            var body = await Request.Content.ReadAsStringAsync();
            var result = await ForwardAsync("POST", "/api/auth/login/", body, null);

            // If login succeeded, extract token and save in session
            try
            {
                dynamic json = Newtonsoft.Json.JsonConvert.DeserializeObject(result.Body);
                string token = json?.access?.ToString();
                if (!string.IsNullOrEmpty(token))
                    HttpContext.Current.Session["BssQrToken"] = token;
            }
            catch { /* ignore parse errors */ }

            return ResponseMessage(BuildResponse(result));
        }

        /// <summary>GET /Api/QrBridge/auth/me/</summary>
        [HttpGet]
        [Route("auth/me/")]
        public async Task<IHttpActionResult> Me()
            => ResponseMessage(BuildResponse(await ForwardAsync("GET", "/api/auth/me/", null, GetToken())));

        // ─── Workers ───────────────────────────────────────────────────────────

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
            var result = await ForwardAsync("GET", $"/api/qr/workers/{workerId}/card/?fmt={fmt}", null, GetToken(), binary: true);
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
            string fmt = HttpContext.Current.Request.QueryString["fmt"] ?? "png";
            var result = await ForwardAsync("GET", $"/api/qr/qr/my-card/?fmt={fmt}", null, GetToken(), binary: true);
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

        // ─── Proxy Core ────────────────────────────────────────────────────────

        private string GetToken()
            => HttpContext.Current?.Session?["BssQrToken"]?.ToString();

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
