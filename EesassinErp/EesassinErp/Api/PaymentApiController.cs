using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace EesassinErp.Controllers
{
    public class PaymentApiController : ApiController
    {
        [HttpPost]
        public async Task<string> CreateOrder(Dictionary<string, string> postParameters)
        {
            string postData = "";

            foreach (string key in postParameters.Keys)
            {
                postData += HttpUtility.UrlEncode(key) + "="
                      + HttpUtility.UrlEncode(postParameters[key]) + "&";
            }
            var myUri = new Uri("https://test.cashfree.com/billpay/checkout/post/submit");
            var myWebRequest = WebRequest.Create(myUri);
            var myHttpWebRequest = (HttpWebRequest)myWebRequest;
            myHttpWebRequest.PreAuthenticate = true;
            myHttpWebRequest.Method = "Post";
            byte[] data = Encoding.ASCII.GetBytes(postData);
            myHttpWebRequest.ContentType = "application/json";
            myHttpWebRequest.ContentLength = data.Length;
            myHttpWebRequest.Headers.Add("x-api-version", "2022-09-01");
            myHttpWebRequest.Headers.Add("x-client-id", "TEST10038027d8b5531245d9e4a6862672083001");
            myHttpWebRequest.Headers.Add("x-client-secret", "TESTc8d11ff24050469ac6581dc7615635c942e5a4eb");
            myHttpWebRequest.Accept = "application/json";
            ServicePointManager.Expect100Continue = true;
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(myUri);
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Ssl3 | SecurityProtocolType.Ssl3 | SecurityProtocolType.Tls | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls12;

            Stream requestStream = myHttpWebRequest.GetRequestStream();
            requestStream.Write(data, 0, data.Length);
            requestStream.Close();

            var myWebResponse = myWebRequest.GetResponse();
            var responseStream = myWebResponse.GetResponseStream();
            if (responseStream == null) return null;

            var myStreamReader = new StreamReader(responseStream, Encoding.Default);
            var json = myStreamReader.ReadToEnd();

            responseStream.Close();
            myWebResponse.Close();

            return json;
        }
    }
}