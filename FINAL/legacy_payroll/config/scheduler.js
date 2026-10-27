const cron = require('node-cron');
const moment = require('moment');
const { markAbsentEmployees } = require('../controller/attendance');
const { processYearEndLeaveRenewal } = require('../controller/leaveController/leaveType');
const { deleteOldNotifications, sendBirthdayNotifications } = require('../controller/notification');
const SystemUser = require('../models/systemUserModel');

const scheduleAttendanceCheck = async () => {
    // Fetch the system user by categoryId
    const systemUser = await SystemUser.findOne({ categoryId: "576beaf0ed777ab0145122d1" });
    if (!systemUser) {
        console.error('System user not found');
        return;
    }

    const { createOrg } = systemUser;

    if (!createOrg || createOrg.length === 0) {
        console.error('No organizations found for the system user');
        return;
    }

    // Schedule the task to run at 01:00 Am every day
    cron.schedule('0 1 * * *', async () => {
        console.log('Running daily attendance absence check for all organizations...');

        for (const org of createOrg) {
            const org_uuid = org.databaseName; // Use the databaseName as org_uuid
            console.log(`Processing attendance for organization: ${org.organizationName} (org_uuid: ${org_uuid})`);

            // Yesterday in IST (attendance dates are calendar days, not UTC)
            const formattedDate = moment().utcOffset(330).subtract(1, 'day').format('YYYY-MM-DD');

            const req = {
                headers: { org_uuid },
                body: { date: formattedDate },
            };
            const res = {
                status: (code) => ({
                    json: (data) => console.log(`Response for ${org.organizationName}: ${code}`, data),
                }),
            };

            try {
                await markAbsentEmployees(req, res);
            } catch (error) {
                console.error(`Error processing organization: ${org.organizationName}`, error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

const scheduleAutoLeaveReassign = async () => {
    const systemUser = await SystemUser.findOne({
        categoryId: "576beaf0ed777ab0145122d1"
    });

    if (!systemUser?.createOrg?.length) {
        console.error('No organizations found for leave year-end scheduler');
        return;
    }

    // Calendar Year End - Runs on Jan 1 at 12:01 AM
    cron.schedule('1 0 1 1 *', async () => {
        console.log('[Scheduler] Running calendar year-end leave renewal for all organizations...');
        
        for (const org of systemUser.createOrg) {
            const org_uuid = org.databaseName;
            const organizationId = org.organizationId;

            const req = {
                headers: { org_uuid },
                body: { organizationId, yearFormat: "calendar" }
            };
            const res = {
                status: (code) => ({
                    json: (data) => {
                        if (data.success && data.data) {
                            console.log(`[Calendar Year-End] ${org.organizationName}:`, {
                                leaveTypesProcessed: data.data.leaveTypesProcessed,
                                leaveTypesRenewed: data.data.leaveTypesRenewed,
                                historyRecords: data.data.historyRecordsSaved
                            });
                        } else {
                            console.log(`[Calendar Year-End] Response for ${org.organizationName}: ${code}`, data);
                        }
                    }
                })
            };

            try {
                await processYearEndLeaveRenewal(req, res);
            } catch (error) {
                console.error(`[Calendar Year-End] Error processing org: ${org.organizationName}`, error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    // Financial Year End - Runs on Apr 1 at 12:01 AM
    cron.schedule('1 0 1 4 *', async () => {
        console.log('[Scheduler] Running financial year-end leave renewal for all organizations...');
        
        for (const org of systemUser.createOrg) {
            const org_uuid = org.databaseName;
            const organizationId = org.organizationId;

            const req = {
                headers: { org_uuid },
                body: { organizationId, yearFormat: "financial" }
            };
            const res = {
                status: (code) => ({
                    json: (data) => {
                        if (data.success && data.data) {
                            console.log(`[Financial Year-End] ${org.organizationName}:`, {
                                leaveTypesProcessed: data.data.leaveTypesProcessed,
                                leaveTypesRenewed: data.data.leaveTypesRenewed,
                                historyRecords: data.data.historyRecordsSaved
                            });
                        } else {
                            console.log(`[Financial Year-End] Response for ${org.organizationName}: ${code}`, data);
                        }
                    }
                })
            };

            try {
                await processYearEndLeaveRenewal(req, res);
            } catch (error) {
                console.error(`[Financial Year-End] Error processing org: ${org.organizationName}`, error);
            }
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('✅ Leave Year-End Schedulers Initialized:');
    console.log('  - Calendar year-end: Jan 1 at 12:01 AM (processes previous year)');
    console.log('  - Financial year-end: Apr 1 at 12:01 AM (processes previous year)');
    console.log(`  - Registered for ${systemUser.createOrg.length} organizations`);
};


// const sanwichCount = async () => {
//     const systemUser = await SystemUser.findOne({ categoryId: "576beaf0ed777ab0145122d1" });
//     if (!systemUser) {
//         console.error('System user not found');
//         return;
//     }

//     const { createOrg } = systemUser;
//     if (!createOrg || createOrg.length === 0) {
//         console.error('No organizations found for the system user');
//         return;
//     }

//     for (const org of createOrg) {
//         const org_uuid = org.databaseName;

//         // Run at midnight every day, but only execute on the last day of the month
//         cron.schedule('0 0 * * *', async () => {
//             const today = moment().format('YYYY-MM-DD');
//             const lastDay = moment().endOf('month').format('YYYY-MM-DD');

//             if (today === lastDay) {
//                 console.log(`🏁 Running Sandwich Leave Policy on Last Day of Month for org: ${org_uuid}`);
//                 await applySandwichLeavePolicy(org_uuid);
//             }
//         });

//         console.log(`✅ Scheduled Last Day of Month Task for org: ${org_uuid}`);
//     }
// };

const deleteNotifications = async () => {
    try {
        const systemUser = await SystemUser.findOne({ categoryId: "576beaf0ed777ab0145122d1" });
        if (!systemUser) {
            console.error('System user not found');
            return;
        }

        const { createOrg } = systemUser;
        if (!createOrg || createOrg.length === 0) {
            console.error('No organizations found for the system user');
            return;
        }

        // **Har 3 din me ek baar raat 12 baje chalega**
        cron.schedule('0 0 */3 * *', async () => {
            for (const org of createOrg) {
                const org_uuid = org.databaseName;
                await deleteOldNotifications(org_uuid);
            }
        });

        console.log("Notification deletion scheduler started successfully! (Runs every 3 days)");
    } catch (error) {
        console.error('Error setting up notification deletion scheduler:', error);
    }
};

const birthdayNotification = async () => {
    try {
        const systemUser = await SystemUser.findOne({ categoryId: "576beaf0ed777ab0145122d1" });
        if (!systemUser) {
            console.error('System user not found');
            return;
        }

        const { createOrg } = systemUser;
        if (!createOrg || createOrg.length === 0) {
            console.error('No organizations found for the system user');
            return;
        }

        console.log("🎯 Birthday notification scheduler is set up!");

        // Schedule the cron job to run every night at 12:00 AM
        cron.schedule('0 0 * * *', async () => {
            console.log("🎉 Running birthday notification cron job...");

            try {
                for (const org of createOrg) {
                    const org_uuid = org.databaseName;
                    await sendBirthdayNotifications(org_uuid);
                }
            } catch (error) {
                console.error('Error during cron execution:', error);
            }
        });

    } catch (error) {
        console.error('Error initializing birthday notification scheduler:', error);
    }
};

/**
 * Auto payroll — same start pattern as birthday (register only).
 * Every minute: read main-DB registry; open tenant DB only on pay day + time match.
 */
const scheduleAutoPayroll = async () => {
    try {
        const systemUser = await SystemUser.findOne({
            categoryId: '576beaf0ed777ab0145122d1',
        });

        if (!systemUser?.createOrg?.length) {
            console.error('[AutoPayroll] No organizations found — scheduler not started');
            return;
        }

        const {
            runAutoPayrollForAllOrganizations,
        } = require('../utils/payroll/autoPayrollRunner');

        cron.schedule(
            '* * * * *',
            async () => {
                try {
                    const fresh = await SystemUser.findOne({
                        categoryId: '576beaf0ed777ab0145122d1',
                    }).lean();
                    const orgs = fresh?.createOrg || systemUser.createOrg || [];
                    const summary = await runAutoPayrollForAllOrganizations(orgs);

                    const ran = summary.filter((s) => !s.skipped);
                    const waiting = summary.filter((s) => {
                        if (!(s.skipped && s.reason === 'not_auto_time')) return false;
                        if (!s.configuredTime || !s.now) return false;
                        const [ch, cm] = String(s.configuredTime).split(':').map(Number);
                        const [nh, nm] = String(s.now).split(':').map(Number);
                        const c = ch * 60 + cm;
                        const n = nh * 60 + nm;
                        return n <= c && c - n <= 30;
                    });
                    const already = summary.filter(
                        (s) => s.skipped && s.reason === 'already_auto_run'
                    );

                    if (!ran.length && !waiting.length && !already.length) return;

                    ran.forEach((row) => {
                        console.log(
                            `[AutoPayroll] ${row.org}: success=${row.success} period=${row.period} ${row.message || row.error || ''}`
                        );
                    });
                    waiting.forEach((row) => {
                        console.log(
                            `[AutoPayroll] WAIT ${row.org}: need ${row.configuredTime}, now ${row.now}`
                        );
                    });
                    already.forEach((row) => {
                        console.log(
                            `[AutoPayroll] SKIP ${row.org}: already ran ${row.period}`
                        );
                    });
                } catch (error) {
                    console.error('[AutoPayroll] Cron error:', error);
                }
            },
            {
                scheduled: true,
                timezone: process.env.TIME_ZONE || 'Asia/Kolkata',
            }
        );

        console.log('✅ Auto Payroll scheduler initialized');
    } catch (error) {
        console.error('[AutoPayroll] Init error:', error);
    }
};

module.exports = {
    scheduleAttendanceCheck,
    scheduleAutoLeaveReassign,
    // sanwichCount,
    deleteNotifications,
    birthdayNotification,
    scheduleAutoPayroll,
};