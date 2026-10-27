const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');

exports.addTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { TemplateModel } = await initModels(org_uuid);
        const createId = req.userId;

        const { name, format, status } = req.body;

        if(!name){
            return res.status(404).json({ status: 'error', message: 'template name required' });
        }

        if(!format){
            return res.status(404).json({ status: 'error', message: 'template contend required' });
        }

        const newTemplate = new TemplateModel({
            name,
            format,
            status,
            createdBy: createId,
        });

        const savedTemplate = await newTemplate.save();

        return res.status(201).json({
            status: 'success',
            message: 'Template added successfully',
            data: savedTemplate,
        });
    } catch (error) {
        console.error('Error adding template:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { TemplateModel } = await initModels(org_uuid);
        const { templateId } = req.params;
        const updateData = req.body;

        const template = await TemplateModel.findByIdAndUpdate(
            templateId,
            updateData,
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Template not found' });
        }


        return res.status(200).json({
            status: 'success',
            message: 'Template updated successfully',
            data: template,
        });
    } catch (error) {
        console.error('Error updating template:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { TemplateModel } = await initModels(org_uuid);
        const { templateId } = req.params;

        const template = await TemplateModel.findByIdAndDelete(templateId);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Template not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Template deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { TemplateModel } = await initModels(org_uuid);
        const { templateId } = req.params;

        const template = await TemplateModel.findById(templateId);
        if (!template) {
            return res.status(404).json({ status: 'error', message: 'Template not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Template retrieved successfully',
            data: template,
        });
    } catch (error) {
        console.error('Error retrieving template:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllTemplates = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { TemplateModel } = await initModels(org_uuid);

        const {
            page = 1,
            limit = 10,
            fieldName = '',
            status = '',
        } = req.query;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        const searchFilter = {
            ...(fieldName && { fieldName: { $regex: fieldName, $options: 'i' } }),
            ...(status && { status }),
        };

        const totalTemplates = await TemplateModel.countDocuments(searchFilter);

        const templates = await TemplateModel.find(searchFilter)
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        return res.status(200).json({
            status: 'success',
            message: 'Templates retrieved successfully',
            data: templates,
            pagination: {
                total: totalTemplates,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalTemplates / limitInt),
            },
        });
    } catch (error) {
        console.error('Error retrieving templates:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};
    