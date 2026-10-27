const uploadConfig = {
    platform: process.env.UPLOAD_PLATFORM,

    aws: {
        bucketName: process.env.AWS_BUCKET_NAME,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    },
    azure: {
        containerName: process.env.AZURE_CONTAINER_NAME,
        accountName: process.env.AZURE_ACCOUNT_NAME,
        accountKey: process.env.AZURE_ACCOUNT_KEY,
    },
    google: {
        bucketName: process.env.GOOGLE_BUCKET_NAME,
        projectId: process.env.GOOGLE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY,
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    },
};

module.exports = uploadConfig;
