const mongoose = require('mongoose');
const { Schema } = mongoose;

const departmentSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    description: {
        type: String,
        default: ''
    },
    employees: [{
        type: Schema.Types.ObjectId,
        ref: 'Employee'
    }]
}, { timestamps: true });


module.exports = departmentSchema;
