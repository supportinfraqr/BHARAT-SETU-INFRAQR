



const sendResponse = (res, status, success, message, data = {}) => {
    return res.status(status).json({
        status: status < 400,
        success,
        message,
        data,
    });
};

const handleError = (res, err, statusCode = 500) => {
    const errorStatus = statusCode || 500;
    return res.status(errorStatus).json({
        status: errorStatus,
        success: false,
        message: err.message || 'Internal server error',
    });
};

module.exports = {
    sendResponse,
    handleError,
};