const AWS = require('aws-sdk');
const { BlobServiceClient } = require('@azure/storage-blob');
const { Storage } = require('@google-cloud/storage');
const cloudinary = require('cloudinary').v2;
const uploadConfig = require('../../config/uplodeConfig');

// AWS Upload
const s3 = new AWS.S3({
    accessKeyId: uploadConfig.aws.accessKeyId,
    secretAccessKey: uploadConfig.aws.secretAccessKey,
    region: uploadConfig.aws.region,
});

const awsUpload = async (file) => {
    try {
        if (!file || !file.buffer || !file.originalname) {
            throw new Error('File does not have required properties');
        }

        // Generate a unique key using timestamp
        const fileKey = `uploads/${Date.now()}-${file.originalname}`;

        const params = {
            Bucket: uploadConfig.aws.bucketName,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };

        const data = await s3.upload(params).promise();
        return data;
    } catch (error) {
        console.error('AWS Upload Error:', error);
        throw new Error('AWS Upload Failed');
    }
};

// Azure Upload
const azureUpload = async (file) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${uploadConfig.azure.accountName};AccountKey=${uploadConfig.azure.accountKey};EndpointSuffix=core.windows.net`
    );
    const containerClient = blobServiceClient.getContainerClient(uploadConfig.azure.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(file.filename);

    await blockBlobClient.uploadData(file.buffer, { blobHTTPHeaders: { blobContentType: file.mimetype } });
    return blockBlobClient.url;
};

// Google Cloud Upload
const storage = new Storage({
    projectId: uploadConfig.google.projectId,
    credentials: {
        client_email: uploadConfig.google.clientEmail,
        private_key: uploadConfig.google.privateKey,
    },
});

const googleUpload = async (file) => {
    const bucket = storage.bucket(uploadConfig.google.bucketName);
    const blob = bucket.file(file.filename);
    const blobStream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });

    return new Promise((resolve, reject) => {
        blobStream.on('finish', () => resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`));
        blobStream.on('error', reject);
        blobStream.end(file.buffer);
    });
};

// Cloudinary Upload
cloudinary.config({
    cloud_name: uploadConfig.cloudinary.cloud_name,
    api_key: uploadConfig.cloudinary.api_key,
    api_secret: uploadConfig.cloudinary.api_secret,
});

const cloudinaryUpload = async (file) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                folder: 'uploads',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        ).end(file.buffer);
    });
};

// AWS Delete
const awsDelete = async (fileKey) => {
    const params = {
        Bucket: uploadConfig.aws.bucketName,
        Key: fileKey,
    };
    return s3.deleteObject(params).promise();
};

// Azure Delete
const azureDelete = async (fileKey) => {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
        `DefaultEndpointsProtocol=https;AccountName=${uploadConfig.azure.accountName};AccountKey=${uploadConfig.azure.accountKey};EndpointSuffix=core.windows.net`
    );
    const containerClient = blobServiceClient.getContainerClient(uploadConfig.azure.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
    return blockBlobClient.delete();
};

// Google Cloud Delete
const googleDelete = async (fileKey) => {
    const bucket = storage.bucket(uploadConfig.google.bucketName);
    const file = bucket.file(fileKey);
    return file.delete();
};

// Cloudinary Delete
const cloudinaryDelete = async (fileKey) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(fileKey, { resource_type: 'auto' }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
    });
};


// Unified Upload Logic
const uploadFile = async (file) => {
    let result;
    switch (uploadConfig.platform) {
        case 'aws':
            result = await awsUpload(file);
            return {
                platform: 'aws',
                url: result.Location,
                bucket: result.Bucket,
                key: result.Key
            };
        case 'azure':
            result = await azureUpload(file);
            return {
                platform: 'azure',
                url: result.url,
                container: result.container,
                blob: result.blobName
            };
        case 'google':
            result = await googleUpload(file);
            return {
                platform: 'google',
                url: result.mediaLink,
                bucket: result.bucket,
                key: result.name
            };
        case 'cloudinary':
            result = await cloudinaryUpload(file);
            return {
                platform: 'cloudinary',
                url: result,
                public_id: result.public_id
            };
        default:
            throw new Error('Unsupported platform');
    }
};


// Unified Delete Logic
const deleteFile = async (fileKey) => {
    switch (uploadConfig.platform) {
        case 'aws':
            return awsDelete(fileKey);
        case 'azure':
            return azureDelete(fileKey);
        case 'google':
            return googleDelete(fileKey);
        case 'cloudinary':
            return cloudinaryDelete(fileKey);
        default:
            throw new Error('Unsupported platform');
    }
};

module.exports = { uploadFile, deleteFile };
