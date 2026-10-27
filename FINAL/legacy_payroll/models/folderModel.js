const mongoose = require('mongoose');
const { Schema } = mongoose;

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    parentFolder: {
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        default: null,
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee'
    },
}, {
    timestamps: true,
});

module.exports = folderSchema;
