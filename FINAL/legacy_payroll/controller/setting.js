const { DocumentModel } = require('../models/documentModel');
const fs = require('fs');
const path = require('path');

exports.uploadBulckTemplate = async (req, res) => {
    try {
        const uploadId = req.userId;
        const { title } = req.body;

        const filePath = req.file.path;
        if (!filePath) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const newDocument = new DocumentModel({
            title,
            filePath,
            uploadedBy: uploadId,
        });

        const savedDocument = await newDocument.save();

        return res.status(201).json({
            status: 'success',
            message: 'Document uploaded successfully',
            data: savedDocument
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getBulckTemplateId = async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await DocumentModel.findById(documentId);

        if (!document) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: document
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllBulckTemplate = async (req, res) => {
    try {

        const document = await DocumentModel.find();

        if (!document) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: document
        });
    } catch (error) {
        console.error('Error fetching document:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteBulckTemplate = async (req, res) => {
    try {
        const { documentId } = req.params;

        const deletedDocument = await DocumentModel.findByIdAndDelete(documentId);

        if (!deletedDocument) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found'
            });
        }

        // Remove the uploaded  file after processing
        fs.unlink(deletedDocument.filePath, (err) => {
            if (err) console.error('Error deleting the file:', err);
        });


        return res.status(200).json({
            status: 'success',
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.downloadBulckTemplate = async (req, res) => {
    try {
        const { documentId } = req.params;

        // Find the document by its ID
        const document = await DocumentModel.findById(documentId);

        if (!document) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found',
            });
        }

        // Define the file path where the document is stored
        const filePath = path.join(__dirname, '../', document.filePath);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: 'error',
                message: 'File not found',
            });
        }

        // Send the file for download
        return res.download(filePath, document.title, (err) => {
            if (err) {
                console.error('Error in document download:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Error downloading the file',
                });
            }
        });

    } catch (error) {
        console.error('Error fetching document for download:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};