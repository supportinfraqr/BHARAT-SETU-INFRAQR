// mailer.js
const nodemailer = require('nodemailer');
const { initModels } = require('../../models/indexModel');
const { encrypt, decrypt } = require('../../utils/encryption');
const { resolveLoginUrl } = require('../../config/systemConfig');


const smtpConfig = {
  gmail: { host: "smtp.gmail.com", port: 465, secure: true },
  outlook: { host: "smtp-mail.outlook.com", port: 587, secure: false },
  office365: { host: "smtp.office365.com", port: 587, secure: false },
  yahoo: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
  zoho: { host: "smtp.zoho.in", port: 465, secure: true },
  icloud: { host: "smtp.mail.me.com", port: 587, secure: false },
  protonmail: { host: "smtp.protonmail.com", port: 465, secure: true },
  aol: { host: "smtp.aol.com", port: 465, secure: true },
  gmx: { host: "mail.gmx.com", port: 587, secure: false },
  yandex: { host: "smtp.yandex.com", port: 465, secure: true },
  fastmail: { host: "smtp.fastmail.com", port: 465, secure: true }
};

const resolveProviderKey = (providerStr = '') => {
  const p = String(providerStr || '').toLowerCase().trim();
  if (!p) return 'gmail';

  if (p.includes('zoho')) return 'zoho';
  if (p.includes('gmail')) return 'gmail';
  if (p.includes('outlook')) return 'outlook';
  if (p.includes('office365') || p.includes('office 365') || p.includes('office')) return 'office365';
  if (p.includes('yahoo')) return 'yahoo';
  if (p.includes('icloud') || p.includes('apple')) return 'icloud';
  if (p.includes('proton')) return 'protonmail';
  if (p.includes('aol')) return 'aol';
  if (p.includes('gmx')) return 'gmx';
  if (p.includes('yandex')) return 'yandex';
  if (p.includes('fastmail')) return 'fastmail';

  return p.replace(/[^a-z0-9]/g, '');
};

const createTransporter = (orgEmailConfig = null) => {
  let providerKey = 'gmail';
  let email = process.env.NODEMAILER_EMAIL;
  let appPassword = process.env.NODEMAILER_PASSWORD;


  if (orgEmailConfig && orgEmailConfig.status === true) {
    providerKey = resolveProviderKey(orgEmailConfig.provider || '');
    email = orgEmailConfig.email || email;
    appPassword = decrypt(orgEmailConfig.appPassword) || appPassword;
  } else {
    if (process.env.NODEMAILER_PROVIDER) {
      providerKey = resolveProviderKey(process.env.NODEMAILER_PROVIDER);
    }
  }

  const config = smtpConfig[providerKey];
  if (!config) {
    throw new Error(`SMTP configuration not found for provider: "${providerKey}"`);
  }
  if (!email || !appPassword) {
    throw new Error(`Missing email credentials for provider "${providerKey}". Provide via org config or env variables (EMAIL_USER & EMAIL_PASSWORD).`);
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: Boolean(config.secure),
    auth: {
      user: email,
      pass: appPassword
    }
    // tls: { rejectUnauthorized: false } // uncomment if needed for self-signed certs
  });

  return transporter;
};

/**
 * sendEmail returns standardized object:
 * { status: 'success', info } or { status: 'error', message, error }
 *
 * orgEmailConfig: { provider, email, appPassword, status }
 * options: { from, to, subject, html, text, attachments }
 */
