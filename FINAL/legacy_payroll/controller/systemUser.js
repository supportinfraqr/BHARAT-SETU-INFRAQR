const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const path = require('path');
const SystemUser = require('../models/systemUserModel');
const { initModels } = require('../models/indexModel');
const UserJwt = require('../models/userJWTModel');
const { sendEmail } = require('../service/nodemailer/mailerConfig');

exports.addSystemUser = async (req, res) => {
    try {
        const { systemUserName, systemUserPassword, systemUserEmail, categoryId } = req.body;

        const emailExists = await SystemUser.findOne({ systemUserEmail });

        if (emailExists) {
            return res.status(409).json({ message: 'Email is already present in the database' });
        }

        const SystemUserData = new SystemUser({
            systemUserName,
            systemUserPassword: bcrypt.hashSync(systemUserPassword, 10),
            systemUserEmail,
            categoryId
        });

        const savedSystemUserData = await SystemUserData.save();


        // Respond with success status
        return res.status(201).send({
            status: 'success',
            message: 'saved successfully',
            data: savedSystemUserData
        });

    } catch (error) {
        console.error('Error saving SystemUser:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
}

exports.updateSystemUser = async (req, res) => {
    try {
        const { systemUserId } = req.params;
        const { systemUserName, systemUserPassword, systemUserEmail, categoryId } = req.body;

        const systemUser = await SystemUser.findById(systemUserId);
        if (!systemUser) {
            return res.status(404).json({
                status: 'error',
                message: 'System user not found',
            });
        }

        // Optional: Hash password if it has been updated
        if (systemUserPassword) {
            systemUser.systemUserPassword = bcrypt.hashSync(systemUserPassword, 10);
        }

        // Update other fields
        systemUser.systemUserName = systemUserName || systemUser.systemUserName;
        systemUser.systemUserEmail = systemUserEmail || systemUser.systemUserEmail;
        systemUser.categoryId = categoryId || systemUser.categoryId;

        const updatedSystemUser = await systemUser.save();

        return res.status(200).json({
            status: 'success',
            message: 'System user updated successfully',
            data: updatedSystemUser,
        });
    } catch (error) {
        console.error('Error updating system user:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteSystemUser = async (req, res) => {
    try {
        const { systemUserId } = req.params;

        const systemUser = await SystemUser.findByIdAndDelete(systemUserId);
        if (!systemUser) {
            return res.status(404).json({
                status: 'error',
                message: 'System user not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'System user deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting system user:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getSystemUserById = async (req, res) => {
    try {
        const { systemUserId } = req.params;

        let systemUser = await SystemUser.findById(systemUserId);
        if (!systemUser) {
            return res.status(404).json({
                status: 'error',
                message: 'System user not found',
            });
        }


        return res.status(200).json({
            status: 'success',
            message: 'System user fetched successfully',
            data: systemUser,
        });
    } catch (error) {
        console.error('Error fetching system user:', error);
        return res.status(500).send({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllCreateOrg = async (req, res) => {
    try {
        const { systemUserId } = req.params;
        const { organizationName } = req.query;

        // Find the system user by their ID
        let systemUser = await SystemUser.findById(systemUserId);
        let totalSystemUser = await SystemUser.countDocuments();

        if (!systemUser) {
            return res.status(404).json({
                status: 'error',
                message: 'System user not found',
            });
        }

        const createOrg = systemUser.createOrg;

        // if (!createOrg || createOrg.length === 0) {
        //     return res.status(404).json({
        //         status: 'error',
        //         message: 'No organizations found for the user',
        //     });
        // }

        let totalOrganizations = 0;
        let activeOrganizations = 0;
        let inactiveOrganizations = 0;

        const orgDataPromises = createOrg.map(async (org) => {
            // Initialize the model for the organization's database
            const { OrganizationModel, SideModel } = await initModels(org.databaseName);

            // Fetch the organization data with optional filtering by organization name
            const query = { _id: org.organizationId };
            if (organizationName) {
                query.organizationName = { $regex: organizationName, $options: 'i' };
            }
            const orgData = await OrganizationModel.findOne(query);

            // Update organization counters based on the boolean status field
            if (orgData) {
                totalOrganizations++;
                if (orgData.status === true) {
                    activeOrganizations++;
                } else {
                    inactiveOrganizations++;
                }
            }

            // Fetch the number of sides for this organization
            let sideCount
            sideCount = await OrganizationModel.countDocuments();
            sideCount = sideCount - 1

            return {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                databaseName: org.databaseName,
                organizationDetails: orgData || null,
                sideCount
            };
        });

        // Wait for all promises to resolve
        const allOrgData = await Promise.all(orgDataPromises);

        // Filter out organizations with null details (if no match found)
        const filteredOrgData = allOrgData.filter(org => org.organizationDetails);

        // Return the response with organization data and the counts
        return res.status(200).json({
            status: 'success',
            message: 'Organizations retrieved successfully',
            data: {
                totalOrganizations,
                activeOrganizations,
                inactiveOrganizations,
                totalSystemUser,
                organizations: filteredOrgData,
            },
        });

    } catch (error) {
        console.error('Error fetching systemUser organizations:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.orgStatus = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { status } = req.body;

        const { OrganizationModel, EmployeeModel } = await initModels(orgId);

        const updatedOrganization = await OrganizationModel.findByIdAndUpdate(
            orgId,
            { status },
            { new: true }
        );

        if (!updatedOrganization) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization not found',
            });
        }

        const result = await SystemUser.updateMany(
            { 'linkSystemUser.databaseName': orgId },
            {
                $set: {
                    'linkSystemUser.$.status': status,
                },
            }
        );

        return res.status(200).json({
            status: 'success',
            message: `Organization and system user statuses updated successfully`,
            organization: updatedOrganization,
            updatedSystemUsers: result.modifiedCount,
        });
    } catch (error) {
        console.error('Error updating organization status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await SystemUser.findOne({ systemUserEmail: email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }


        const org_uuid = user.linkSystemUser?.[0]?.databaseName;

        // Reset OTP attempts if last OTP was more than 24 hrs ago
        if (user.otpLastSent && new Date() - user.otpLastSent > 24 * 60 * 60 * 1000) {
            user.otpAttempts = 0;
        }

        if (user.otpAttempts >= 3) {
            return res.status(429).json({ status: "error", message: "Max OTP limit reached. Try after 24 hrs" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // const otp = "123456"

        user.systemUserResetPassword = otp;
        user.systemUserResetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 min
        user.otpAttempts += 1;
        user.otpLastSent = Date.now();

        await user.save();


        const result = await sendEmail(org_uuid, {
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
        });

        if (result.status === "error") {
            return res.status(500).json(result);
        }

        res.json({ status: "success", message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Something went wrong", error: error.message });
    }
};

exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await SystemUser.findOne({ systemUserEmail: email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const org_uuid = user.linkSystemUser?.[0]?.databaseName;

        if (user.otpAttempts >= 3) {
            return res.status(429).json({ status: "error", message: "Max OTP limit reached. Try after 24 hrs" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // const otp = "123456"


        user.systemUserResetPassword = otp;
        user.systemUserResetPasswordExpires = Date.now() + 10 * 60 * 1000;
        user.otpAttempts += 1;
        user.otpLastSent = Date.now();

        await user.save();

        const result = await sendEmail(org_uuid, {
            to: email,
            subject: "Password Reset OTP (Resent)",
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
        });

        if (result.status === "error") {
            return res.status(500).json(result);
        }

        res.json({ status: "success", message: "OTP resent successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Something went wrong", error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await SystemUser.findOne({ systemUserEmail: email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        if (user.systemUserResetPassword !== otp) {
            return res.status(400).json({ status: "error", message: "Invalid OTP" });
        }

        if (Date.now() > user.systemUserResetPasswordExpires) {
            return res.status(400).json({ status: "error", message: "OTP expired" });
        }

        res.json({ status: "success", message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Something went wrong", error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await SystemUser.findOne({ systemUserEmail: email });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        // Update password
        user.systemUserPassword = await bcrypt.hash(newPassword, 10);

        // Clear OTP data
        user.systemUserResetPassword = undefined;
        user.systemUserResetPasswordExpires = undefined;
        user.otpAttempts = 0;

        await UserJwt.findOneAndUpdate(
            { systemUserId: user._id },
            { $set: { currentToken: null } }
        );

        await user.save();

        res.json({ status: "success", message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Something went wrong", error: error.message });
    }
};

exports.deleteOrganizationDatabase = async (req, res) => {
    try {
        const { org_uuid, systemUserId } = req.body;

        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'org_uuid is required'
            });
        }

        if (!systemUserId) {
            return res.status(400).json({
                status: 'error',
                message: 'systemUserId is required'
            });
        }

        console.log(`🗑️ Starting database deletion for: ${org_uuid}`);

        // Step 1: Verify system user authorization
        const user = await SystemUser.findById(systemUserId);
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "System user not found"
            });
        }

        if (
            !Array.isArray(user.createOrg) ||
            !user.createOrg.some(
                org => String(org.databaseName) === String(org_uuid)
            )
        ) {
            return res.status(403).json({
                status: "error",
                message: "Unauthorized: You don't have permission to delete this organization"
            });
        }


        // Step 2: Delete all system users linked to this organization's employees
        const systemUserDeleteResult = await SystemUser.deleteMany({
            'linkSystemUser.databaseName': org_uuid
        });

        console.log(`✅ Deleted ${systemUserDeleteResult.deletedCount} system users`);

        // Step 3: Remove organization from createOrg in system users
        const createOrgDeleteResult = await SystemUser.updateMany(
            {
                'createOrg.databaseName': org_uuid
            },
            {
                $pull: {
                    createOrg: { databaseName: org_uuid }
                }
            }
        );

        console.log(`✅ Removed organization from ${createOrgDeleteResult.modifiedCount} system user createOrg arrays`);

        // Step 4: Delete the entire database
        try {
            const { getDatabaseConnection } = require('../config/mongo');
            const connection = await getDatabaseConnection(org_uuid);

            await connection.dropDatabase();
            console.log(`✅ Database ${org_uuid} dropped successfully`);

            // Close the connection
            await connection.close();
            console.log(`✅ Connection closed for ${org_uuid}`);
        } catch (dbError) {
            console.error(`⚠️ Database deletion error: ${dbError.message}`);
            // Continue even if database doesn't exist
        }

        return res.status(200).json({
            status: 'success',
            message: 'Organization database deleted successfully',
            details: {
                databaseName: org_uuid,
                systemUsersDeleted: systemUserDeleteResult.deletedCount,
                createOrgEntriesRemoved: createOrgDeleteResult.modifiedCount
            }
        });

    } catch (error) {
        console.error('❌ Error deleting organization database:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to delete organization database',
            error: error.message
        });
    }
};