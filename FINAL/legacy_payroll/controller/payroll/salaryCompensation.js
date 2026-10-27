const { initModels } = require("../../models/indexModel");
const { sendResponse, handleError } = require('../../utils/responce');
const { sanitizeSalaryComponent } = require('../../utils/salaryComponentHelper');


exports.createSalaryCompensation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { SalaryCompensationModel } = await initModels(org_uuid);
        const { category, component } = req.body;

        if (!category || !component) {
            return sendResponse(res, 400, false, "category and component are required");
        }

        const normalizedComponent = sanitizeSalaryComponent(component);

        let record = await SalaryCompensationModel.findOne({ organizationId, category });

        if (!record) {
            record = new SalaryCompensationModel({
                organizationId,
                category,
                components: [normalizedComponent],
            });
        } else {
            record.components.push(normalizedComponent);
        }

        await record.save();

        return sendResponse(res, 201, true, "Component created successfully", record.components.at(-1));
    } catch (error) {
        console.error("Error in createSalaryCompensation:", error);
        return handleError(res, error);
    }
};

exports.updateSalaryCompensation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { category, componentId } = req.params;
        const updateData = req.body;

        const { SalaryCompensationModel } = await initModels(org_uuid);

        const record = await SalaryCompensationModel.findOne({
            organizationId,
            category,
        });

        if (!record)
            return sendResponse(res, 404, false, "Category not found");

        const component = record.components.id(componentId);

        if (!component)
            return sendResponse(res, 404, false, "Component not found");

        Object.keys(updateData).forEach((key) => {
            component[key] = updateData[key];
        });

        const sanitized = sanitizeSalaryComponent(component.toObject ? component.toObject() : component);
        component.paymentMonth = sanitized.paymentMonth;
        component.considerForEPF = sanitized.considerForEPF;
        component.considerForESI = sanitized.considerForESI;

        await record.save();

        return sendResponse(res, 200, true, "Component updated successfully", component);
    } catch (error) {
        console.error("Error in updateSalaryCompensation:", error);
        return handleError(res, error);
    }
};

exports.getSalaryCompensation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { category, componentId } = req.params;
        const { SalaryCompensationModel } = await initModels(org_uuid);

        const record = await SalaryCompensationModel.findOne({ organizationId, category });
        if (!record)
            return sendResponse(res, 404, false, "Category not found");

        const component = record.components.id(componentId);
        if (!component)
            return sendResponse(res, 404, false, "Component not found");

        return sendResponse(res, 200, true, "Component fetched successfully", component);
    } catch (error) {
        console.error("Error in getSalaryCompensation:", error);
        return handleError(res, error);
    }
};

exports.getSalaryCompenBYCategory = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { category } = req.params;
        const { search, page = 1, limit = 10 } = req.query;
        const { SalaryCompensationModel } = await initModels(org_uuid);

        const record = await SalaryCompensationModel.findOne({ organizationId, category });

        if (!record)
            return sendResponse(res, 200, true, `No components found for category ${category}`, {
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: 0
                }
            });

        let components = record.components;

        // Apply search filter
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            components = components.filter(comp => 
                searchRegex.test(comp.name) || 
                searchRegex.test(comp.label) ||
                searchRegex.test(comp.componentType)
            );
        }

        // Calculate pagination
        const total = components.length;
        const totalPages = Math.ceil(total / parseInt(limit));
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComponents = components.slice(skip, skip + parseInt(limit));

        return sendResponse(res, 200, true, "Components fetched successfully", {
            data: paginatedComponents,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });
    } catch (error) {
        console.error("Error in getAllSalaryCompensations:", error);
        return handleError(res, error);
    }
};

exports.getAllSalaryCompensations = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { search, page = 1, limit = 10 } = req.query;
        const categories = ["earnings", "deductions", "benefits", "reimbursements"];
        const { SalaryCompensationModel } = await initModels(org_uuid);

        // Fetch all categories in parallel
        const promises = categories.map(async (category) => {
            const record = await SalaryCompensationModel.findOne(
                { organizationId, category },
                { components: 1, category: 1 }
            );
            
            let components = record?.components || [];
            
            // Apply search filter if provided
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                components = components.filter(comp => 
                    searchRegex.test(comp.name) || 
                    searchRegex.test(comp.label) ||
                    searchRegex.test(comp.componentType)
                );
            }
            
            return {
                category,
                components
            };
        });

        const results = await Promise.all(promises);
        
        // Flatten all components for pagination
        const allComponents = results.flatMap(r => 
            r.components.map(comp => ({ ...comp._doc, category: r.category }))
        );
        
        // Calculate pagination
        const total = allComponents.length;
        const totalPages = Math.ceil(total / parseInt(limit));
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedComponents = allComponents.slice(skip, skip + parseInt(limit));

        return sendResponse(res, 200, true, "All salary components fetched successfully", {
            data: paginatedComponents,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });

    } catch (error) {
        console.error("Error in getAllSalaryCompensations:", error);
        return handleError(res, error);
    }
};

exports.deleteSalaryCompensation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid)
            return sendResponse(res, 400, false, "org_uuid not found");

        const organizationId = org_uuid;
        const { category, componentId } = req.params;
        const { SalaryCompensationModel } = await initModels(org_uuid);

        const record = await SalaryCompensationModel.findOneAndUpdate(
            { organizationId, category },
            { $pull: { components: { _id: componentId } } },
            { new: true }
        );

        if (!record)
            return sendResponse(res, 404, false, "Component not found");

        return sendResponse(res, 200, true, "Component deleted successfully", record);
    } catch (error) {
        console.error("Error in deleteSalaryCompensation:", error);
        return handleError(res, error);
    }
};
