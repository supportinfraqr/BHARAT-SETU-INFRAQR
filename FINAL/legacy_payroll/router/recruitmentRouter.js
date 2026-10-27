const express = require("express");
const router = express.Router();
const { authJWT } = require("../middleware/authVerify");
const recruitment = require("../controller/recruitment");
const uploadConfig = require('../service/multer/indexMulter');
const path = require('path');
const config = require('../config/systemConfig');


//job api

router.post("/createJob", authJWT, recruitment.createJob);
router.put('/updateJob/:jobId', authJWT, recruitment.updateJob);
router.get('/getJobById/:jobId', authJWT, recruitment.getJobById);
router.get('/getJobForPost/:jobId', recruitment.getJobForPost);
router.get('/getAllJobs', authJWT, recruitment.getAllJobs);
router.delete('/deleteJob/:jobId', authJWT, recruitment.deleteJob);
router.post("/generateJobPostLink/:jobId", authJWT, recruitment.generateJobPostLink);

//server job tamplate get
router.get('/getServerJob/:jobId', recruitment.getServerJob);

//jobTemplate api

router.post("/createJobTemplate", authJWT, recruitment.createJobTemplate);
router.put('/updateJobTemplate/:jobTemplateId', authJWT, recruitment.updateJobTemplate);
router.get('/getJobTemplateById/:jobTemplateId', authJWT, recruitment.getJobTemplateById);
router.get('/getAllJobTemplates', authJWT, recruitment.getAllJobTemplates);
router.get('/allJobTemplates', authJWT, recruitment.allJobTemplates);
router.delete('/deleteJobTemplate/:jobTemplateId', authJWT, recruitment.deleteJobTemplate);

//Candidate api

router.post("/createCandidate", uploadConfig.single, recruitment.createCandidate);
router.put('/updateCandidate/:candidateId', authJWT, recruitment.updateCandidate);
router.get('/getCandidateById/:candidateId', authJWT, recruitment.getCandidateById);
router.get('/getAllCandidates/:jobId', authJWT, recruitment.getAllCandidates);
router.delete('/deleteCandidate/:candidateId', authJWT, recruitment.deleteCandidate);
router.post("/uploadCandidateDocuments/:org_uuid/:candidateId", uploadConfig.array, recruitment.uploadCandidateDocuments);
router.post("/generateUploadLink/:candidateId", authJWT, recruitment.generateUploadLink);
router.get('/getCandidateDocuments/:org_uuid/:candidateId', recruitment.getCandidateDocuments);


// Serve the Upload Form
// router.get("/upload-documents", async (req, res) => {
//     res.sendFile(path.join(__dirname, "../public/forms/upload.html"));
// });

// router.get("/job-post", async (req, res) => {
//     res.sendFile(path.join(__dirname, "../public/forms/jobPost.html"));
// });

// hbs form pages 

router.get("/upload-documents", (req, res) => {
    res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
    res.render("forms/upload", {
        title: "upload-documents",
        url: config.resolvePublicBaseUrl(req)
    });
});

router.get("/job-post", (req, res) => {
    res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
    res.render("forms/jobPost", {
        title: "job-post",
        url: config.resolvePublicBaseUrl(req)
    });
});


//send mail
const uploadEmailAttachments = (req, res, next) => {
    uploadConfig.emailAttachments(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Each attachment must be 8 MB or smaller'
            : err.code === 'LIMIT_FILE_COUNT'
                ? 'You can attach up to 5 documents'
                : err.message || 'Could not upload attachment';
        return res.status(400).json({ status: 'error', message });
    });
};
router.post("/sendRecruitmentMail", uploadEmailAttachments, recruitment.sendRecruitmentMail);

//get dashboard data

router.get('/recruitmentDashBoardData', authJWT, recruitment.recruitmentDashBoardData);
router.get('/getInterviewsForCalendar', authJWT, recruitment.getInterviewsForCalendar);
router.get('/getHiringFunnelStats', authJWT, recruitment.getHiringFunnelStats);
router.get('/hiringDepartmentPercent', authJWT, recruitment.hiringDepartmentPercent);
router.get('/getCandidateApplicantRate', authJWT, recruitment.getCandidateApplicantRate);
router.get('/getInterviewSummaryGraph', authJWT, recruitment.getInterviewSummaryGraph);
router.get('/getJoinedCandidatesOverView', authJWT, recruitment.getJoinedCandidatesOverView);
router.get('/getEmployeeGraphData', authJWT, recruitment.getEmployeeGraphData);
router.get('/getJoinerAnalyticsYearly', authJWT, recruitment.getJoinerAnalyticsYearly);
router.get('/getAnalyticsSummaryRecruitment', authJWT, recruitment.getAnalyticsSummaryRecruitment);











module.exports = router                                                                                         