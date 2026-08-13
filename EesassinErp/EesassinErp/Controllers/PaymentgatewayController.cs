using BAL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class PaymentgatewayController : Controller
    {
        // GET: Paymentgateway
        public ActionResult Payment()
        {
            return View();
        }

        private string CreateToken(string message, string secret)
        {
            secret = secret ?? "";
            var encoding = new System.Text.ASCIIEncoding();
            byte[] keyByte = encoding.GetBytes(secret);
            byte[] messageBytes = encoding.GetBytes(message);
            using (var hmacsha256 = new HMACSHA256(keyByte))
            {
                byte[] hashmessage = hmacsha256.ComputeHash(messageBytes);
                var replacesc = Filter(Convert.ToBase64String(hashmessage));
                return replacesc;
            }
        }
        private string Filter(string s)
        {
            var chars = new[] { '/' };
            var filteredChars = s.ToArray();
            return new string(filteredChars
                     .Where(ch => !chars.Contains(ch))
                     .Select(ch => ch == ' ' ? '-' : ch).ToArray());
        }
        [System.Web.Services.WebMethod]
        public string btnCheckout(PaymentBAL obj)
        {
            string secret = "TESTc8d11ff24050469ac6581dc7615635c942e5a4eb";
            string data = "";
            string Merchantkey = "TEST10038027d8b5531245d9e4a6862672083001";
            string orderId = obj.OrderId;
            SortedDictionary<string, string> formParams = new SortedDictionary<string, string>();
            formParams.Add("appId", Merchantkey);
            formParams.Add("orderId", orderId);
            formParams.Add("orderAmount", obj.TotalAmount);
            formParams.Add("customerName", obj.Name);
            formParams.Add("customerPhone", obj.ContactNo);
            formParams.Add("customerEmail", obj.EmailId);
            formParams.Add("returnUrl", "https://retail.ezcompliance.in/Returngateway/ReturnResponse");
            foreach (var kvp in formParams)
            {
                data = data + kvp.Key + kvp.Value;
            }
            string signature = CreateToken(data, secret);
            Console.Write(signature);
            string outputHTML = "<html>";
            outputHTML += "<head>";
            outputHTML += "<title>Merchant Check Out Page</title>";
            outputHTML += "</head>";
            outputHTML += "<body>";
            outputHTML += "<center>Please do not refresh this page...</center>";  // you can put h1 tag here
            outputHTML += "<form id='redirectForm' method='post' action='https://test.cashfree.com/billpay/checkout/post/submit'>";
            outputHTML += "<input type='hidden' name='appId' value='" + Merchantkey + "'/>";
            outputHTML += "<input type='hidden' name='orderId' value='" + orderId + "'/>";
            outputHTML += "<input type='hidden' name='orderAmount' value='" + obj.TotalAmount + "'/>";
            outputHTML += "<input type='hidden' name='customerName' value='" + obj.Name + "'/>";
            outputHTML += "<input type='hidden' name='customerEmail' value='" + obj.ContactNo + "'/>";
            outputHTML += "<input type='hidden' name='customerPhone' value='" + obj.ContactNo + "'/>";
            outputHTML += "<input type='hidden' name='returnUrl' value='https://retail.ezcompliance.in/Returngateway/ReturnResponse'/>";
            outputHTML += "<input type='hidden' name='signature' value='" + signature + "'/>";
            outputHTML += "<table border='1'>";
            outputHTML += "<tbody>";
            foreach (string keys in formParams.Keys)
            {
                outputHTML += "<input type='hidden' name='" + keys + "' value='" + formParams[keys] + "'>";
            }
            outputHTML += "</tbody>";
            outputHTML += "</table>";
            outputHTML += "<script type='text/javascript'>";
            outputHTML += "document.getElementById('redirectForm').submit();";
            outputHTML += "</script>";
            outputHTML += "</form>";
            outputHTML += "</body>";
            outputHTML += "</html>";
            return outputHTML;
        }
    }
}