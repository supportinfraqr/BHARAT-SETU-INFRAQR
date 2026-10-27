const mongoose = require('mongoose');


const staffPortalSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    enablePortalAccess: { type: Boolean, default: false },
    bannerMessage: { type: String },
    bannerEndDate: { type: Date },
    portalContactEmail: { type: String },
    webTabs: [
      {
        title: String,
        url: String,
        isVisible: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

// export default mongoose.model("StaffPortal", staffPortalSchema);

module.exports = staffPortalSchema;
