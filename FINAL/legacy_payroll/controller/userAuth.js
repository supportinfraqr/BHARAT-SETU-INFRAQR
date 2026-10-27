const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SystemUser = require('../models/systemUserModel');
const { initModels } = require('../models/indexModel');
const { Category, CategorySchema } = require('../models/userCategoryModel');
const UserJwt = require('../models/userJWTModel');


exports.login = async (req, res) => {
    try {
        const { systemUserEmail: email, systemUserPassword: enteredPassword } = req.body;

        const user = await SystemUser.findOne({ systemUserEmail: email }).lean();
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'No user found with this email',
            });
        }

        // Check if the user's organization is active (if not superadmin)
        if (user.categoryId.toString() !== "576beaf0ed777ab0145122d1") {
            const linkedOrganization = user.linkSystemUser?.[0];
            if (!linkedOrganization || linkedOrganization.status !== true) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Your organization is inactive. Please contact admin.',
                });
            }
            if (linkedOrganization.adminLoginLock !== false) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Your Profile is Locked. Please contact Admin/Hr.',
                });
            }
        }

        // Verify the entered password
        const isPasswordMatch = await bcrypt.compare(enteredPassword, user.systemUserPassword);
        if (!isPasswordMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid password',
            });
        }

        // Determine the category model and fetch category details
        let systemuserCategory;
        if (
            user.categoryId.toString() === "576beaf0ed777ab0145122d1" ||
            user.categoryId.toString() === "576beaf0ed777ab0145122d2"
        ) {
            systemuserCategory = await Category.findById(user.categoryId).lean();
        } else {
            const linkedOrganization = user.linkSystemUser?.[0]?.databaseName;
            const { CategoryModel } = await initModels(linkedOrganization);

            systemuserCategory = await CategoryModel.findById(user.categoryId).lean();
        }

        if (!systemuserCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'System User Category not found',
            });
        }

        // Generate the JWT token
        const privateKey = process.env.PRIVATE_KEY || 'default_private_key';
        const tokenPayload = {
            email: user.systemUserEmail,
            userId: user._id,
            empId:user.linkSystemUser?.[0]?.employeeId,
            categoryId: user.categoryId,
            permissions: systemuserCategory.permissions,
        };
        const token = jwt.sign(tokenPayload, privateKey, { expiresIn: '24h' });


        // Store or update token in the database
        await UserJwt.findOneAndUpdate(
            { systemUserId: user._id },
            { $set: { currentToken: token } },
            { upsert: true }
        );

        // Respond with success
        return res.status(200).json({
            message: 'Login successfully',
            status: 'success',
            token,
            data: user,
            permissions: systemuserCategory.permissions,

        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.logOut = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId is required',
            });
        }


        let updatedData = await UserJwt.findOneAndUpdate(
            { systemUserId: userId },
            { $set: { currentToken: null } }
        );

        if (!updatedData) {
            return res.status(404).json({
                status: 'error',
                message: 'jwt  not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'logout successfully',
        });

    } catch (error) {
        console.error('Error logout:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};