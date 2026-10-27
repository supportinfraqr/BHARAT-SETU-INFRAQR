const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentSchema = new mongoose.Schema({
    title: {
        type: String
    },
    folderId: {
        type: Schema.Types.ObjectId,
        ref: 'Folder'
    },
    filePath: {
        type: String
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
    },
}, {
    timestamps: true,
});

const DocumentModel = mongoose.model('BulckTemplete', documentSchema);

module.exports = { documentSchema, DocumentModel };