const sendEmail = async (org_uuid, options = {}) => {
  try {

    const { OrganizationModel } = await initModels(org_uuid);

    const org = await OrganizationModel.findById(org_uuid);

    if (!org) {
      return { status: 'error', message: 'Organization not found' };
    }

    const orgEmailConfig = org?.sendEmailConfig || null;
    const { from, to, subject, html, text, attachments } = options || {};

    if (!to) return { status: 'error', message: '`to` address is required' };

    // if orgEmailConfig.status === true, validate required fields early
    if (orgEmailConfig && orgEmailConfig.status === true) {
      if (!orgEmailConfig.provider || !orgEmailConfig.email || !orgEmailConfig.appPassword) {
        return { status: 'error', message: 'Organization email config incomplete (provider, email, appPassword required when status=true).' };
      }
    }

    const transporter = createTransporter(orgEmailConfig);

    const fallbackFrom = (orgEmailConfig && orgEmailConfig.status === true) ? orgEmailConfig.email : process.env.NODEMAILER_EMAIL;
    const mailFrom = from || fallbackFrom;
    if (!mailFrom) return { status: 'error', message: '`from` address is required (provide options.from, org config email, or set process.env.EMAIL_USER).' };

    const mailOptions = {
      from: mailFrom,
      to,
      subject: subject || '',
      html: html || undefined,
      text: text || undefined,
      attachments: attachments || undefined
    };

    // Optional verify - useful for debugging; comment out in high throughput cases
    // await transporter.verify();

    const info = await transporter.sendMail(mailOptions);

    // Normalize success response
    return { status: 'success', info };
  } catch (error) {
    // Include helpful error message but avoid leaking secrets
    return { status: 'error', message: error.message || 'Failed to send email', error: (error && error.stack) ? error.stack : error };
  }
};


const sendWelcomeEmail = async ({ org_uuid, employee, loginEmail, rawPassword, req }) => {
  try {
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    const empName = `${firstName} ${lastName}`.trim() || 'Employee';

    let orgName = employee.organizationName || employee.organizationId || 'our organization';
    try {
      const { OrganizationModel } = await initModels(org_uuid);
      const organization = await OrganizationModel.findById(org_uuid);
      if (organization && organization.organizationName) {
        orgName = organization.organizationName;
      }
    } catch (orgError) {
      console.warn('Unable to resolve organization name for welcome email:', orgError.message);
    }

    const loginUrl = resolveLoginUrl(req);
    const subject = `Welcome to ${orgName}!`;

    const html = `
      <p>Hi ${empName},</p>
      <p>Welcome to <strong>${orgName}</strong>! We are excited to have you on board.</p>

      <p>Your login details are as follows:</p>
      <ul>
        <li><strong>Email:</strong> ${loginEmail}</li>
        ${rawPassword ? `<li><strong>Temporary Password:</strong> ${rawPassword}</li>` : ''}
        <li><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
      </ul>

      <p>
        <a href="${loginUrl}" style="display:inline-block;background-color:#0ea5e9;color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:600;">
          Login to your account
        </a>
      </p>

      <p>Please login and change your password after first login.</p>

      <p>Regards,<br/>HR Team<br/>${orgName}</p>
    `;

    const result = await sendEmail(org_uuid, {
      to: loginEmail,
      subject,
      html,
    });

    return result;
  } catch (err) {
    console.error('Error sending welcome email:', err);
    return { status: 'error', message: err.message || 'Error sending welcome email' };
  }
}



const sendPasswordChangeEmail = async ({ org_uuid, employee, loginEmail, newPassword }) => {
  try {
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    const empName = `${firstName} ${lastName}`.trim() || 'Employee';

    let orgName = employee.organizationName || employee.organizationId || 'our organization';
    try {
      const { OrganizationModel } = await initModels(org_uuid);
      const organization = await OrganizationModel.findById(org_uuid);
      if (organization && organization.organizationName) {
        orgName = organization.organizationName;
      }
    } catch (orgError) {
      console.warn('Unable to resolve organization name for password change email:', orgError.message);
    }

    const subject = `Your password has been changed for ${orgName}`;

    const html = `
      <p>Hi ${empName},</p>
      <p>This is to confirm that your password for <strong>${orgName}</strong> has been changed successfully.</p>

      <p>Your updated login details are below:</p>
      <ul>
        <li><strong>Email:</strong> ${loginEmail}</li>
        <li><strong>New Password:</strong> ${newPassword}</li>
      </ul>

      <p>If you did not request this change, please contact your HR or system administrator immediately.</p>

      <p>Regards,<br/>HR Team<br/>${orgName}</p>
    `;

    const result = await sendEmail(org_uuid, {
      to: loginEmail,
      subject,
      html,
    });

    return result;
  } catch (err) {
    console.error('Error sending password change email:', err);
    return { status: 'error', message: err.message || 'Error sending password change email' };
  }
};

