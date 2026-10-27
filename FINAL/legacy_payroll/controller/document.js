const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const { uploadFile } = require('../service/cloudUploade/clodeUpload');


exports.createFolder = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { FolderModel } = await initModels(org_uuid);

        const createId = req.empId;

        const { name, parentFolder, employeeId } = req.body;

        const newFolder = new FolderModel({
            name,
            parentFolder,
            employeeId,
            createdBy: createId
        });

        const savedFolder = await newFolder.save();

        return res.status(201).json({
            status: 'success',
            message: 'Folder created successfully',
            data: savedFolder
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getFoldersAndDocuments = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { FolderModel, DocumentModel } = await initModels(org_uuid);
        const { folderId, employeeId } = req.query;

        // Fetch root folders if folderId is not provided
        if (!folderId) {
            const filter = {
                parentFolder: null,
                ...(employeeId ? { employeeId: employeeId } : { employeeId: null })
            };

            const folders = await FolderModel.find(filter);
            if (!folders || folders.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Root folders not found'
                });
            }

            return res.status(200).json({
                status: 'success',
                data: folders
            });
        }

        // Fetch subfolders and documents if folderId is provided
        const folders = await FolderModel.find({ parentFolder: folderId });
        const documents = await DocumentModel.find({ folderId: folderId });

        return res.status(200).json({
            status: 'success',
            data: {
                folders,
                documents
            }
        });

    } catch (error) {
        console.error('Error fetching folders and documents:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getFolderById = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { FolderModel } = await initModels(org_uuid);
        const { folderId } = req.params;

        const folder = await FolderModel.findById(folderId);

        if (!folder) {
            return res.status(404).json({
                status: 'error',
                message: 'Folder not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: folder
        });
    } catch (error) {
        console.error('Error fetching folder:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updateFolder = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { FolderModel } = await initModels(org_uuid);
        const { name, parentFolder } = req.body;
        const { folderId } = req.params;


        const updatedFolder = await FolderModel.findByIdAndUpdate(
            folderId,
            { name, parentFolder },
            { new: true }
        );

        if (!updatedFolder) {
            return res.status(404).json({
                status: 'error',
                message: 'Folder not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Folder updated successfully',
            data: updatedFolder
        });
    } catch (error) {
        console.error('Error updating folder:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteFolder = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { FolderModel, DocumentModel } = await initModels(org_uuid);
        const { folderId } = req.params;

        // Recursive function to delete folder and its contents
        const deleteFolderAndContents = async (folderId) => {
            // Find all subfolders
            const subfolders = await FolderModel.find({ parentFolder: folderId });

            // Recursively delete all subfolders and their contents
            for (const subfolder of subfolders) {
                await deleteFolderAndContents(subfolder._id);
            }

            // Find all documents associated with this folder
            const documents = await DocumentModel.find({ folderId });

            // Delete files associated with each document
            for (const document of documents) {
                const filePath = path.join(__dirname, '../', document.filePath);

                // Check if file exists and then delete it
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting the file:', err);
                    });
                }
            }

            // Delete all documents associated with this folder
            await DocumentModel.deleteMany({ folderId });

            // Finally, delete the folder itself
            await FolderModel.findByIdAndDelete(folderId);
        };

        // Start the recursive deletion from the folderId provided in the request
        const folderToDelete = await FolderModel.findById(folderId);

        if (!folderToDelete) {
            return res.status(404).json({
                status: 'error',
                message: 'Folder not found'
            });
        }

        // Delete the folder and its contents (subfolders and documents)
        await deleteFolderAndContents(folderId);

        return res.status(200).json({
            status: 'success',
            message: 'Folder and all nested folders and documents deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting folder and its contents:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DocumentModel } = await initModels(org_uuid);
        const uploadId = req.empId;
        const { title, folderId } = req.body;

        // Check if a file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file using your uploadFile function
        const result = await uploadFile(req.file);
        if (!result) {
            return res.status(400).json({ message: 'File upload failed' });
        }

        const newDocument = new DocumentModel({
            title,
            folderId,
            filePath: result.url,
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

exports.getDocumentById = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DocumentModel } = await initModels(org_uuid);
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

exports.updateDocument = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DocumentModel } = await initModels(org_uuid);
        const { title } = req.body;
        const { documentId } = req.params;

        const updatedDocument = await DocumentModel.findByIdAndUpdate(
            documentId,
            { title },
            { new: true }
        );

        if (!updatedDocument) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Document updated successfully',
            data: updatedDocument
        });
    } catch (error) {
        console.error('Error updating document:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DocumentModel } = await initModels(org_uuid);
        const { documentId } = req.params;

        const deletedDocument = await DocumentModel.findByIdAndDelete(documentId);

        if (!deletedDocument) {
            return res.status(404).json({
                status: 'error',
                message: 'Document not found'
            });
        }

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

exports.downloadDocument = async (req, res) => {
    try {
        let org_uuid = req.headers.org_uuid
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'org uuid not found'
            });
        }

        const { DocumentModel } = await initModels(org_uuid);
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

