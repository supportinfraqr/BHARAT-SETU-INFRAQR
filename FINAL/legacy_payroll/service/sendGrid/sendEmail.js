// utils/sendEmail.js
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { initModels } = require('../../models/indexModel');


/**
 * Send Email Function
 * @param {Object} options
 * @param {String} options.orgId - Organization ID (जिस org से email भेजना है)
 * @param {String} options.to - Receiver email
 * @param {String} options.subject - Email subject
 * @param {String} options.message - Email body text
 * @param {String} [options.html] - Email body html
 */
async function sendOrgEmail({org_uuid, orgId, to, subject, message, html }) {
    try {
        const { OrganizationModel } = await initModels(org_uuid);
        const org = await OrganizationModel.findById(orgId);

        const fromEmail = org?.sendGridEmail || process.env.SENDGRID_EMAIL;

        console.log(fromEmail,"fromEmail")

        const msg = {
            to,
            from: fromEmail,
            subject,
            text: message,
            html: html || `<p>${message}</p>`,
        };

        await sgMail.send(msg);

        return { status: "success", message: "Email sent successfully" };
    } catch (error) {
        console.error("SendGrid Error:", error);
        return { status: "error", message: "Failed to send email", error };
    }
}

async function sendOtpEmail({to, subject, message, html }) {
    try {
        const fromEmail =  process.env.SENDGRID_EMAIL;

        const msg = {
            to,
            from: fromEmail,
            subject,
            text: message,
            html: html || `<p>${message}</p>`,
        };

        await sgMail.send(msg);

        return { status: "success", message: "Email sent successfully" };
    } catch (error) {
        console.error("SendGrid Error:", error);
        return { status: "error", message: "Failed to send email", error };
    }
}

module.exports = {sendOrgEmail,sendOtpEmail};
