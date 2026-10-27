const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const SystemUser = require('../models/systemUserModel');
const UserJwt = require('../models/userJWTModel');

exports.createCategory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { CategoryModel } = await initModels(org_uuid);

        const { name, permissions } = req.body;

        if (!name || !permissions || !Array.isArray(permissions)) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name and permissions (array) are required',
            });
        }
        
        const existingCategory = await CategoryModel.findOne({ name });
        if (existingCategory) {
            return res.status(409).json({
                status: 'error',
                message: 'Category with this name already exists',
            });
        }

        // Create and save the new category
        const categoryData = new CategoryModel({ name, permissions });
        const savedCategory = await categoryData.save();

        // Send success response
        return res.status(201).json({
            status: 'success',
            message: 'Category created successfully',
            data: savedCategory,
        });
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { CategoryModel } = await initModels(org_uuid);

        const categories = await CategoryModel.find();

        return res.status(200).json({
            status: 'success',
            message: 'Categories fetched successfully',
            data: categories,
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { categoryId } = req.params;
        const { CategoryModel } = await initModels(org_uuid);

        const category = await CategoryModel.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Category fetched successfully',
            data: category,
        });
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { categoryId } = req.params;
        const { name, permissions } = req.body;

        const { CategoryModel } = await initModels(org_uuid);

        // Validate request body
        if (!name || !permissions || !Array.isArray(permissions)) {
            return res.status(400).json({
                status: 'error',
                message: 'Category name and permissions (array) are required',
            });
        }

        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            categoryId,
            { name, permissions },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found',
            });
        }

        // Invalidate user tokens in the UserJwt collection
        await UserJwt.updateMany(
            { systemUserId: { $in: await SystemUser.find({ categoryId }).distinct('_id') } },
            { $set: { currentToken: null } }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Category updated successfully',
            data: updatedCategory,
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { categoryId } = req.params;
        const { CategoryModel, SystemUserModel } = await initModels(org_uuid);

        // Check if system users are linked to the category
        const linkedUsersCount = await SystemUser.countDocuments({ categoryId });

        if (linkedUsersCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete category. ${linkedUsersCount} users are linked to this category. Please remove or reassign users before deleting.`,
            });
        }

        // Delete the category
        const deletedCategory = await CategoryModel.findByIdAndDelete(categoryId);

        if (!deletedCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.changeEmployeeCategory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { categoryId, categoryName, employeeIds } = req.body;

        if (!categoryId || !categoryName) {
            return res.status(400).json({
                status: 'error',
                message: 'Both categoryId and categoryName are required',
            });
        }

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid array of employee IDs',
            });
        }

        // Initialize models
        const { CategoryModel, EmployeeModel } = await initModels(org_uuid);

        // Validate if the category exists
        const getCategory = await CategoryModel.findById(categoryId);
        if (!getCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found',
            });
        }

        let updatedEmployeesCount = 0;
        let failedEmployeeUpdates = [];
        let updatedSystemUsersCount = 0;
        let failedSystemUserUpdates = [];

        // Loop through each employeeId to update their category and linked system user
        for (let employeeId of employeeIds) {
            try {
                // Update employee category
                const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
                    employeeId,
                    { categoryId, categoryName },
                    { new: true, runValidators: true }
                );

                if (updatedEmployee) {
                    updatedEmployeesCount++;
                } else {
                    failedEmployeeUpdates.push({ employeeId, message: "Error updating employee" });
                }

                // Update linked SystemUser for this employee
                const updatedLinkSystemUser = await SystemUser.findOneAndUpdate(
                    { "linkSystemUser.employeeId": employeeId },
                    { categoryId }
                );

                if (updatedLinkSystemUser) {
                    updatedSystemUsersCount++;
                } else {
                    failedSystemUserUpdates.push({ employeeId, message: "Error updating system user" });
                }
                // Invalidate user tokens in the UserJwt collection
                await UserJwt.updateMany(
                    { systemUserId: updatedLinkSystemUser._id },
                    { $set: { currentToken: null } }
                );
            } catch (err) {
                console.error(`Error processing employee ID ${employeeId}:`, err);
                failedEmployeeUpdates.push({ employeeId, message: err.message });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'Category updated successfully',
            updatedEmployeesCount,
            failedEmployeeUpdates,
            updatedSystemUsersCount,
            failedSystemUserUpdates,
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getCategoryDropdown = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { CategoryModel } = await initModels(org_uuid);
        const { search } = req.query;
        let query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const categories = await CategoryModel.find(query)
            .select('_id name')
            .sort({ name: 1 });

        if (!categories || categories.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Categories not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Category dropdown fetched successfully',
            data: categories
        });
    } catch (error) {
        console.error('Error fetching category dropdown:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

