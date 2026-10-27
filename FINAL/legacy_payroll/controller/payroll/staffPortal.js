const { initModels } = require('../../models/indexModel');
const { sendResponse, handleError } = require('../../utils/responce');


exports.updateStaffPortalSettings = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { StaffPortalModel } = await initModels(org_uuid);

    const {
      enablePortalAccess,
      bannerMessage,
      bannerEndDate,
      portalContactEmail,
    } = req.body;

    const data = await StaffPortalModel.findOneAndUpdate(
      { organizationId: org_uuid },
      {
        organizationId: org_uuid,
        enablePortalAccess,
        bannerMessage,
        bannerEndDate,
        portalContactEmail,
      },
      {
        new: true,
        upsert: true,
      }
    );

    return sendResponse(res, 200, true, 'Staff portal settings updated successfully', data);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getStaffPortalSettings = async (req, res) => {
  try {
    const { org_uuid } = req.headers;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { StaffPortalModel } = await initModels(org_uuid);

    const data = await StaffPortalModel.findOne({ organizationId: org_uuid });
    return sendResponse(res, 200, true, 'Staff portal settings fetched successfully', data || {});
  } catch (err) {
    return handleError(res, err);
  }
};

exports.addWebTab = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { StaffPortalModel } = await initModels(org_uuid);

    const { title, url, isVisible } = req.body;

    if (!title || !url) {
      return sendResponse(res, 400, false, 'Title and URL are required');
    }

    let portal = await StaffPortalModel.findOne({ organizationId: org_uuid });

    if (!portal) {
      portal = new StaffPortalModel({
        organizationId: org_uuid,
        webTabs: [],
      });
    }

    portal.webTabs.push({
      title,
      url,
      isVisible: isVisible !== undefined ? isVisible : true,
    });

    await portal.save();

    return sendResponse(res, 200, true, 'Web tab added successfully', portal);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateWebTab = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { tabId } = req.params;
    const { title, url, isVisible } = req.body;
    const { StaffPortalModel } = await initModels(org_uuid);

    const portal = await StaffPortalModel.findOne({ organizationId: org_uuid });

    if (!portal) {
      return sendResponse(res, 404, false, 'Staff portal not found');
    }

    const tab = portal.webTabs.id(tabId);
    if (!tab) {
      return sendResponse(res, 404, false, 'Web tab not found');
    }

    if (title !== undefined) tab.title = title;
    if (url !== undefined) tab.url = url;
    if (isVisible !== undefined) tab.isVisible = isVisible;

    portal.markModified('webTabs');
    await portal.save();

    return sendResponse(res, 200, true, 'Web tab updated successfully', portal);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteWebTab = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { tabId } = req.params;
    const { StaffPortalModel } = await initModels(org_uuid);

    const portal = await StaffPortalModel.findOne({ organizationId: org_uuid });

    if (!portal) {
      return sendResponse(res, 404, false, 'Staff portal not found');
    }

    portal.webTabs.pull(tabId);
    await portal.save();

    return sendResponse(res, 200, true, 'Web tab deleted successfully', portal);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getAllWebTabs = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { StaffPortalModel } = await initModels(org_uuid);

    const portal = await StaffPortalModel.findOne({ organizationId: org_uuid });

    return sendResponse(res, 200, true, 'Web tabs fetched successfully', portal?.webTabs || []);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.updateEmployeePreferences = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { EmployeePreferencesModel } = await initModels(org_uuid);

    const {
      language,
      dateFormat,
      timeZone,
      emailNotifications,
      smsNotifications,
      theme,
    } = req.body;

    const preferences = await EmployeePreferencesModel.findOneAndUpdate(
      { organizationId: org_uuid, employeeId },
      {
        organizationId: org_uuid,
        employeeId,
        language: language || 'en',
        dateFormat: dateFormat || 'DD/MM/YYYY',
        timeZone: timeZone || 'UTC',
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        smsNotifications: smsNotifications !== undefined ? smsNotifications : false,
        theme: theme || 'light',
      },
      { new: true, upsert: true }
    );

    return sendResponse(res, 200, true, 'Employee preferences updated successfully', preferences);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.getEmployeePreferences = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;
    if (!org_uuid) {
      return sendResponse(res, 400, false, 'Organization UUID missing');
    }
    const { employeeId } = req.params;
    const { EmployeePreferencesModel } = await initModels(org_uuid);

    const preferences = await EmployeePreferencesModel.findOne({
      organizationId: org_uuid,
      employeeId,
    });

    return sendResponse(res, 200, true, 'Employee preferences fetched successfully', preferences || {});
  } catch (err) {
    return handleError(res, err);
  }
};
