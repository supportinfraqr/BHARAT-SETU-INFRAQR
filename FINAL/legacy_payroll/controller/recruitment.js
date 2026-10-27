const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { initModels } = require('../models/indexModel');
const SystemUser = require('../models/systemUserModel');
const { uploadFile } = require('../service/cloudUploade/clodeUpload');
const { mailTransporter, sendEmail, sendWelcomeEmail } = require('../service/nodemailer/mailerConfig');
const moment = require('moment');
const { resolvePublicBaseUrl } = require('../config/systemConfig');

// job apis

exports.createJob = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }
        const { JobModel } = await initModels(org_uuid);
        const { title, description, responsibilities, requirements, skills, employmentType, location, remoteAllowed, experienceLevel, education,
            salaryRange, status, hiringManager, hiringDepartment, position, hiringProcess, questions, experienceYears, genderPreference, tat, budgetedData, hiringPosition
        } = req.body;

        const job = new JobModel({
            title,
            description,
            responsibilities,
            requirements,
            skills,
            employmentType,
            location,
            remoteAllowed,
            experienceLevel,
            education,
            salaryRange,
            status,
            hiringManager,
            hiringDepartment,
            position,
            hiringProcess,
            questions,
            experienceYears,
            genderPreference,
            tat,
            budgetedData,
            hiringPosition,
            postedBy: req.empId,
        });

        const savedJob = await job.save();

        return res.status(201).json({
            status: 'success',
            message: 'Job created successfully',
            data: savedJob,
        });
    } catch (error) {
        console.error('Error creating Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllJobs = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel } = await initModels(org_uuid);

        // Destructure query parameters
        const {
            title,
            location,
            skills,
            employmentType,
            status,
            page = 1,
            limit = 10
        } = req.query;

        // Build the search query
        const query = {};
        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        if (skills) {
            query.skills = { $in: skills.split(',') };
        }
        if (employmentType) {
            query.employmentType = employmentType;
        }
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitPerPage = parseInt(limit);


        const jobs = await JobModel.find(query)
            .populate(['hiringManager', 'hiringDepartment', 'postedBy', 'location'])
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitPerPage);

        // Count total jobs for pagination metadata
        const totalJobs = await JobModel.countDocuments(query);

        // Respond with data
        return res.status(200).json({
            status: 'success',
            message: 'Jobs fetched successfully',
            data: {
                jobs,
                pagination: {
                    totalJobs,
                    totalPages: Math.ceil(totalJobs / limitPerPage),
                    currentPage: parseInt(page),
                    limit: limitPerPage,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching Jobs:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getJobById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel } = await initModels(org_uuid);
        const { jobId } = req.params;

        const job = await JobModel.findById(jobId).populate(['hiringManager', 'hiringDepartment', 'postedBy', 'location']);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Job fetched successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error fetching Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getJobForPost = async (req, res) => {
    try {
        const org_uuid = req.query.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel } = await initModels(org_uuid);
        const { jobId } = req.params;

        const job = await JobModel.findById(jobId).populate(['hiringManager', 'hiringDepartment', 'postedBy', 'location']);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Job fetched successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error fetching Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getServerJob = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel } = await initModels(org_uuid);
        const { jobId } = req.params;

        const job = await JobModel.findById(jobId).populate(['hiringManager', 'hiringDepartment', 'postedBy', 'location']);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Job fetched successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error fetching Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updateJob = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel } = await initModels(org_uuid);
        const { jobId } = req.params;
        const updateData = req.body;

        const job = await JobModel.findByIdAndUpdate(jobId, updateData, { new: true });

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Job updated successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error updating Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel } = await initModels(org_uuid);
        const { jobId } = req.params;

        const job = await JobModel.findById(jobId);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }
        // Remove all candidates associated with the job
        await CandidateModel.deleteMany({ appliedFor: jobId });

        await JobModel.findByIdAndDelete(jobId);

        return res.status(200).json({
            status: 'success',
            message: 'Job deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting Job:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.generateJobPostLink = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel } = await initModels(org_uuid);
        const { jobId } = req.params;

        const job = await JobModel.findById(jobId);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'Job not found',
            });
        }

        const uploadLink = `${resolvePublicBaseUrl(req)}/recruitment/job-post?org_uuid=${org_uuid}&jobId=${jobId}`;

        return res.status(200).json({
            status: 'success',
            message: 'job-post link generated successfully!',
            data: uploadLink,
        });
    } catch (error) {
        console.error("Error generating job-post link:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


// job template api's

exports.createJobTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);
        const { name, title, description, responsibilities, requirements, skills, employmentType, location, remoteAllowed, experienceLevel, education,
            salaryRange, status, hiringManager, hiringDepartment, position, hiringProcess, questions, experienceYears, genderPreference, tat, budgetedData, hiringPosition,
        } = req.body;

        const job = new JobTemplateModel({
            name,
            title,
            description,
            responsibilities,
            requirements,
            skills,
            employmentType,
            location,
            remoteAllowed,
            experienceLevel,
            education,
            salaryRange,
            status,
            hiringManager,
            hiringDepartment,
            experienceYears,
            position,
            genderPreference,
            tat,
            budgetedData,
            hiringPosition,
            hiringProcess,
            questions,
            createdBy: req.empId,
        });

        const savedJob = await job.save();

        return res.status(201).json({
            status: 'success',
            message: 'JobTemplate created successfully',
            data: savedJob,
        });
    } catch (error) {
        console.error('Error creating JobTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllJobTemplates = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);

        // Destructure query parameters
        const {
            name,
            title,
            location,
            skills,
            employmentType,
            status,
            page = 1,
            limit = 10
        } = req.query;

        // Build the search query
        const query = {};
        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }
        if (title) {
            query.title = { $regex: title, $options: 'i' };
        }
        if (location) {
            query.location = location;
        }
        if (skills) {
            query.skills = { $in: skills.split(',') };
        }
        if (employmentType) {
            query.employmentType = employmentType;
        }
        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitPerPage = parseInt(limit);


        const jobs = await JobTemplateModel.find(query)
            .populate(['hiringManager', 'hiringDepartment', 'createdBy', 'location'])
            .skip(skip)
            .limit(limitPerPage);

        // Count total jobs for pagination metadata
        const totalJobs = await JobTemplateModel.countDocuments(query);

        // Respond with data
        return res.status(200).json({
            status: 'success',
            message: 'JobTemplate fetched successfully',
            data: {
                jobs,
                pagination: {
                    totalJobs,
                    totalPages: Math.ceil(totalJobs / limitPerPage),
                    currentPage: parseInt(page),
                    limit: limitPerPage,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching JobsTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.allJobTemplates = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);

        const { search } = req.query;

        // Define the search criteria
        const searchCriteria = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { title: { $regex: search, $options: 'i' } },
                    { skills: { $elemMatch: { $regex: search, $options: 'i' } } },
                ],
            }
            : {};

        // Fetch matching job templates
        const jobs = await JobTemplateModel.find(searchCriteria).populate([
            'hiringManager',
            'hiringDepartment',
            'createdBy',
            'location',
        ]);

        // Respond with data
        return res.status(200).json({
            status: 'success',
            message: 'JobTemplate fetched successfully',
            data: jobs,
        });
    } catch (error) {
        console.error('Error fetching JobsTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getJobTemplateById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);
        const { jobTemplateId } = req.params;

        const job = await JobTemplateModel.findById(jobTemplateId).populate(['hiringManager', 'hiringDepartment', 'createdBy', 'location']);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'JobTemplate not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'JobTemplate fetched successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error fetching JobTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.updateJobTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);
        const { jobTemplateId } = req.params;
        const updateData = req.body;

        const job = await JobTemplateModel.findByIdAndUpdate(jobTemplateId, updateData, { new: true });

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'JobTemplate not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'JobTemplate updated successfully',
            data: job,
        });
    } catch (error) {
        console.error('Error updating JobTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteJobTemplate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobTemplateModel } = await initModels(org_uuid);
        const { jobTemplateId } = req.params;

        const job = await JobTemplateModel.findById(jobTemplateId);

        if (!job) {
            return res.status(404).json({
                status: 'error',
                message: 'JobTemplate not found',
            });
        }

        await JobTemplateModel.findByIdAndDelete(jobTemplateId);

        return res.status(200).json({
            status: 'success',
            message: 'JobTemplate deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting JobTemplate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

// Candidate api's

exports.createCandidate = async (req, res) => {
    try {
        const org_uuid = req.query.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { CandidateModel, JobModel } = await initModels(org_uuid);
        const { fullName, email, phone, appliedFor, experience, skills,
            hiringProcess, status, interviewDetails, notes } = req.body;

        // Check if a file is uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file using your uploadFile function
        const result = await uploadFile(req.file);
        if (!result) {
            return res.status(400).json({ message: 'File upload failed' });
        }

        const candidate = new CandidateModel({
            fullName,
            email,
            phone,
            appliedFor,
            resume: result.url,
            experience,
            skills,
            hiringProcess,
            status,
            interviewDetails,
            notes,
        });

        const savedCandidate = await candidate.save();

        await JobModel.findByIdAndUpdate(
            { _id: appliedFor },
            { $addToSet: { candidates: savedCandidate._id } },
            { new: true }
        );

        return res.status(201).json({
            status: 'success',
            message: 'Applied successfully',
            data: savedCandidate,
        });
    } catch (error) {
        console.error('Error creating Candidate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

// exports.candidateJoiningForm = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;
//         if (!org_uuid) {
//             return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
//         }

//         const { email, password, firstName } = req.body;
//         if (!email) {
//             return res.status(400).json({ status: 'error', message: 'Email is required' });
//         }

//         const { TempEmployeeModel, OrganizationModel, CategoryModel } = await initModels(org_uuid);

//         const existingUser = await SystemUser.findOne({ systemUserEmail: email });
//         const organization = await OrganizationModel.findById(org_uuid);
//         const organizationName = organization?.organizationName || 'Organization';

//         const categoryIdString = '576beaf0ed777ab0145122d3';
//         let candidateCategory = await CategoryModel.findById(categoryIdString);
//         if (!candidateCategory) {
//             candidateCategory = await CategoryModel.create({
//                 _id: new mongoose.Types.ObjectId(categoryIdString),
//                 name: 'CandidateCategory',
//                 permissions: [
//                     'candidate_joining_form',
//                     'candidate_portal_access',
//                     'candidate_dashboard_view'
//                 ]
//             });
//         }

//         const updateData = { ...req.body };
//         delete updateData.email;
//         delete updateData.password;

//         if (!existingUser) {
//             if (!password || !firstName) {
//                 return res.status(400).json({ status: 'error', message: 'Password and firstName are required for new user' });
//             }

//             const tempEmployee = new TempEmployeeModel({
//                 email,
//                 organizationId: org_uuid,
//                 organizationName,
//                 createdBy: req.empId || null,
//                 formData: {},
//                 ...updateData,
//             });

//             const savedTempEmployee = await tempEmployee.save();

//             const systemUser = new SystemUser({
//                 systemUserName: `${firstName} ${req.body.lastName || ''}`.trim(),
//                 systemUserPassword: bcrypt.hashSync(password, 10),
//                 systemUserEmail: email,
//                 categoryId: candidateCategory._id,
//                 linkSystemUser: [
//                     {
//                         employeeId: savedTempEmployee._id,
//                         organizationId: org_uuid,
//                         databaseName: org_uuid,
//                         organizationName,
//                     }
//                 ],
//             });

//             await systemUser.save();

//             const emailResult = await sendWelcomeEmail({
//                 org_uuid,
//                 employee: { firstName, lastName: req.body.lastName, organizationName },
//                 loginEmail: email,
//                 rawPassword: password,
//             });

//             return res.status(201).json({
//                 status: 'success',
//                 message: 'Temp employee created and system user registered successfully',
//                 data: {
//                     tempEmployee: savedTempEmployee,
//                     emailSent: emailResult.status === 'success',
//                     emailInfo: emailResult.status === 'success' ? 'Invitation sent' : emailResult.message,
//                 },
//             });
//         } else {
//     if (existingUser.categoryId?.toString() !== categoryIdString) {
//         return res.status(403).json({ status: 'error', message: 'User exists but is not a candidate' });
//     }

//     const tempEmployeeId = existingUser.linkSystemUser.find(
//         link => link.organizationId?.toString() === org_uuid
//     )?.employeeId;

//     if (!tempEmployeeId) {
//         return res.status(404).json({ status: 'error', message: 'Temp employee not found for this user' });
//     }

//     const tempEmployee = await TempEmployeeModel.findById(tempEmployeeId);
//     if (!tempEmployee) {
//         return res.status(404).json({ status: 'error', message: 'Temp employee record not found' });
//     }

//     const validPaths = Object.keys(TempEmployeeModel.schema.paths);

//     const updateQuery = {};
//     const formDataUpdate = {};

//     Object.entries(updateData).forEach(([key, value]) => {
//         if (validPaths.includes(key)) {
//             // Direct schema fields
//             updateQuery[key] = value;
//         } else {
//             // formData fields
//             formDataUpdate[`formData.${key}`] = value;
//         }
//     });

//     // Merge both updates
//     const finalUpdate = {
//         ...updateQuery,
//         ...formDataUpdate
//     };

//     const updatedEmployee = await TempEmployeeModel.findByIdAndUpdate(
//         tempEmployeeId,
//         { $set: finalUpdate },
//         { new: true }
//     );

//     return res.status(200).json({
//         status: 'success',
//         message: 'Temp employee data updated successfully',
//         data: { tempEmployee: updatedEmployee },
//     });
// }
//     } catch (error) {
//         console.error('Error in candidateJoiningForm:', error);
//         return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
//     }
// };

// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');


exports.updateCandidate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { CandidateModel } = await initModels(org_uuid);
        const { candidateId } = req.params;
        const updateData = req.body;

        const candidate = await CandidateModel.findByIdAndUpdate(candidateId, updateData, { new: true });

        if (!candidate) {
            return res.status(404).json({
                status: 'error',
                message: 'Candidate not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Candidate updated successfully',
            data: candidate,
        });
    } catch (error) {
        console.error('Error updating Candidate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getAllCandidates = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID is required',
            });
        }

        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({
                status: 'error',
                message: 'Job ID is required',
            });
        }

        const { CandidateModel } = await initModels(org_uuid);
        if (!CandidateModel) {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to initialize Candidate model for the given organization',
            });
        }

        const { fullName, email, status, page, limit } = req.query;

        const query = { appliedFor: jobId };
        if (fullName) query.fullName = { $regex: fullName, $options: 'i' };
        if (email) query.email = { $regex: email, $options: 'i' };
        if (status) query.status = status;

        const pageNumber = Math.max(1, parseInt(page) || 1);
        const limitPerPage = Math.max(1, parseInt(limit) || 10);
        const skip = (pageNumber - 1) * limitPerPage;

        const candidates = await CandidateModel.find(query)
            .populate(['appliedFor', 'interviewDetails.panel'])
            .skip(skip)
            .limit(limitPerPage);

        const totalCandidates = await CandidateModel.countDocuments(query);

        if (candidates.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No candidates found for the given criteria',
                data: {
                    candidates: [],
                    pagination: {
                        totalCandidates,
                        totalPages: 0,
                        currentPage: pageNumber,
                        limit: limitPerPage,
                    },
                },
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Candidates fetched successfully',
            data: {
                candidates,
                pagination: {
                    totalCandidates,
                    totalPages: Math.ceil(totalCandidates / limitPerPage),
                    currentPage: pageNumber,
                    limit: limitPerPage,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching Candidates:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getCandidateById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { CandidateModel } = await initModels(org_uuid);
        const { candidateId } = req.params;

        const candidate = await CandidateModel.findById(candidateId)
            .populate(['appliedFor', 'interviewDetails.panel']);

        if (!candidate) {
            return res.status(404).json({
                status: 'error',
                message: 'Candidate not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Candidate fetched successfully',
            data: candidate,
        });
    } catch (error) {
        console.error('Error fetching Candidate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.deleteCandidate = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { CandidateModel, JobModel } = await initModels(org_uuid);
        const { candidateId } = req.params;

        const candidate = await CandidateModel.findById(candidateId);

        if (!candidate) {
            return res.status(404).json({
                status: 'error',
                message: 'Candidate not found',
            });
        }

        await CandidateModel.findByIdAndDelete(candidateId);

        await JobModel.findByIdAndUpdate(
            { _id: candidate.appliedFor },
            { $pull: { candidates: candidate._id } },
            { new: true }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Candidate deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting Candidate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.uploadCandidateDocuments = async (req, res) => {
    try {
        const { org_uuid, candidateId } = req.params;
        const { CandidateModel } = await initModels(org_uuid);

        // Debug: Log raw request body and files
        console.log("Request Body:", req.body);
        console.log("Request Files:", req.files);

        const candidate = await CandidateModel.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }

        // Token expiry check
        if (candidate.uploadTokenExpiry < new Date()) {
            return res.status(403).json({ message: "Upload link has expired" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        // Access documentNames (not documentNames[])
        const documentNames = req.body.documentNames || req.body["documentNames[]"] || [];
        const namesArray = Array.isArray(documentNames) ? documentNames : [documentNames].filter(Boolean);

        // Validate lengths
        if (namesArray.length !== req.files.length) {
            return res.status(400).json({
                message: `Mismatch: ${namesArray.length} names provided but ${req.files.length} files uploaded`,
            });
        }

        const uploadedDocs = await Promise.all(
            req.files.map(async (file, index) => {
                const result = await uploadFile(file); // Upload to S3/local
                return {
                    name: namesArray[index] || file.originalname, // Use custom name or fallback
                    url: result.url,
                };
            })
        );

        // Ensure documents field exists
        candidate.documents = candidate.documents || [];
        candidate.documents.push(...uploadedDocs);
        candidate.bgvUplodeDate = Date.now();
        if (!candidate.bgvVerification) {
            candidate.bgvVerification = "Pending";
        }
        await candidate.save();

        return res.status(200).json({
            message: "Documents uploaded successfully",
            data: candidate.documents,
        });
    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.generateUploadLink = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(400).json({ message: "Organization UUID not found" });
        }

        const { CandidateModel } = await initModels(org_uuid);

        // Find candidate
        const candidate = await CandidateModel.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found" });
        }

        const expiryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        candidate.uploadTokenExpiry = expiryTime;
        await candidate.save();

        // Generate the upload link with org_uuid and candidateId
        const uploadLink = `${resolvePublicBaseUrl(req)}/recruitment/upload-documents?org_uuid=${org_uuid}&candidateId=${candidateId}`;
        //  const uploadLink = `http://20.197.12.95:5000/recruitment/upload-documents?org_uuid=${org_uuid}&candidateId=${candidateId}`;

        return res.status(200).json({
            status: 'success',
            message: 'Upload link generated successfully!',
            data: uploadLink,
        });
    } catch (error) {
        console.error("Error generating upload link:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

exports.getCandidateDocuments = async (req, res) => {
    try {
        const { org_uuid, candidateId } = req.params;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { CandidateModel } = await initModels(org_uuid);

        const candidate = await CandidateModel.findById(candidateId)

        if (!candidate) {
            return res.status(404).json({
                status: 'error',
                message: 'Candidate not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Candidate DocumentBox fetched successfully',
            data: candidate.documentsBox,
        });
    } catch (error) {
        console.error('Error fetching Candidate:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};


// send recruitment mail api

// exports.sendRecruitmentMail = async (req, res) => {
//     try {
//         const org_uuid = req.headers.org_uuid;
//         if (!org_uuid) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Organization UUID not found',
//             });
//         }

//         const { from, candidateEmail, subject, htmlContent } = req.body;

//         if (!from || !candidateEmail || !subject || !htmlContent) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'Missing required fields: from, candidateEmail, subject, or htmlContent',
//             });
//         }

//         await sendEmail(from, candidateEmail, subject, htmlContent);

//         return res.status(200).json({
//             status: 'success',
//             message: 'Email sent successfully',
//         });
//     } catch (error) {
//         console.error('Error in sendRecruitmentMail:', error.message);
//         return res.status(500).json({
//             status: 'error',
//             message: 'Failed to send email. Please try again later.',
//         });
//     }
// };

exports.sendRecruitmentMail = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { from, subject, htmlContent } = req.body;
        let { candidateEmail } = req.body;

        if (typeof candidateEmail === 'string') {
            const trimmed = candidateEmail.trim();
            if (trimmed.startsWith('[')) {
                try {
                    candidateEmail = JSON.parse(trimmed);
                } catch (parseError) {
                    candidateEmail = [trimmed];
                }
            } else if (trimmed) {
                candidateEmail = [trimmed];
            }
        }

        if (!from || !candidateEmail || !subject || !htmlContent) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: from, candidateEmail, subject, or htmlContent',
            });
        }

        if (!Array.isArray(candidateEmail) || candidateEmail.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'candidateEmail must be a non-empty array',
            });
        }

        const successfulEmails = [];
        const failedEmails = [];

        const attachments = (Array.isArray(req.files) ? req.files : []).map((file) => ({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
        }));

        // sendEmail(org_uuid, { from, to, subject, html }) — returns { status }, does not throw
        const results = await Promise.all(
            candidateEmail.map(async (email) => {
                const result = await sendEmail(org_uuid, {
                    from,
                    to: email,
                    subject,
                    html: htmlContent,
                    attachments,
                });
                return { email, result };
            })
        );

        results.forEach(({ email, result }) => {
            if (result?.status === 'success') {
                successfulEmails.push(email);
            } else {
                failedEmails.push({
                    email,
                    message: result?.message || 'Failed to send email',
                });
            }
        });

        if (successfulEmails.length === 0) {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to send email',
                details: { successfulEmails, failedEmails },
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Email processing completed',
            details: {
                successfulEmails,
                failedEmails,
            },
        });
    } catch (error) {
        console.error('Error in sendRecruitmentMail:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to process email requests. Please try again later.',
        });
    }
};

//dashBoard api's

exports.recruitmentDashBoardData = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel, JobTemplateModel } = await initModels(org_uuid);

        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Start of the month 12 months ago
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(twelveMonthsAgo);
            date.setMonth(date.getMonth() + i);
            return { month: date.getMonth() + 1, year: date.getFullYear() }; // 1-indexed months
        });

        // Aggregate data for job creation in the last 12 months, including the current month
        const rawJobCreationData = await JobModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: twelveMonthsAgo },
                },
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]);

        const jobCreationData = months.map(({ month, year }) => {
            const match = rawJobCreationData.find(d => d._id.month === month && d._id.year === year);
            return {
                month,
                year,
                count: match ? match.count : 0,
            };
        });

        // Aggregate data for candidates applied and hired in the last 12 months, including the current month
        const rawCandidateData = await CandidateModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: twelveMonthsAgo },
                },
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    totalApplied: { $sum: 1 },
                    totalHired: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "Hired"] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const candidateData = months.map(({ month, year }) => {
            const match = rawCandidateData.find(d => d._id.month === month && d._id.year === year);
            return {
                month,
                year,
                totalApplied: match ? match.totalApplied : 0,
                totalHired: match ? match.totalHired : 0,
            };
        });

        // Fetch total jobs, open jobs, closed jobs, and templates
        const jobs = await JobModel.find();
        let openJobs = jobs.filter(job => job.status === "Open").length;
        let closedJobs = jobs.filter(job => job.status === "Close").length;
        const totalTemplates = await JobTemplateModel.countDocuments({});

        // Respond with all data
        return res.status(200).json({
            status: 'success',
            message: 'recruitmentDashBoardData fetched successfully',
            data: {
                totalJobs: jobs.length,
                openJobs,
                closedJobs,
                totalTemplates,
                jobCreationData,
                candidateData,
            },
        });
    } catch (error) {
        console.error('Error fetching recruitmentDashBoardData:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getInterviewsForCalendar = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Start date and end date are required',
            });
        }

        if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid date format. Expected format: YYYY-MM-DD',
            });
        }

        const start = moment(startDate).startOf('day').toDate();
        const end = moment(endDate).endOf('day').toDate();

        if (start > end) {
            return res.status(400).json({
                status: 'error',
                message: 'Start date must be before end date.',
            });
        }

        const { CandidateModel } = await initModels(org_uuid);

        const interviews = await CandidateModel.find({
            'interviewDetails.date': {
                $gte: start,
                $lte: end,
            },
        }).populate('appliedFor');

        const dateMap = {};

        interviews.forEach(candidate => {
            candidate.interviewDetails.forEach(interview => {
                const interviewDate = moment(interview.date).toDate();
                if (interviewDate >= start && interviewDate <= end) {
                    const formattedDate = moment(interviewDate).format('YYYY-MM-DD');
                    if (!dateMap[formattedDate]) {
                        dateMap[formattedDate] = {
                            date: formattedDate,
                            count: 0,
                            interviews: [],
                        };
                    }
                    dateMap[formattedDate].count++;
                    dateMap[formattedDate].interviews.push({
                        id: candidate._id,
                        name: interview.name,
                        candidateName: candidate.fullName,
                        jobTitle: candidate.appliedFor?.title || 'Unknown Job',
                        panel: interview.panel,
                        status: interview.status,
                        startTime: interview.startTime,
                        endTime: interview.endTime,
                        meetingLink: interview.meetingLink
                    });
                }
            });
        });

        const dateWiseInterviews = Object.values(dateMap).sort((a, b) => moment(a.date).isBefore(b.date) ? -1 : 1);

        return res.status(200).json({
            status: 'success',
            message: 'Interviews fetched and grouped by date successfully',
            data: dateWiseInterviews,
        });
    } catch (error) {
        console.error('Error fetching interviews:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.getHiringFunnelStats = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel } = await initModels(org_uuid);

        const currentYear = parseInt(req.query.year) || new Date().getFullYear();
        const lastYear = currentYear - 1;

        const getDateRange = (year) => ({
            start: new Date(`${year}-01-01T00:00:00Z`),
            end: new Date(`${year}-12-31T23:59:59Z`)
        });

        const currentRange = getDateRange(currentYear);
        const lastRange = getDateRange(lastYear);

        const getYearlyData = async (range) => {
            const jobs = await JobModel.find({ createdAt: { $gte: range.start, $lte: range.end } }).populate('candidates');

            let stats = {
                jobsCreated: jobs.length,
                totalPosition: 0,
                totalApplications: 0,
                shortlisted: 0,
                interviewed: 0,
                offered: 0,
                offerAccepted: 0,
                offerRejected: 0,
                documentation: 0,
                joined: 0,
                percentages: {}
            };

            for (let job of jobs) {
                stats.totalApplications += job.candidates.length;
                stats.totalPosition += job.position || 0;
                for (let candidate of job.candidates) {
                    if (candidate.hiringStage.includes('Shortlisted')) stats.shortlisted++;
                    if (candidate.hiringStage.includes('Interview Scheduled')) stats.interviewed++;
                    if (candidate.hiringStage.includes('Offer Extended')) stats.offered++;
                    if (candidate.hiringStage.includes('Offer Rejected')) stats.offerRejected++;
                    if (candidate.hiringStage.includes('Onboarding')) stats.documentation++;
                    if (candidate.hiringStage.includes('Hired')) stats.joined++;
                    if (candidate.hiringStage.includes('Offer Extended') && candidate.status === 'Hired') stats.offerAccepted++;
                }
            }

            const percentify = (val) =>
                stats.totalApplications === 0 ? "0.00" : ((val / stats.totalApplications) * 100).toFixed(2);

            stats.percentages = {
                shortlisted: percentify(stats.shortlisted),
                interviewed: percentify(stats.interviewed),
                offered: percentify(stats.offered),
                offerAccepted: percentify(stats.offerAccepted),
                offerRejected: percentify(stats.offerRejected),
                documentation: percentify(stats.documentation),
                joined: percentify(stats.joined),
                jobsCreated: stats.joined === 0 ? "0.00" : ((stats.jobsCreated / stats.joined) * 100).toFixed(2),
                position: stats.joined === 0 ? "0.00" : ((stats.totalPosition / stats.joined) * 100).toFixed(2),
                Applications: stats.joined === 0 ? "0.00" : ((stats.totalApplications / stats.joined) * 100).toFixed(2)
            };

            return stats;
        };

        const currentYearStats = await getYearlyData(currentRange);
        const lastYearStats = await getYearlyData(lastRange); // ✅ fix added here

        const calculateChange = (current, last) => {
            const change = {};
            for (let key in current) {
                if (typeof current[key] === 'object') continue; // skip percentages
                const currentVal = current[key];
                const lastVal = last[key] || 0;
                const diff = currentVal - lastVal;
                const percent = lastVal === 0 ? (currentVal === 0 ? 0 : 100) : ((diff / lastVal) * 100).toFixed(2);
                change[key] = {
                    value: currentVal,
                    lastYear: lastVal,
                    percentageChange: percent
                };
            }
            return change;
        };

        const result = calculateChange(currentYearStats, lastYearStats);

        return res.status(200).json({
            status: 'success',
            message: 'HiringFunnelStats report fetched successfully',
            data: {
                year: currentYear,
                result,
                currentYearStagePercentages: currentYearStats.percentages
            },
        });

    } catch (error) {
        console.error('Error fetching HiringFunnelStats:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message,
        });
    }
};

