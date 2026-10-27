const { initModels } = require('../models/indexModel');

exports.createNotification = async (org_uuid, employeeId, title, message) => {
    const { NotificationModel } = await initModels(org_uuid);
    const notification = new NotificationModel({ employeeId, title, message });
    await notification.save();
};

exports.getNotification = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { NotificationModel } = await initModels(org_uuid);
        const { employeeId } = req.params;

        const notifications = await NotificationModel.find({ employeeId }).sort({ createdAt: -1 });

        return res.status(200).json({
            status: 'success',
            message: 'Notifications fetched successfully',
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.notificationStatus = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'Organization UUID not found'
            });
        }

        const { NotificationModel } = await initModels(org_uuid);
        const { notificationIds } = req.body;

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid notification IDs'
            });
        }

        const result = await NotificationModel.updateMany(
            { _id: { $in: notificationIds } },
            { $set: { status: "read" } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No notifications found to update'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Notification status updated successfully',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error updating notification status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.deleteOldNotifications = async (org_uuid) => {
    try {
        const { NotificationModel } = await initModels(org_uuid);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const result = await NotificationModel.deleteMany({ createdAt: { $lt: threeDaysAgo } });

        console.log(`Deleted ${result.deletedCount} old notifications for org: ${org_uuid}`);

    } catch (error) {
        console.error('Error deleting old notifications:', error);
    }
};

exports.sendBirthdayNotifications = async (org_uuid) => {
    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        const { EmployeeModel, NotificationModel } = await initModels(org_uuid);

        // Find employees whose birthday matches today
        const employeesWithBirthday = await EmployeeModel.find({
            "demographics.dob": {
                $exists: true,
                $ne: "",
                $regex: new RegExp(`-${todayMonth.toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}$`)
            }
        });

        if (employeesWithBirthday.length === 0) {
            console.log(`No birthdays today in organization: ${org_uuid}`);
            return;
        }

        for (const employee of employeesWithBirthday) {
            const title = "🎉 Happy Birthday!";
            const message = `Wishing you a fantastic birthday, ${employee.firstName} ${employee.lastName}! 🎂🎈`;

            const notification = new NotificationModel({
                employeeId: employee._id,
                title,
                message
            });

            await notification.save();
        }

        console.log(`🎂 Sent birthday notifications to ${employeesWithBirthday.length} employees in org: ${org_uuid}`);

    } catch (error) {
        console.error('Error sending birthday notifications:', error);
    }
};