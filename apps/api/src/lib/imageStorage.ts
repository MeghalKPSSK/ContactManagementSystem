import crypto from 'crypto';
import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';

const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim() || '';
const AZURE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER?.trim() || '';
const USE_AZURE_BLOB_STORAGE = Boolean(AZURE_CONNECTION_STRING && AZURE_CONTAINER_NAME);

let cachedContainerClient: ContainerClient | null = null;

const getExtensionFromMimeType = (mimeType: string): string => {
  const normalized = mimeType.toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/webp') return 'webp';
  return 'bin';
};

const getContainerClient = async (): Promise<ContainerClient | null> => {
  if (!USE_AZURE_BLOB_STORAGE) return null;
  if (cachedContainerClient) return cachedContainerClient;

  const serviceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
  const containerClient = serviceClient.getContainerClient(AZURE_CONTAINER_NAME);
  await containerClient.createIfNotExists({ access: 'blob' });
  cachedContainerClient = containerClient;
  return containerClient;
};

const toDataUri = (file: Express.Multer.File): string => {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};

export const persistUploadedImage = async (
  file: Express.Multer.File,
  scope: 'profiles' | 'groups'
): Promise<string> => {
  if (!file?.buffer?.length) {
    throw new Error('Empty image payload');
  }

  if (USE_AZURE_BLOB_STORAGE) {
    try {
      const containerClient = await getContainerClient();
      if (containerClient) {
        const extension = getExtensionFromMimeType(file.mimetype);
        const blobName = `${scope}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
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
    } catch (error) {
      // Azure is optional in local/dev setups. Fall back to a data URI when unavailable.
      console.warn('Azure upload failed, falling back to base64 data URI:', error);
    }
  }

  return toDataUri(file);
};

export const isAzureConfigured = (): boolean => USE_AZURE_BLOB_STORAGE;