const candidateJoiningEmail = async ({ org_uuid, employee, loginEmail, rawPassword, loginUrl, frontendUrl, req }) => {
  try {
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    const empName = `${firstName} ${lastName}`.trim() || 'Candidate';
    const passedUrl = [loginUrl, frontendUrl].find((url) => url && !/localhost|127\.0\.0\.1/i.test(url));
    const portalUrl = passedUrl || resolveLoginUrl(req);

    let orgName = employee.organizationName || employee.organizationId || 'our organization';
    try {
      const { OrganizationModel } = await initModels(org_uuid);
      const organization = await OrganizationModel.findById(org_uuid);
      if (organization && organization.organizationName) {
        orgName = organization.organizationName;
      }
    } catch (orgError) {
      console.warn('Unable to resolve organization name for candidate joining email:', orgError.message);
    }

    const subject = `Candidate Joining Form - ${orgName}`;

    const html = `
      <p>Hi ${empName},</p>
      <p>Welcome to <strong>${orgName}</strong>! We are excited to have you on board.</p>

      <p>Your login details are as follows:</p>
      <ul>
        <li><strong>Email:</strong> ${loginEmail}</li>
        ${rawPassword ? `<li><strong>Temporary Password:</strong> ${rawPassword}</li>` : ''}
        <li><strong>Login URL:</strong> <a href="${portalUrl}">${portalUrl}</a></li>
      </ul>

      <p>Please login to your account and fill in your joining form to complete the onboarding process.</p>

      <p><strong><a href="${portalUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Click here to access the portal</a></strong></p>

      <p>Once you log in, you will find the joining form in your candidate portal. Please fill in all the required information carefully.</p>

      <p>If you have any questions or need assistance, please contact the HR team.</p>

      <p>Regards,<br/>HR Team<br/>${orgName}</p>
    `;

    const result = await sendEmail(org_uuid, {
      to: loginEmail,
      subject,
      html,
    });

    return result;
  } catch (err) {
    console.error('Error sending candidate joining email:', err);
    return { status: 'error', message: err.message || 'Error sending candidate joining email' };
  }
};

const formatMeetingDate = (dateValue) => {
  if (!dateValue) return 'Not specified';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const sendPreResignationConcernEmail = async ({
  org_uuid,
  employee,
  manager,
  preResignation,
}) => {
  try {
    if (!manager?.email) {
      return { status: 'error', message: 'Reporting manager email not found' };
    }

    const { OrganizationModel } = await initModels(org_uuid);
    const organization = await OrganizationModel.findById(org_uuid).select('name organizationName');
    const orgName = organization?.organizationName || organization?.name || 'Organization';

    const employeeName =
      `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee';
    const managerName =
      `${manager?.firstName || ''} ${manager?.lastName || ''}`.trim() || 'Reporting Manager';

    const concernTypes = Array.isArray(preResignation?.concernType)
      ? preResignation.concernType.join(', ')
      : preResignation?.concernType || 'Not specified';

    const subject = `Concern Request Raised by ${employeeName}`;

    const html = `
      <p>Hi ${managerName},</p>
      <p><strong>${employeeName}</strong> has raised  concern and selected you as the contact person.</p>

      <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td><strong>Concern Type</strong></td><td>${concernTypes}</td></tr>
        <tr><td><strong>Description</strong></td><td>${preResignation?.description || '—'}</td></tr>
        <tr><td><strong>Preferred Mode</strong></td><td>${preResignation?.preferredModeOfDiscussion || '—'}</td></tr>
        <tr><td><strong>Suggested Meeting</strong></td><td>${formatMeetingDate(preResignation?.suggestedMeetingDate)}</td></tr>
        <tr><td><strong>Employee Email</strong></td><td>${employee?.email || '—'}</td></tr>
      </table>

      <p>Please review this concern and connect with the employee at the earliest.</p>
      <p>Regards,<br/>HRMS<br/>${orgName}</p>
    `;

    return sendEmail(org_uuid, {
      to: manager.email,
      subject,
      html,
    });
  } catch (err) {
    console.error('Error sending pre-resignation concern email:', err);
    return { status: 'error', message: err.message || 'Error sending pre-resignation concern email' };
  }
};

module.exports = {
  createTransporter,
  sendEmail,
  resolveProviderKey,
  sendWelcomeEmail,
  sendPasswordChangeEmail,
  candidateJoiningEmail,
  sendPreResignationConcernEmail,
};
