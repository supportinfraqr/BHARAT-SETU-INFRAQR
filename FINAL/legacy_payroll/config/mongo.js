const mongoose = require('mongoose');
const config = require('./systemConfig');
const { mainSystemUserCategories, newSystemUserCategories } = require('./defultCategory');
const SystemUser = require('../models/systemUserModel');

const connections = {};

const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUrl);
        mainSystemUserCategories()
        console.log("mongoDB connection successfully");
    } catch (err) {
        console.error(err, "error");
    }
};

// Helper function to get a connection to the new database
const getDatabaseConnection = async (databaseName, skipValidation = false) => {

    if (!skipValidation) {
        const user = await SystemUser.findOne({ categoryId: "576beaf0ed777ab0145122d1", 'createOrg.databaseName': databaseName });
        if (!user) {
            throw new Error(`No database found: ${databaseName}`);
        }
    }
    // Check if the connection already exists
    if (connections[databaseName]) {
        console.log(`Using existing connection to ${databaseName}`);
        return connections[databaseName];
    }

    const dbURI = `${config.mongoBaseUrl}${databaseName}`;
    try {
        const connection = await mongoose.createConnection(dbURI);

        connections[databaseName] = connection; // Store the new connection
        console.log(`mongoDB connected to ${databaseName} successfully`);

        // Pass the connection object to newSystemUserCategories
        await newSystemUserCategories(connection);

        return connection;
    } catch (err) {
        console.error(err, "error");
        throw err;
    }
};

module.exports = { connectDB, getDatabaseConnection };
