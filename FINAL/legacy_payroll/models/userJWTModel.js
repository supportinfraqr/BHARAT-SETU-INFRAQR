const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JwtTokenSchema = new Schema({
    systemUserId: { type: Schema.Types.ObjectId, ref: 'SystemUser' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    currentToken: { type: String, default: null },
}, {
    timestamps: true,
});

const token = mongoose.model('JwtToken', JwtTokenSchema);

// Export the model
module.exports = token;
