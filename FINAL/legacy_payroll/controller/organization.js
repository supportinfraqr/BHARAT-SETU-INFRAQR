const mongoose = require('mongoose');
const Organization = require('../models/organizationModel');
const SystemUser = require('../models/systemUserModel');
const { getDatabaseConnection } = require('../config/mongo');
const { initModels } = require('../models/indexModel');
const { uploadFile } = require('../service/cloudUploade/clodeUpload');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendResponse, handleError } = require('../utils/responce');
const { sendEmail } = require('../service/nodemailer/mailerConfig');


exports.addOrganization = async (req, res) => {
    try {
        const {
            organizationName,
            domainName,
            brn,
            gst,
            industryId,
            industry,
            foundedDate,
            taxId,
            organizationType,
            logo,
            status,
            organizationIcon,
            organizationAddress,
            contactDetails,
            email,
            phoneNumber,
            registrationDate,
            employeesCount,
            isVerified,
            systemUserId
        } = req.body;

        // Validate required fields
        if (!organizationName || !systemUserId) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization name and system user ID are required'
            });
        }

        // Generate a new ObjectId for the organization
        const organizationId = new mongoose.Types.ObjectId();

        // Connect to the new organization's database (skip validation since org is being created now)
        const OrganizationDB = await getDatabaseConnection(organizationId, true);
        if (!OrganizationDB) {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to connect to organization database'
            });
        }

        const OrganizationModel = OrganizationDB.model('Organization', Organization);

        const newOrganization = new OrganizationModel({
            _id: organizationId,
            organizationName,
            domainName,
            brn,
            gst,
            systemUserId,
            industryId,
            industry,
            foundedDate,
            taxId,
            organizationType,
            logo,
            status,
            organizationIcon,
            organizationAddress,
            contactDetails,
            email,
            phoneNumber,
            registrationDate: registrationDate || Date.now(),
            employeesCount,
            isVerified
        });

        // Save the organization to the database
        const savedOrganization = await newOrganization.save();

        // Auto-create default LOP leave type with reason
        try {
            const { createDefaultLOPLeaveType } = require('./leaveController/leaveService');
            await createDefaultLOPLeaveType(organizationId.toString(), organizationId);
        } catch (lopError) {
            console.error('Warning: Failed to create LOP:', lopError.message);
        }

        // Update the system user
        const userData = await SystemUser.findByIdAndUpdate(
            systemUserId,
            {
                $push: {
                    createOrg: {
                        organizationId: savedOrganization._id,
                        databaseName: savedOrganization._id.toString(),
                        organizationName: organizationName,
                    }
                }
            },
            { new: true }
        );

        if (!userData) {
            return res.status(404).json({
                status: 'error',
                message: 'System user not found'
            });
        }

        // Respond with success status
        return res.status(201).json({
            status: 'success',
            message: 'Organization added successfully',
            data: savedOrganization
        });

    } catch (error) {
        console.error('Error adding organization:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updateOrganization = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { organizationId } = req.params;
        const updateData = req.body;

        const { OrganizationModel } = await initModels(org_uuid);

        // Find the organization by ID and update it
        const updatedOrganization = await OrganizationModel.findByIdAndUpdate(
            organizationId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedOrganization) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Organization updated successfully',
            data: updatedOrganization
        });

    } catch (error) {
        console.error('Error updating organization:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getOrganization = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { organizationId } = req.params;

        const { OrganizationModel } = await initModels(org_uuid);

        // Find the organization by ID
        const organization = await OrganizationModel.findById(organizationId);

        if (!organization) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: organization
        });

    } catch (error) {
        console.error('Error retrieving organization:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteOrganization = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { organizationId } = req.params;

        const { OrganizationModel } = await initModels(org_uuid);

        // Find and delete the organization by ID
        const deletedOrganization = await OrganizationModel.findByIdAndDelete(organizationId);

        if (!deletedOrganization) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Organization deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting organization:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.lastOrgAccessed = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { organizationId } = req.params;

        const { OrganizationModel } = await initModels(org_uuid);

        // Find the organization by ID and update it
        const updatedOrganization = await OrganizationModel.findByIdAndUpdate(
            organizationId,
            { lastOrgAccessed: Date.now() },
            { new: true }
        );

        if (!updatedOrganization) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Organization updated successfully',
            data: updatedOrganization
        });

    } catch (error) {
        console.error('Error updating organization:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.orgLogo = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { organizationId } = req.params;
        const { OrganizationModel } = await initModels(org_uuid);

        // Check if a file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file using your uploadFile function
        const result = await uploadFile(req.file);
        if (!result) {
            return res.status(400).json({ message: 'File upload failed' });
        }

        // Update the employee record with the photo URL
        const data = await OrganizationModel.findByIdAndUpdate(
            organizationId,
            {
                $set: { logo: result.url }
            },
            { new: true }
        );

        if (!data) {
            return res.status(404).json({ message: 'organization not found' });
        }

        res.status(200).json({
            message: 'File uploaded successfully',
            url: data.logo,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            message: 'Failed to upload file',
            error: error.message
        });
    }
};

