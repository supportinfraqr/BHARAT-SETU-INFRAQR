const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');
const { sendPreResignationConcernEmail } = require('../service/nodemailer/mailerConfig');

const isReportingManagerContact = (contactWith = '') =>
  String(contactWith).trim().toLowerCase() === 'reporting manager';

//preResignation api's

exports.addPreResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PreResignationModel, EmployeeModel } = await initModels(org_uuid);
        const {
            employeeId: bodyEmployeeId,
            concernType,
            description,
            preferredModeOfDiscussion,
            contactWith,
            suggestedMeetingDate,
        } = req.body;

        const resolvedEmployeeId = req.empId || bodyEmployeeId;
        if (!resolvedEmployeeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Employee ID is required',
            });
        }

        const newPreResignation = new PreResignationModel({
            employeeId: resolvedEmployeeId,
            concernType,
            description,
            preferredModeOfDiscussion,
            contactWith: contactWith || '',
            suggestedMeetingDate,
        });

        const savedPreResignation = await newPreResignation.save();

        let emailNotification = { sent: false, skipped: true, reason: 'Contact with is not Reporting Manager' };

        if (isReportingManagerContact(contactWith)) {
            const employee = await EmployeeModel.findById(resolvedEmployeeId)
                .select('firstName lastName email reportingManagerId')
                .lean();

            if (!employee) {
                emailNotification = { sent: false, skipped: true, reason: 'Employee not found' };
            } else if (!employee.reportingManagerId) {
                emailNotification = { sent: false, skipped: true, reason: 'Reporting manager not assigned to employee' };
            } else {
                const manager = await EmployeeModel.findById(employee.reportingManagerId)
                    .select('firstName lastName email')
                    .lean();

                const mailResult = await sendPreResignationConcernEmail({
                    org_uuid,
                    employee,
                    manager,
                    preResignation: savedPreResignation,
                });

                emailNotification = mailResult.status === 'success'
                    ? { sent: true, to: manager?.email || null }
                    : { sent: false, skipped: false, reason: mailResult.message || 'Failed to send email' };
            }
        }

        return res.status(201).json({
            status: 'success',
            message: 'Concern request created successfully',
            data: savedPreResignation,
            emailNotification,
        });
    } catch (error) {
        console.error('Error adding pre-resignation request:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getPreResignationById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PreResignationModel } = await initModels(org_uuid);
        const { preResignationId } = req.params;

        const preResignation = await PreResignationModel.findById(preResignationId).populate('employeeId');
        if (!preResignation) {
            return res.status(404).json({
                status: 'error',
                message: 'Pre-Resignation request not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Pre-Resignation details retrieved successfully',
            data: preResignation
        });
    } catch (error) {
        console.error('Error retrieving pre-resignation details:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updatePreResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PreResignationModel } = await initModels(org_uuid);
        const { preResignationId } = req.params;
        const updateData = req.body;


        const preResignation = await PreResignationModel.findByIdAndUpdate(
            preResignationId,
            updateData,
            { new: true }
        );

        if (!preResignation) {
            return res.status(404).json({
                status: 'error',
                message: 'Pre-Resignation not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Pre-Resignation request updated successfully',
            data: preResignation
        });
    } catch (error) {
        console.error('Error updating pre-resignation request:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deletePreResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PreResignationModel } = await initModels(org_uuid);
        const { preResignationId } = req.params;

        const preResignation = await PreResignationModel.findByIdAndDelete(preResignationId);
        if (!preResignation) {
            return res.status(404).json({
                status: 'error',
                message: 'Pre-Resignation not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Pre-Resignation request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting pre-resignation request:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllPreResignations = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { PreResignationModel } = await initModels(org_uuid);
        const { page = 1, limit = 10, status, employeeId } = req.query;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        const query = {};
        if (employeeId) {
            query.employeeId = employeeId;
        }
        if (status) {
            query.resolutionStatus = status;
        }

        const totalPreResignations = await PreResignationModel.countDocuments(query);

        const preResignations = await PreResignationModel.find(query)
            .populate('employeeId')
            .sort({ createdAt: -1 })
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        return res.status(200).json({
            status: 'success',
            message: 'Pre-Resignation requests retrieved successfully',
            data: preResignations,
            pagination: {
                total: totalPreResignations,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalPreResignations / limitInt)
            }
        });
    } catch (error) {
        console.error('Error retrieving pre-resignation requests:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

//resignation api's


exports.addResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const {
            employeeId,
            resignationDate,
            lastWorkingDay,
            reasonForLeaving,
            concernType,
            description,
            exitInterviewDetails,
            handoverDetails,
            earlyResignationRequest
        } = req.body;

        const newResignation = new ResignationModel({
            employeeId,
            resignationDate,
            lastWorkingDay,
            reasonForLeaving,
            concernType,
            description,
            exitInterviewDetails,
            handoverDetails,
            earlyResignationRequest
        });

        const savedResignation = await newResignation.save();

        return res.status(201).json({
            status: 'success',
            message: 'Resignation request created successfully',
            data: savedResignation
        });
    } catch (error) {
        console.error('Error adding resignation request:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.getResignationById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const { resignationId } = req.params;

        const resignation = await ResignationModel.findById(resignationId).populate('employeeId');
        if (!resignation) {
            return res.status(404).json({
                status: 'error',
                message: 'Resignation request not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Resignation details retrieved successfully',
            data: resignation
        });
    } catch (error) {
        console.error('Error retrieving resignation details:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.updateResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const { resignationId } = req.params;
        const updateData = req.body;

        const resignation = await ResignationModel.findByIdAndUpdate(
            resignationId,
            updateData,
            { new: true }
        );

        if (!resignation) {
            return res.status(404).json({ status: 'error', message: 'Resignation not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Resignation request updated successfully',
            data: resignation
        });
    } catch (error) {
        console.error('Error updating resignation request:', error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
};

exports.deleteResignation = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const { resignationId } = req.params;

        const resignation = await ResignationModel.findByIdAndDelete(resignationId);
        if (!resignation) {
            return res.status(404).json({ status: 'error', message: 'Resignation not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Resignation request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting resignation request:', error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
};

exports.getAllResignations = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const { page = 1, limit = 10, status, employeeId } = req.query;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        const query = {};
        if (employeeId) {
            query.employeeId = employeeId;
        }
        if (status) {
            query.status = status;
        }

        const totalResignations = await ResignationModel.countDocuments(query);


        const resignations = await ResignationModel.find(query)
            .populate('employeeId')
            .sort({ createdAt: -1 })
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        return res.status(200).json({
            status: 'success',
            message: 'Resignation requests retrieved successfully',
            data: resignations,
            pagination: {
                total: totalResignations,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalResignations / limitInt)
            }
        });
    } catch (error) {
        console.error('Error retrieving resignation requests:', error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
    }
};

//dashboard

exports.getResignationAnalytics = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const now = new Date();

        const getDateRange = (from, to) => {
            const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
            const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { start, end };
        };

        const reasonRange = getDateRange(req.query.reasonFromDate, req.query.reasonToDate);
        const agingRange = getDateRange(req.query.agingFromDate, req.query.agingToDate);
        const deptRange = getDateRange(req.query.departmentFromDate, req.query.departmentToDate);
        const rehireRange = getDateRange(req.query.rehireFromDate, req.query.rehireToDate);
        const exitRange = getDateRange(req.query.exitFromDate, req.query.exitToDate);


        // 1️⃣ Reason-Wise Graph
        const reasonData = await ResignationModel.find({
            resignationDate: { $gte: reasonRange.start, $lte: reasonRange.end }
        });

        const concernMap = {};
        for (const r of reasonData) {
            (r.concernType || []).forEach(c => {
                if (!concernMap[c]) concernMap[c] = 0;
                concernMap[c]++;
            });
        }

        const reasonWise = Object.entries(concernMap).map(([concern, count]) => ({
            concern,
            count
        }));

        // 2️⃣ Aging of Resignations
        const agingData = await ResignationModel.find({
            resignationDate: { $gte: agingRange.start, $lte: agingRange.end }
        }).populate({ path: 'employeeId', select: 'dateOfJoining' });

        const agingCounts = {
            '0-6 months': 0,
            '6-12 months': 0,
            '1-3 years': 0,
            '3-5 years': 0,
            '5+ years': 0,
        };

        for (const r of agingData) {
            const doj = new Date(r.employeeId?.dateOfJoining);
            if (!doj || isNaN(doj)) continue;

            const diffTime = now.getTime() - doj.getTime();
            const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4375);

            if (diffMonths <= 6) agingCounts['0-6 months']++;
            else if (diffMonths <= 12) agingCounts['6-12 months']++;
            else if (diffMonths <= 36) agingCounts['1-3 years']++;
            else if (diffMonths <= 60) agingCounts['3-5 years']++;
            else agingCounts['5+ years']++;
        }

        const totalAging = Object.values(agingCounts).reduce((sum, count) => sum + count, 0);
        const agingGraph = Object.entries(agingCounts).map(([range, count]) => ({
            range,
            count,
            percentage: totalAging > 0 ? parseFloat(((count / totalAging) * 100).toFixed(2)) : 0
        }));

        // 3️⃣ Department-Wise Graph (Only departmentName & count)
        const deptData = await ResignationModel.find({
            resignationDate: { $gte: deptRange.start, $lte: deptRange.end }
        }).populate({
            path: 'employeeId',
            select: 'departmentId',
            populate: {
                path: 'departmentId',
                select: 'name'
            }
        });

        const deptCounts = {};
        for (const r of deptData) {
            const deptName = r.employeeId?.departmentId?.name || 'Unknown';
            if (!deptCounts[deptName]) deptCounts[deptName] = 0;
            deptCounts[deptName]++;
        }

        const departmentWise = Object.entries(deptCounts).map(([departmentName, count]) => ({
            departmentName,
            count
        }));


        // 5️⃣ Rehire vs Bared Stats (with department name)
        const rehireData = await ResignationModel.find({
            resignationDate: { $gte: rehireRange.start, $lte: rehireRange.end },
            status: "Completed"
        }).populate({
            path: 'employeeId',
            select: 'departmentId rehireStatus',
            populate: {
                path: 'departmentId',
                select: 'name'
            }
        });

        let rehireCount = 0;
        let baredCount = 0;
        const departmentMap = {};

        for (const r of rehireData) {
            const deptName = r.employeeId?.departmentId?.name || 'Unknown';
            const status = r.employeeId?.rehireStatus;

            if (!departmentMap[deptName]) {
                departmentMap[deptName] = { Rehire: 0, Bared: 0 };
            }

            if (status === 'Rehire') {
                rehireCount++;
                departmentMap[deptName].Rehire++;
            } else if (status === 'Bared') {
                baredCount++;
                departmentMap[deptName].Bared++;
            }
        }

        const totalRehire = rehireCount + baredCount;

        const rehireStats = [
            {
                type: 'Rehire',
                count: rehireCount,
                percentage: totalRehire > 0 ? parseFloat(((rehireCount / totalRehire) * 100).toFixed(2)) : 0
            },
            {
                type: 'Bared',
                count: baredCount,
                percentage: totalRehire > 0 ? parseFloat(((baredCount / totalRehire) * 100).toFixed(2)) : 0
            }
        ];

        // Department-wise stats
        const departmentRehireStats = Object.entries(departmentMap).map(([departmentName, values]) => {
            const total = values.Rehire + values.Bared;
            return {
                departmentName,
                Rehire: values.Rehire,
                Bared: values.Bared,
                RehirePercentage: total > 0 ? parseFloat(((values.Rehire / total) * 100).toFixed(2)) : 0,
                BaredPercentage: total > 0 ? parseFloat(((values.Bared / total) * 100).toFixed(2)) : 0
            };
        });

        // 2️⃣ Exit Interview Status
        const interviewStatuses = await ResignationModel.find({
            resignationDate: { $gte: exitRange.start, $lte: exitRange.end }
        });


        let pendingCount = 0;
        let completedCount = 0;

        for (const r of interviewStatuses) {
            if (['Submitted', 'Under Review'].includes(r.status)) pendingCount++;
            else if (['Approved', 'Rejected', 'Completed'].includes(r.status)) completedCount++;
        }

        const totalInterviews = pendingCount + completedCount;

        const exitInterviewStats = [
            {
                status: 'Pending',
                count: pendingCount,
                percentage: totalInterviews > 0 ? parseFloat(((pendingCount / totalInterviews) * 100).toFixed(2)) : 0
            },
            {
                status: 'Completed',
                count: completedCount,
                percentage: totalInterviews > 0 ? parseFloat(((completedCount / totalInterviews) * 100).toFixed(2)) : 0
            }
        ];



        return res.json({
            status: 'success',
            reasonWise,
            agingGraph,
            departmentWise,
            rehireStats,
            departmentRehireStats,
            exitInterviewStats
        });


    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getPreResignationAnalytics = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { PreResignationModel } = await initModels(org_uuid);
        const now = new Date();

        const getDateRange = (from, to) => {
            const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
            const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            return { start, end };
        };

        const concernRange = getDateRange(req.query.reasonFromDate, req.query.reasonToDate);
        const raiseRange = getDateRange(req.query.raiseFromDate, req.query.raiseToDate);

        // 1️⃣ Most Common Concerns
        const concernData = await PreResignationModel.find({
            resignationDate: { $gte: concernRange.start, $lte: concernRange.end }
        });

        const concernMap = {};
        for (const r of concernData) {
            (r.concernType || []).forEach(c => {
                if (!concernMap[c]) concernMap[c] = 0;
                concernMap[c]++;
            });
        }

        const concernGraph = Object.entries(concernMap).map(([concern, count]) => ({
            concern,
            count
        }));

        // 2️⃣ Raised Concerns (Resolution Status Breakdown)
        const raiseData = await PreResignationModel.find({
            resignationDate: { $gte: raiseRange.start, $lte: raiseRange.end }
        });

        let pendingCount = 0;
        let completedCount = 0;
        let partiallyResolvedCount = 0;
        let unresolvedCount = 0;

        for (const r of raiseData) {
            const status = r.resolutionStatus;
            if (status === 'Pending') pendingCount++;
            else if (status === 'Resolved') completedCount++;
            else if (status === 'Partially Resolved') partiallyResolvedCount++;
            else if (status === 'Unresolved') unresolvedCount++;
        }

        const total = pendingCount + completedCount + partiallyResolvedCount + unresolvedCount;

        const raiseConcerns = [
            {
                status: 'Pending',
                count: pendingCount,
                percentage: total > 0 ? parseFloat(((pendingCount / total) * 100).toFixed(2)) : 0
            },
            {
                status: 'Completed',
                count: completedCount,
                percentage: total > 0 ? parseFloat(((completedCount / total) * 100).toFixed(2)) : 0
            },
            {
                status: 'Partially Resolved',
                count: partiallyResolvedCount,
                percentage: total > 0 ? parseFloat(((partiallyResolvedCount / total) * 100).toFixed(2)) : 0
            },
            {
                status: 'Unresolved',
                count: unresolvedCount,
                percentage: total > 0 ? parseFloat(((unresolvedCount / total) * 100).toFixed(2)) : 0
            }
        ];

        return res.json({
            status: 'success',
            concernGraph,
            raiseConcerns
        });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getResignationAnalyticsYearly = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'Organization UUID not found' });
        }

        const { ResignationModel } = await initModels(org_uuid);
        const now = new Date();

        // Set default date range (April to March of current financial year)
        const getDateRange = (from, to) => {
            const currentYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
            const start = from ? new Date(from) : new Date(currentYear, 3, 1); // April 1st
            const end = to ? new Date(to) : new Date(currentYear + 1, 2, 31, 23, 59, 59); // March 31st
            return { start, end };
        };

        const approvedRange = getDateRange(req.query.approvedFromDate, req.query.approvedToDate);
        const voluntaryRange = getDateRange(req.query.voluntaryFromDate, req.query.voluntaryToDate);
        const resignationRange = getDateRange(req.query.resignationFromDate, req.query.resignationToDate);

        // Helper function to get month-year key
        const getMonthYearKey = (date) => {
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        };

        // Helper function to generate all months in the financial year
        const getAllMonths = (start, end) => {
            const months = [];
            let current = new Date(start);
            while (current <= end) {
                months.push(getMonthYearKey(current));
                current.setMonth(current.getMonth() + 1);
            }
            return months;
        };

        const allMonths = getAllMonths(approvedRange.start, approvedRange.end);

        // 1️⃣ Approved Status Graph (Approved vs Not Approved, monthly count and percentage + total percentage)
        const approvedData = await ResignationModel.find({
            resignationDate: { $gte: approvedRange.start, $lte: approvedRange.end }
        });

        const approvedCounts = {};
        let totalApproved = 0;
        let totalNotApproved = 0;

        // Initialize counts for all months
        allMonths.forEach(month => {
            approvedCounts[month] = { Approved: 0, NotApproved: 0 };
        });

        for (const r of approvedData) {
            const monthYear = getMonthYearKey(new Date(r.resignationDate));
            if (!approvedCounts[monthYear]) {
                approvedCounts[monthYear] = { Approved: 0, NotApproved: 0 };
            }
            if (r.status === 'Approved') {
                approvedCounts[monthYear].Approved++;
                totalApproved++;
            } else {
                approvedCounts[monthYear].NotApproved++;
                totalNotApproved++;
            }
        }

        const totalStatus = totalApproved + totalNotApproved;
        const approvedStatusGraph = {
            monthlyData: allMonths.map(month => {
                const counts = approvedCounts[month];
                const total = counts.Approved + counts.NotApproved;
                return {
                    month,
                    Approved: counts.Approved,
                    NotApproved: counts.NotApproved,
                    ApprovedPercentage: total > 0 ? parseFloat(((counts.Approved / total) * 100).toFixed(2)) : 0,
                    NotApprovedPercentage: total > 0 ? parseFloat(((counts.NotApproved / total) * 100).toFixed(2)) : 0
                };
            }),
            totalPercentage: {
                Approved: totalStatus > 0 ? parseFloat(((totalApproved / totalStatus) * 100).toFixed(2)) : 0,
                NotApproved: totalStatus > 0 ? parseFloat(((totalNotApproved / totalStatus) * 100).toFixed(2)) : 0
            }
        };

        // 2️⃣ Voluntary vs Involuntary Graph (monthly count)
        const voluntaryData = await ResignationModel.find({
            resignationDate: { $gte: voluntaryRange.start, $lte: voluntaryRange.end }
        });

        const voluntaryCounts = {};
        let totalVoluntary = 0;
        let totalInvoluntary = 0;

        // Initialize counts for all months
        allMonths.forEach(month => {
            voluntaryCounts[month] = { Voluntary: 0, Involuntary: 0 };
        });

        for (const r of voluntaryData) {
            const monthYear = getMonthYearKey(new Date(r.resignationDate));
            if (!voluntaryCounts[monthYear]) {
                voluntaryCounts[monthYear] = { Voluntary: 0, Involuntary: 0 };
            }
            if (r.resignationType === 'Voluntary') {
                voluntaryCounts[monthYear].Voluntary++;
                totalVoluntary++;
            } else if (r.resignationType === 'Involuntary') {
                voluntaryCounts[monthYear].Involuntary++;
                totalInvoluntary++;
            }
        }

        const voluntaryGraph = allMonths.map(month => ({
            month,
            Voluntary: voluntaryCounts[month].Voluntary,
            Involuntary: voluntaryCounts[month].Involuntary
        }));

        // 3️⃣ Monthly Resignation Rate Graph (count and average rate)
        const resignationData = await ResignationModel.find({
            resignationDate: { $gte: resignationRange.start, $lte: resignationRange.end }
        });

        const monthlyCounts = {};
        let totalResignations = 0;

        // Initialize counts for all months
        allMonths.forEach(month => {
            monthlyCounts[month] = 0;
        });

        for (const r of resignationData) {
            const monthYear = getMonthYearKey(new Date(r.resignationDate));
            if (!monthlyCounts[monthYear]) {
                monthlyCounts[monthYear] = 0;
            }
            monthlyCounts[monthYear]++;
            totalResignations++;
        }

        // Calculate totalEmployees as sum of resignations across all months
        const totalEmployees = totalResignations;
        const monthCount = allMonths.length;
        const averageRate = monthCount > 0 && totalEmployees > 0 ? parseFloat((totalResignations / (totalEmployees * monthCount) * 100).toFixed(2)) : 0;

        const resignationRateGraph = allMonths.map(month => ({
            month,
            count: monthlyCounts[month],
            rate: totalEmployees > 0 ? parseFloat((monthlyCounts[month] / totalEmployees * 100).toFixed(2)) : 0
        }));

        return res.json({
            status: 'success',
            approvedStatusGraph,
            voluntaryGraph,
            resignationRateGraph: {
                monthlyData: resignationRateGraph,
                averageRate,
                totalEmployees
            }
        });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};