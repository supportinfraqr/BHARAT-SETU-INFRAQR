const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');

exports.createPosition = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { PositionModel, OrganizationModel } = await initModels(org_uuid);
        const { name, description, parent, level, organizationId } = req.body;


        const position = new PositionModel({
            name,
            description,
            parent,
            level,
            organizationId
        });

        const savedPosition = await position.save();
        return res.status(201).json({
            status: 'success',
            message: 'Position added successfully',
            data: savedPosition,
        });
    } catch (error) {
        console.error('Error adding Position:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllPositions = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { PositionModel } = await initModels(org_uuid);
        const { search, organizationId } = req.query;
        let query = {};

        if (organizationId) {
            query.organizationId = mongoose.Types.ObjectId(organizationId);
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const positions = await PositionModel.find(query).sort({ createdAt: -1 });

        if (!positions || positions.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Positions not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Positions fetched successfully',
            data: positions
        });
    } catch (error) {
        console.error('Error fetching Positions:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getPositionById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { PositionModel } = await initModels(org_uuid);
        const { positionId } = req.params;

        const position = await PositionModel.findById(positionId);

        if (!position) {
            return res.status(404).json({
                status: 'error',
                message: 'Position not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Position fetched successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error fetching Position:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updatePosition = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { PositionModel } = await initModels(org_uuid);
        const { positionId } = req.params;
        const updateData = req.body;

        const position = await PositionModel.findByIdAndUpdate(
            positionId,
            updateData,
            { new: true }
        );

        if (!position) {
            return res.status(404).json({
                status: 'error',
                message: 'Position not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Position updated successfully',
            data: position,
        });
    } catch (error) {
        console.error('Error updating Position:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deletePosition = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { PositionModel } = await initModels(org_uuid);
        const { positionId } = req.params;

        // Check if the position exists
        const position = await PositionModel.findById(positionId);
        if (!position) {
            return res.status(404).json({
                status: 'error',
                message: 'Position not found',
            });
        }

        // Check if the position has child positions
        const childPositions = await PositionModel.find({ parent: positionId });
        if (childPositions.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Cannot delete position. First remove child positions: ${childPositions.map(pos => pos.name).join(', ')}`,
            });
        }

        // Proceed to delete the position
        await PositionModel.findByIdAndDelete(positionId);

        return res.status(200).json({
            status: 'success',
            message: 'Position deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting Position:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getPositionDropdown = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found',
            });
        }

        const { PositionModel } = await initModels(org_uuid);
        const { search, organizationId } = req.query;
        let query = {};

        if (organizationId) {
            query.organizationId = mongoose.Types.ObjectId(organizationId);
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const positions = await PositionModel.find(query)
            .select('_id name')
            .sort({ name: 1 });

        if (!positions || positions.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Positions not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Position dropdown fetched successfully',
            data: positions
        });
    } catch (error) {
        console.error('Error fetching Position dropdown:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};
