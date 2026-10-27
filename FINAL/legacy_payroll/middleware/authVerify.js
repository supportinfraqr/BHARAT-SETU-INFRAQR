const jwt = require("jsonwebtoken");
const UserJwt = require('../models/userJWTModel');


// exports.authJWT = async (req, res, next) => {
//     var token = req.headers['authorization'] || req.headers['Authorization'];

//     if (token) {
//         token = token.split(' ')[1];

//         var privateKey = process.env.PRIVATE_KEY;

//         jwt.verify(token, privateKey, function (err, decoded) {
//             if (err) {
//                 return res.status(401).json({
//                     status: 401,
//                     statusName: "Unauthorized",
//                     message: "Token has expired Please provide a valid token"
//                 });
//             } else {
//                 let jwtData = await UserJwt.findOne({ systemUserId: decoded.userId })
//                 if (!jwtData & jwtData.currentToken == null) {
//                     return res.status(401).json({
//                         status: 'error',
//                         message: 'Invalid or expired token. Please log in again.',
//                     });
//                 }
//                 req.userId = decoded.userId;
//                 req.categoryId = decoded.categoryId;

//                 next();
//             }
//         });
//     } else {
//         return res.status(403).json({
//             status: 403,
//             statusName: "Forbidden",
//             message: 'Please provide a valid token'
//         });
//     }
// };

exports.authJWT = async (req, res, next) => {
    try {
        let token = req.headers['authorization'] || req.headers['Authorization'];

        if (!token) {
            return res.status(401).json({
                status: 401,
                statusName: "Unauthorized",
                message: "Token is missing. Please provide a valid token."
            });
        }

        // Remove the "Bearer" prefix if present
        token = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

        const privateKey = process.env.PRIVATE_KEY;

        jwt.verify(token, privateKey, async (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    status: 401,
                    statusName: "Unauthorized",
                    message: "Token has expired or is invalid. Please provide a valid token."
                });
            }

            // Find the JWT entry in the database
            const jwtData = await UserJwt.findOne({ systemUserId: decoded.userId });

            if (!jwtData || jwtData.currentToken == null) {
                return res.status(401).json({
                    status: 401,
                    statusName: "Unauthorized",
                    message: "Invalid or expired token. Please log in again."
                });
            }

            // Attach user data to the request object
            req.userId = decoded.userId;
            req.categoryId = decoded.categoryId;
            req.empId = decoded.empId;

            next(); // Proceed to the next middleware or route handler
        });
    } catch (error) {
        console.error("Error in authJWT middleware:", error);
        return res.status(500).json({
            status: 500,
            statusName: "Internal Server Error",
            message: "An error occurred while processing your request. Please try again."
        });
    }
};