exports.sendEmailController = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        // const { OrganizationModel } = await initModels(org_uuid);

        // const org = await OrganizationModel.findById(org_uuid);

        // if (!org) {
        //     return res.status(404).json({ status: 'error', message: 'Organization not found' });
        // }

        // const orgEmailConfig = org?.sendEmailConfig || null;



        const mailOptions = {
            from: req.body.from,
            to: req.body.to,
            subject: req.body.subject,
            html: req.body.html,
            text: req.body.text,
            attachments: req.body.attachments
        };
        const result = await sendEmail(org_uuid, mailOptions);

        if (result.status === "error") {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: 'Unexpected error', error: err.message });
    }
};

exports.updateEmailConfig = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, 'org uuid not found');
        }

        const { organizationId } = req.params;
        let updateData = req.body;

        const { OrganizationModel } = await initModels(org_uuid);

        const existingOrg = await OrganizationModel.findById(organizationId);
        if (!existingOrg) {
            return sendResponse(res, 404, false, 'Organization not found');
        }

        const oldConfig = existingOrg.sendEmailConfig || {};

        if (!updateData.appPassword) {
            updateData.appPassword = oldConfig.appPassword;  
        } else {
            updateData.appPassword = encrypt(updateData.appPassword);
        }

        const updatedOrganization = await OrganizationModel.findByIdAndUpdate(
            organizationId,
            { sendEmailConfig: { ...oldConfig, ...updateData } }, 
            { new: true, runValidators: true }
        );

        return sendResponse(res, 200, true, 'Email config updated successfully', updatedOrganization);

    } catch (error) {
        return handleError(res, error, 500);
    }
};

exports.getEmailConfig = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return sendResponse(res, 404, false, 'org uuid not found');
        }

        const { organizationId } = req.params;

        const { OrganizationModel } = await initModels(org_uuid);

        const organization = await OrganizationModel.findById(organizationId)
            .select('-__v');  // extra fields hide

        if (!organization) {
            return sendResponse(res, 404, false, 'Organization not found');
        }

        // 🔓 DECRYPT EMAIL APP PASSWORD
        if (organization.sendEmailConfig?.appPassword) {
            try {
                const plainPassword = decrypt(organization.sendEmailConfig.appPassword);
                organization.sendEmailConfig.appPassword = plainPassword;
            } catch (err) {
                console.log("Decryption Failed:", err);
                organization.sendEmailConfig.appPassword = null;  
            }
        }

        return sendResponse(
            res,
            200,
            true,
            'Email config fetched successfully',
            organization?.sendEmailConfig
        );

    } catch (error) {
        return handleError(res, error, 500);
    }
};

exports.getOrganizationWithLocations = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;

    if (!org_uuid) {
      return res.status(400).json({
        status: "error",
        message: "org_uuid is required in headers"
      });
    }

    const { OrganizationModel } = await initModels(org_uuid);

    // 🔹 1. Fetch MAIN organization
    const organization = await OrganizationModel.findById(org_uuid);

    if (!organization) {
      return res.status(404).json({
        status: "error",
        message: "Organization not found"
      });
    }

    // 🔹 2. Fetch all locations / branches
    const locations = await OrganizationModel.find({
      sideId: organization._id
    });

    return res.status(200).json({
      status: "success",
      data: {
        organization,
        locations
      }
    });

  } catch (error) {
    console.error("getOrganizationWithLocations error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getOrganizationsDropdown = async (req, res) => {
  try {
    const org_uuid = req.headers.org_uuid;

    if (!org_uuid) {
      return sendResponse(res, 400, false, "org_uuid is required in headers");
    }

    const { search } = req.query;

    const { OrganizationModel } = await initModels(org_uuid);

    // Build search filter
    const filter = {};
    if (search) {
      filter.$or = [
        { organizationName: { $regex: search, $options: 'i' } },
        { organizationType: { $regex: search, $options: 'i' } }
      ];
    }

    const organizations = await OrganizationModel.find(filter)
      .select('_id organizationName organizationType status logo orgPolicy.geoAttendance')
      .sort({ organizationName: 1 })
      .lean();

    return sendResponse(
      res, 
      200, 
      true, 
      "Organizations fetched successfully", 
      organizations
    );

  } catch (error) {
    console.error("getOrganizationsDropdown error:", error);
    return handleError(res, error);
  }
};