exports.hiringDepartmentPercent = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;

        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel } = await initModels(org_uuid);
        const { fromDate, toDate } = req.query;

        // Validate date inputs
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);

        if (isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        // Ensure endDate is after startDate
        if (endDate < startDate) {
            return res.status(400).json({ error: 'toDate must be after fromDate' });
        }

        // Aggregate job counts by hiringDepartment
        const jobStats = await JobModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$hiringDepartment',
                    jobCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'departments', // Collection name for Department model
                    localField: '_id',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $unwind: '$department'
            },
            {
                $project: {
                    departmentName: '$department.name', // Assuming Department has a 'name' field
                    jobCount: 1
                }
            }
        ]);

        // Calculate total jobs
        const totalJobs = jobStats.reduce((sum, stat) => sum + stat.jobCount, 0);

        // Add percentage to each department
        const jobStatsWithPercentage = jobStats.map(stat => ({
            ...stat,
            percentage: totalJobs > 0 ? ((stat.jobCount / totalJobs) * 100).toFixed(2) : 0
        }));

        res.status(200).json({
            status: 'success',
            data: jobStatsWithPercentage,
            totalJobs
        });
    } catch (error) {
        console.error('Error fetching job stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getCandidateApplicantRate = async (req, res) => {
    try {
        // Validate org_uuid
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID is required in headers',
            });
        }

        const now = new Date();

        const getDateRange = (from, to) => {
            const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
            const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { start, end };
        };

        const applicantRange = getDateRange(req.query.applicantFromDate, req.query.applicantToDate);
        const bgvRange = getDateRange(req.query.bgvRangeFromDate, req.query.bgvRangeToDate);

        // Initialize models
        const { JobModel, CandidateModel } = await initModels(org_uuid);

        // Hiring stage pipeline
        const pipeline = [
            {
                $match: {
                    statusDate: { $gte: applicantRange.start, $lte: applicantRange.end },
                    hiringStage: { $exists: true, $ne: null }
                }
            },
            {
                $unwind: '$hiringStage'
            },
            {
                $group: {
                    _id: '$hiringStage',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalStageCount: { $sum: '$count' },
                    stages: {
                        $push: {
                            stage: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    stageBreakdown: {
                        $map: {
                            input: '$stages',
                            as: 'stage',
                            in: {
                                stage: '$$stage.stage',
                                count: '$$stage.count',
                                percentage: {
                                    $concat: [
                                        {
                                            $toString: {
                                                $round: [
                                                    {
                                                        $multiply: [
                                                            { $divide: ['$$stage.count', { $ifNull: ['$totalStageCount', 1] }] },
                                                            100
                                                        ]
                                                    },
                                                    2
                                                ]
                                            }
                                        },
                                        '%'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ];

        const stageResult = await CandidateModel.aggregate(pipeline).exec();
        const data = stageResult[0] || { stageBreakdown: [] };

        // BGV Verification pipeline
        const bgvPipeline = [
            {
                $match: {
                    bgvUplodeDate: { $gte: bgvRange.start, $lte: bgvRange.end },
                    bgvVerification: { $in: ['Pending', 'Reject', 'Verified', 'Under Review'] }
                }
            },
            {
                $group: {
                    _id: '$bgvVerification',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$count' },
                    statuses: {
                        $push: {
                            status: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    bgvBreakdown: {
                        $map: {
                            input: '$statuses',
                            as: 's',
                            in: {
                                status: '$$s.status',
                                count: '$$s.count',
                                percentage: {
                                    $concat: [
                                        {
                                            $toString: {
                                                $round: [
                                                    {
                                                        $multiply: [
                                                            { $divide: ['$$s.count', { $ifNull: ['$total', 1] }] },
                                                            100
                                                        ]
                                                    },
                                                    2
                                                ]
                                            }
                                        },
                                        '%'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ];

        const bgvResult = await CandidateModel.aggregate(bgvPipeline).exec();
        const bgvData = bgvResult[0]?.bgvBreakdown || [];

        return res.status(200).json({
            success: true,
            data: {
                stageBreakdown: data.stageBreakdown,
                bgvVerificationBreakdown: bgvData
            }
        });

    } catch (err) {
        console.error('Error in getCandidateApplicantRate:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};

exports.getInterviewSummaryGraph = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found',
            });
        }

        const { JobModel, CandidateModel } = await initModels(org_uuid);

        // Parse date filters for departmentWise
        const { fromDate, toDate, weekFilter } = req.query;

        // ---------- Set default to current month for departmentWise ----------
        let from, to;
        if (fromDate && toDate) {
            from = new Date(fromDate);
            to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            from.setHours(0, 0, 0, 0);
        } else {
            // Default to current month
            from = new Date();
            from.setDate(1); // First day of the current month
            from.setHours(0, 0, 0, 0);
            to = new Date(from);
            to.setMonth(to.getMonth() + 1); // First day of next month
            to.setDate(0); // Last day of current month
            to.setHours(23, 59, 59, 999);
        }

        // ---------- Set week range for weekWise based on weekFilter ----------
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        const currentDay = startOfWeek.getDay();
        const diffToMonday = (currentDay + 6) % 7;
        startOfWeek.setDate(startOfWeek.getDate() - diffToMonday); // Monday of current week

        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7); // Monday of next week

        // Adjust week based on weekFilter
        if (weekFilter === 'lastweek') {
            startOfWeek.setDate(startOfWeek.getDate() - 7); // Monday of last week
            endOfWeek.setDate(endOfWeek.getDate() - 7); // Monday of current week
        } else if (weekFilter === 'nextweek') {
            startOfWeek.setDate(startOfWeek.getDate() + 7); // Monday of next week
            endOfWeek.setDate(endOfWeek.getDate() + 7); // Monday of week after next
        }
        // Default is current week, no adjustment needed

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // ---------- 1️⃣ WEEKWISE INTERVIEWS (BASED ON weekFilter) ----------
        const weekPipeline = [
            { $unwind: "$interviewDetails" },
            {
                $match: {
                    "interviewDetails.date": { $gte: startOfWeek, $lt: endOfWeek }
                }
            },
            {
                $addFields: {
                    dayNumber: { $dayOfWeek: "$interviewDetails.date" }
                }
            }
        ];

        const weekData = await CandidateModel.aggregate(weekPipeline);

        const totalWeek = weekData.length;

        // Initialize weekMap with all days set to 0
        const weekMap = {};
        dayNames.forEach(day => {
            weekMap[day] = 0;
        });

        // Populate weekMap with actual data
        weekData.forEach(c => {
            const jsDayIndex = c.dayNumber % 7;
            const dayName = dayNames[jsDayIndex];
            weekMap[dayName]++;
        });

        // Convert weekMap to the desired output format, including all days
        const weekWise = dayNames.map(day => ({
            day,
            count: weekMap[day],
            percentage: totalWeek ? parseFloat(((weekMap[day] / totalWeek) * 100).toFixed(2)) : 0
        }));

        // ---------- 2️⃣ DEPARTMENTWISE INTERVIEWS (CURRENT MONTH OR FROM-TO) ----------
        const departmentPipeline = [
            { $unwind: "$interviewDetails" },
            {
                $match: {
                    "interviewDetails.date": { $gte: from, $lte: to }
                }
            },
            {
                $lookup: {
                    from: "jobs",
                    localField: "appliedFor",
                    foreignField: "_id",
                    as: "job"
                }
            },
            { $unwind: "$job" },
            {
                $lookup: {
                    from: "departments",
                    localField: "job.hiringDepartment",
                    foreignField: "_id",
                    as: "department"
                }
            },
            { $unwind: "$department" }
        ];

        const deptData = await CandidateModel.aggregate(departmentPipeline);
        const totalDept = deptData.length;

        const deptMap = {};
        deptData.forEach(c => {
            const dept = c.department?.name || "Unknown";
            if (!deptMap[dept]) deptMap[dept] = 0;
            deptMap[dept]++;
        });

        const departmentWise = Object.entries(deptMap).map(([department, count]) => ({
            department,
            count,
            percentage: totalDept ? parseFloat(((count / totalDept) * 100).toFixed(2)) : 0
        }));

        return res.json({
            status: "success",
            weekWise,
            departmentWise
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

exports.getJoinedCandidatesOverView = async (req, res) => {
    try {
        // Validate org_uuid
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid || typeof org_uuid !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid Organization UUID is required in headers',
            });
        }

        // Validate and get date ranges
        const getDateRange = (from, to) => {
            const start = from && !isNaN(new Date(from)) ? new Date(from) : new Date(new Date().setDate(1));
            const end = to && !isNaN(new Date(to)) ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date(new Date().setMonth(new Date().getMonth() + 1, 0));
            if (isNaN(start) || isNaN(end)) {
                throw new Error('Invalid date format provided');
            }
            return { start, end };
        };

        const joinRange = getDateRange(req.query.joinRangeFromDate, req.query.joinRangeToDate);
        const onboardingRange = getDateRange(req.query.onboardingFromDate, req.query.onboardingToDate);
        const locationRange = getDateRange(req.query.locationFromDate, req.query.locationToDate);
        const departmentRange = getDateRange(req.query.departmentFromDate, req.query.departmentToDate);
        const declinedRange = getDateRange(req.query.declinedFromDate, req.query.declinedToDate);

        // Initialize models
        const { JobModel, CandidateModel } = await initModels(org_uuid);

        // 1. Joining Status Pipeline (hiringStage: Offer Accepted, Hired, PostPoned, Offer Rejected)
        const joiningStatusPipeline = [
            {
                $unwind: '$hiringStage'
            },
            {
                $match: {
                    statusDate: { $gte: joinRange.start, $lte: joinRange.end },
                    hiringStage: { $in: ['Offer Accepted', 'Hired', 'PostPoned', 'Offer Rejected'], $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$hiringStage',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$count' },
                    statuses: {
                        $push: {
                            status: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    joiningStatusBreakdown: {
                        $cond: {
                            if: { $eq: ['$total', 0] },
                            then: [],
                            else: {
                                $map: {
                                    input: '$statuses',
                                    as: 's',
                                    in: {
                                        status: '$$s.status',
                                        count: '$$s.count',
                                        percentage: {
                                            $concat: [
                                                {
                                                    $toString: {
                                                        $round: [
                                                            {
                                                                $multiply: [
                                                                    { $divide: ['$$s.count', '$total'] },
                                                                    100
                                                                ]
                                                            },
                                                            2
                                                        ]
                                                    }
                                                },
                                                '%'
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ];

        // 2. Onboarding Report Pipeline (Onboarding, Hired)
        const onboardingPipeline = [
            {
                $match: {
                    statusDate: { $gte: onboardingRange.start, $lte: onboardingRange.end },
                    status: { $in: ['Onboarding', 'Hired'] }
                }
            },
            {
                $group: {
                    _id: null,
                    complete: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Onboarding'] }, 1, 0]
                        }
                    },
                    totalcount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    complete: 1,
                    pending: 1,
                    totalcount: 1,
                    completeP: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: ['$complete', '$totalcount'] },
                                    100
                                ]
                            },
                            2
                        ]
                    },
                    pendingP: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: ['$pending', '$totalcount'] },
                                    100
                                ]
                            },
                            2
                        ]
                    }
                }
            }
        ];


        // 3. Joining by Location Pipeline (populate appliedFor -> organizationAddress.city)
        const locationPipeline = [
            {
                $match: {
                    statusDate: { $gte: locationRange.start, $lte: locationRange.end },
                    status: 'Hired',
                    appliedFor: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'appliedFor',
                    foreignField: '_id',
                    as: 'job'
                }
            },
            { $unwind: '$job' },
            {
                $lookup: {
                    from: 'organizations',
                    localField: 'job.location',
                    foreignField: '_id',
                    as: 'org'
                }
            },
            { $unwind: '$org' },
            {
                $group: {
                    _id: '$org.organizationAddress.city',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$count' },
                    locations: {
                        $push: {
                            city: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    locationBreakdown: {
                        $map: {
                            input: '$locations',
                            as: 'loc',
                            in: {
                                city: '$$loc.city',
                                count: '$$loc.count',
                                percentage: {
                                    $concat: [
                                        {
                                            $toString: {
                                                $round: [
                                                    {
                                                        $multiply: [
                                                            { $divide: ['$$loc.count', '$total'] },
                                                            100
                                                        ]
                                                    },
                                                    2
                                                ]
                                            }
                                        },
                                        '%'
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ];



        // 4. Joining by Department Pipeline (populate appliedFor -> hiringDepartment.name)
        const departmentPipeline = [
            {
                $match: {
                    statusDate: { $gte: departmentRange.start, $lte: departmentRange.end },
                    status: 'Hired',
                    appliedFor: { $exists: true, $ne: null }
                }
            },
            {
                $lookup: {
                    from: JobModel.collection.name,
                    localField: 'appliedFor',
                    foreignField: '_id',
                    as: 'job'
                }
            },
            { $unwind: '$job' },
            {
                $lookup: {
                    from: 'departments', // 🔄 Adjust if your collection name is different
                    localField: 'job.hiringDepartment',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            { $unwind: '$department' },
            {
                $group: {
                    _id: '$department.name',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$count' },
                    departments: {
                        $push: {
                            department: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    departmentBreakdown: {
                        $cond: {
                            if: { $eq: ['$total', 0] },
                            then: [],
                            else: {
                                $map: {
                                    input: '$departments',
                                    as: 'dep',
                                    in: {
                                        department: '$$dep.department',
                                        count: '$$dep.count',
                                        percentage: {
                                            $concat: [
                                                {
                                                    $toString: {
                                                        $round: [
                                                            {
                                                                $multiply: [
                                                                    { $divide: ['$$dep.count', '$total'] },
                                                                    100
                                                                ]
                                                            },
                                                            2
                                                        ]
                                                    }
                                                },
                                                '%'
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ];

        // 5. Decline Reasons Pipeline (hiringStage: Offer Rejected, group by declinedReason)
        const declineReasonsPipeline = [
            {
                $match: {
                    statusDate: { $gte: declinedRange.start, $lte: declinedRange.end },
                    status: 'Offer Rejected',
                    declinedReason: { $nin: [null, ""] }
                }
            },
            {
                $group: {
                    _id: '$declinedReason',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$count' },
                    reasons: {
                        $push: {
                            reason: '$_id',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    declineReasonsBreakdown: {
                        $cond: {
                            if: { $eq: ['$total', 0] },
                            then: [],
                            else: {
                                $map: {
                                    input: '$reasons',
                                    as: 'r',
                                    in: {
                                        reason: '$$r.reason',
                                        count: '$$r.count',
                                        percentage: {
                                            $concat: [
                                                {
                                                    $toString: {
                                                        $round: [
                                                            {
                                                                $multiply: [
                                                                    { $divide: ['$$r.count', '$total'] },
                                                                    100
                                                                ]
                                                            },
                                                            2
                                                        ]
                                                    }
                                                },
                                                '%'
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ];

        // Execute all pipelines
        const [
            joiningStatusResult,
            onboardingResult,
            locationResult,
            departmentResult,
            declineReasonsResult
        ] = await Promise.all([
            CandidateModel.aggregate(joiningStatusPipeline).exec(),
            CandidateModel.aggregate(onboardingPipeline).exec(),
            CandidateModel.aggregate(locationPipeline).exec(),
            CandidateModel.aggregate(departmentPipeline).exec(),
            CandidateModel.aggregate(declineReasonsPipeline).exec()
        ]);

        return res.status(200).json({
            success: true,
            message: 'Candidate overview fetched successfully',
            data: {
                joiningStatus: joiningStatusResult[0]?.joiningStatusBreakdown || [],
                onboarding: onboardingResult[0] || {
                    complete: 0,
                    pending: 0,
                    totalcount: 0,
                    completeP: 0,
                    pendingP: 0
                },
                location: locationResult[0]?.locationBreakdown || [],
                department: departmentResult[0]?.departmentBreakdown || [],
                declineReasons: declineReasonsResult[0]?.declineReasonsBreakdown || []
            }
        });


    } catch (error) {
        console.error('Error fetching candidate overview:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching candidate overview',
            error: error.message
        });
    }
};

exports.getEmployeeGraphData = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid || typeof org_uuid !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid Organization UUID is required in headers',
            });
        }
        const { EmployeeModel } = await initModels(org_uuid);

        const employees = await EmployeeModel.find({}, {
            demographics: 1,
            dateOfJoining: 1,
            createdAt: 1,
        });

        const now = moment();

        const ageBuckets = {
            '0-25': 0,
            '25-27': 0,
            '27-30': 0,
            '30-41': 0,
            '41-50': 0,
            '50+': 0
        };

        const genderCounts = {
            male: 0,
            female: 0,
            lgbtq: 0
        };

        const generationCounts = {
            'Gen Z': 0,
            'Millennials': 0,
            'Gen X': 0
        };

        const tenureBuckets = {
            '<1': 0,
            '1-5': 0,
            '5-10': 0,
            '10-15': 0,
            '15-20': 0,
            '20+': 0
        };

        for (const emp of employees) {
            const dob = emp.demographics?.dob;
            const doj = emp.dateOfJoining;

            // Age distribution
            if (dob) {
                const age = now.diff(moment(dob), 'years');
                if (age <= 25) ageBuckets['0-25']++;
                else if (age <= 27) ageBuckets['25-27']++;
                else if (age <= 30) ageBuckets['27-30']++;
                else if (age <= 41) ageBuckets['30-41']++;
                else if (age <= 50) ageBuckets['41-50']++;
                else ageBuckets['50+']++;

                // Generation classification
                if (age <= 27) generationCounts['Gen Z']++;
                else if (age <= 42) generationCounts['Millennials']++;
                else generationCounts['Gen X']++;
            }

            // Gender Distribution
            const gender = emp.demographics?.gender?.toLowerCase();
            if (gender === 'male') genderCounts.male++;
            else if (gender === 'female') genderCounts.female++;
            else genderCounts.lgbtq++;

            // Tenure Distribution
            if (doj) {
                const tenureYears = now.diff(moment(doj), 'years');
                if (tenureYears < 1) tenureBuckets['<1']++;
                else if (tenureYears <= 5) tenureBuckets['1-5']++;
                else if (tenureYears <= 10) tenureBuckets['5-10']++;
                else if (tenureYears <= 15) tenureBuckets['10-15']++;
                else if (tenureYears <= 20) tenureBuckets['15-20']++;
                else tenureBuckets['20+']++;
            }
        }

        // Gender percentage calculation
        const totalGender = genderCounts.male + genderCounts.female + genderCounts.lgbtq;
        const genderPercentages = {
            male: ((genderCounts.male / totalGender) * 100).toFixed(2),
            female: ((genderCounts.female / totalGender) * 100).toFixed(2),
            lgbtq: ((genderCounts.lgbtq / totalGender) * 100).toFixed(2),
        };

        return res.json({
            ageDistribution: ageBuckets,
            genderDistribution: genderPercentages,
            generationDistribution: generationCounts,
            tenureDistribution: tenureBuckets
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error generating analytics data' });
    }
};

exports.getJoinerAnalyticsYearly = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { CandidateModel } = await initModels(org_uuid);
        const now = new Date();

        // Get financial year range: April to March
        const getDateRange = (from, to) => {
            const currentYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
            const start = from ? new Date(from) : new Date(currentYear, 3, 1); // April 1
            const end = to ? new Date(to) : new Date(currentYear + 1, 2, 31, 23, 59, 59); // March 31
            return { start, end };
        };

        const { start, end } = getDateRange(req.query.joinFromDate, req.query.joinToDate);

        // Helper: format month
        const getMonthYearKey = (date) => {
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        };

        // Create month list
        const getAllMonths = (start, end) => {
            const months = [];
            let current = new Date(start);
            while (current <= end) {
                months.push(getMonthYearKey(current));
                current.setMonth(current.getMonth() + 1);
            }
            return months;
        };

        const allMonths = getAllMonths(start, end);

        // Find all hired candidates
        const hiredCandidates = await CandidateModel.find({
            statusDate: { $gte: start, $lte: end },
            status: 'Hired'
        });

        const monthCounts = {};
        let totalHires = 0;

        // Initialize counts
        allMonths.forEach(month => {
            monthCounts[month] = 0;
        });

        // Count hires by month
        for (const candidate of hiredCandidates) {
            const monthKey = getMonthYearKey(new Date(candidate.statusDate));
            if (monthCounts[monthKey] !== undefined) {
                monthCounts[monthKey]++;
                totalHires++;
            }
        }

        // Format response
        const result = allMonths.map(month => {
            const count = monthCounts[month];
            const percentage = totalHires > 0 ? parseFloat(((count / totalHires) * 100).toFixed(2)) : 0;
            return {
                month,
                hireCount: count,
                hirePercentage: percentage
            };
        });

        return res.json({
            status: 'success',
            message: 'Monthly hire analytics',
            data: result
        });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getAnalyticsSummaryRecruitment = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const {
            JobModel,
            TemplateModel,
            CandidateModel,
        } = await initModels(org_uuid);

        const now = new Date();
        const startOfWeek = (d) => {
            const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const day = date.getUTCDay();
            const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
            date.setUTCDate(diff);
            date.setUTCHours(0, 0, 0, 0);
            return date;
        };

        const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

        const percentChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return parseFloat((((current - previous) / previous) * 100).toFixed(2));
        };

        const startThisWeek = startOfWeek(now);
        const startLastWeek = new Date(startThisWeek);
        startLastWeek.setDate(startLastWeek.getDate() - 7);

        const startThisMonth = startOfMonth(now);
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const countDocs = async (Model, filter) => await Model.countDocuments(filter);

        const getModelAnalytics = async (Model, weekField = 'createdAt', monthField = 'createdAt', extraFilter = {}) => {
            const weekCurr = await countDocs(Model, { [weekField]: { $gte: startThisWeek }, ...extraFilter });
            const weekPrev = await countDocs(Model, { [weekField]: { $gte: startLastWeek, $lt: startThisWeek }, ...extraFilter });

            const monthCurr = await countDocs(Model, { [monthField]: { $gte: startThisMonth }, ...extraFilter });
            const monthPrev = await countDocs(Model, { [monthField]: { $gte: startLastMonth, $lte: endLastMonth }, ...extraFilter });

            return {
                week: { current: weekCurr, previous: weekPrev, change: percentChange(weekCurr, weekPrev) },
                month: { current: monthCurr, previous: monthPrev, change: percentChange(monthCurr, monthPrev) }
            };
        };

        const data = {};

        // JOBS
        data.jobs = await getModelAnalytics(JobModel);

        // TEMPLATES
        data.templates = await getModelAnalytics(TemplateModel);

        // CANDIDATES
        data.candidates = await getModelAnalytics(CandidateModel);

        // INTERVIEWS
        const interviewResult = await CandidateModel.aggregate([
            { $unwind: "$interviewDetails" },
            {
                $project: {
                    interviewDate: "$interviewDetails.date"
                }
            },
            {
                $facet: {
                    weekCurrent: [
                        { $match: { interviewDate: { $gte: startThisWeek } } },
                        { $count: "count" }
                    ],
                    weekPrevious: [
                        { $match: { interviewDate: { $gte: startLastWeek, $lt: startThisWeek } } },
                        { $count: "count" }
                    ],
                    monthCurrent: [
                        { $match: { interviewDate: { $gte: startThisMonth } } },
                        { $count: "count" }
                    ],
                    monthPrevious: [
                        { $match: { interviewDate: { $gte: startLastMonth, $lte: endLastMonth } } },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        data.interviews = {
            week: {
                current: interviewResult[0].weekCurrent[0]?.count || 0,
                previous: interviewResult[0].weekPrevious[0]?.count || 0,
                change: percentChange(interviewResult[0].weekCurrent[0]?.count || 0, interviewResult[0].weekPrevious[0]?.count || 0)
            },
            month: {
                current: interviewResult[0].monthCurrent[0]?.count || 0,
                previous: interviewResult[0].monthPrevious[0]?.count || 0,
                change: percentChange(interviewResult[0].monthCurrent[0]?.count || 0, interviewResult[0].monthPrevious[0]?.count || 0)
            }
        };

        // SHORTLISTED
        data.shortlisted = await getModelAnalytics(CandidateModel, 'statusDate', 'statusDate', { status: 'Shortlisted' });

        // OFFERS
        const offerAcceptedWeekCurr = await countDocs(CandidateModel, { status: 'Offer Accepted', statusDate: { $gte: startThisWeek } });
        const offerAcceptedWeekPrev = await countDocs(CandidateModel, { status: 'Offer Accepted', statusDate: { $gte: startLastWeek, $lt: startThisWeek } });

        const offerDeclinedMonthCurr = await countDocs(CandidateModel, { status: 'Offer Rejected', statusDate: { $gte: startThisMonth } });
        const offerDeclinedMonthPrev = await countDocs(CandidateModel, { status: 'Offer Rejected', statusDate: { $gte: startLastMonth, $lte: endLastMonth } });

        data.offers = {
            acceptedWeek: {
                current: offerAcceptedWeekCurr,
                previous: offerAcceptedWeekPrev,
                change: percentChange(offerAcceptedWeekCurr, offerAcceptedWeekPrev)
            },
            declinedMonth: {
                current: offerDeclinedMonthCurr,
                previous: offerDeclinedMonthPrev,
                change: percentChange(offerDeclinedMonthCurr, offerDeclinedMonthPrev)
            }
        };

        // BGV
        data.bgv = await getModelAnalytics(CandidateModel, 'bgvUplodeDate', 'bgvUplodeDate');

        // JOINED
        data.joined = await getModelAnalytics(CandidateModel, 'statusDate', 'statusDate', { status: 'Hired' });

        return res.status(200).json({ status: 'success', data });

    } catch (error) {
        console.error('Analytics Error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
