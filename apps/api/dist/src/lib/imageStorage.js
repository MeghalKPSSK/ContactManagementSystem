"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAzureConfigured = exports.persistUploadedImage = void 0;
const crypto_1 = __importDefault(require("crypto"));
const storage_blob_1 = require("@azure/storage-blob");
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim() || '';
const AZURE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER?.trim() || '';
const USE_AZURE_BLOB_STORAGE = Boolean(AZURE_CONNECTION_STRING && AZURE_CONTAINER_NAME);
let cachedContainerClient = null;
const getExtensionFromMimeType = (mimeType) => {
    const normalized = mimeType.toLowerCase();
    if (normalized === 'image/jpeg' || normalized === 'image/jpg')
        return 'jpg';
    if (normalized === 'image/png')
        return 'png';
    if (normalized === 'image/gif')
        return 'gif';
    if (normalized === 'image/webp')
        return 'webp';
    return 'bin';
};
const getContainerClient = async () => {
    if (!USE_AZURE_BLOB_STORAGE)
        return null;
    if (cachedContainerClient)
        return cachedContainerClient;
    const serviceClient = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    const containerClient = serviceClient.getContainerClient(AZURE_CONTAINER_NAME);
    await containerClient.createIfNotExists({ access: 'blob' });
    cachedContainerClient = containerClient;
    return containerClient;
};
const toDataUri = (file) => {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
};
const persistUploadedImage = async (file, scope) => {
    if (!file?.buffer?.length) {
        throw new Error('Empty image payload');
    }
    if (USE_AZURE_BLOB_STORAGE) {
        try {
            const containerClient = await getContainerClient();
            if (containerClient) {
                const extension = getExtensionFromMimeType(file.mimetype);
                const blobName = `${scope}/${Date.now()}-${crypto_1.default.randomUUID()}.${extension}`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadData(file.buffer, {
                    blobHTTPHeaders: { blobContentType: file.mimetype },
                    metadata: {
                        originalName: file.originalname,
                        scope,
                    },
                });
                return blockBlobClient.url;
            }
        }
        catch (error) {
            // Azure is optional in local/dev setups. Fall back to a data URI when unavailable.
            console.warn('Azure upload failed, falling back to base64 data URI:', error);
        }
    }
    return toDataUri(file);
};
exports.persistUploadedImage = persistUploadedImage;
const isAzureConfigured = () => USE_AZURE_BLOB_STORAGE;
exports.isAzureConfigured = isAzureConfigured;
//# sourceMappingURL=imageStorage.js.map