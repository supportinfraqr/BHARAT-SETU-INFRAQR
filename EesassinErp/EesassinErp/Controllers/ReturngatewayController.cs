using BAL;
using System.Collections.Generic;
using System.Web.Mvc;

namespace EesassinErp.Controllers
{
    public class ReturngatewayController : Controller
    {
        // GET: Returngateway
        public void ReturnResponse()
        {
            Dictionary<string, string> parameters = new Dictionary<string, string>();
            foreach (string key in Request.Form.Keys)
            {
                parameters.Add(key.Trim(), Request.Form[key].Trim());
            }
            string paymentStatus = parameters["txStatus"];
            string paymode = parameters["paymentMode"];
            string txnId = parameters["orderId"];
            string TransId = parameters["referenceId"];
            string orderAmount = parameters["orderAmount"];

            UpdateTransactions(parameters["orderId"], parameters["paymentMode"], parameters["txStatus"], parameters["referenceId"], parameters["orderAmount"]);


        }
        public void UpdateTransactions(string OrderId, string PaymentMode, string PaymentStatus, string TransId, string TotalAmount)
        {
            PaymentBAL obj = new PaymentBAL()
            {

                OrderId = OrderId,
                PaymentStatus = PaymentStatus,
                PaymentMode = PaymentMode,
                TransId = TransId,
                TotalAmount = TotalAmount
            };
            string result = DAL.DLL.UpdateTransactions(obj).ToString();

            Response.Redirect("../RetailSection/thankyou?" + OrderId);
        }

    }
}