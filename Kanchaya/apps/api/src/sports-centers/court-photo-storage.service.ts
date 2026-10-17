import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CourtPhotoStorageService {
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly accessKeyId: string | undefined;
  private readonly secretAccessKey: string | undefined;
  private clientInstance: S3Client | undefined;

  constructor(config: ConfigService) {
    this.endpoint =
      config.get<string>('S3_ENDPOINT') ?? 'http://localhost:9000';
    this.bucket =
      config.get<string>('COURT_PHOTOS_BUCKET') ?? 'kanchaya-court-photos';
    this.publicBaseUrl =
      config.get<string>('COURT_PHOTOS_PUBLIC_BASE_URL') ??
      `${this.endpoint.replace(/\/+$/, '')}/${this.bucket}`;
    this.accessKeyId =
      config.get<string>('S3_ACCESS_KEY_ID') ||
      config.get<string>('MINIO_ROOT_USER');
    this.secretAccessKey =
      config.get<string>('S3_SECRET_ACCESS_KEY') ||
      config.get<string>('MINIO_ROOT_PASSWORD');
  }

  async createUploadForm(
    key: string,
    contentType: string,
    byteSize: number,
  ): Promise<{ url: string; fields: Record<string, string> }> {
    return createPresignedPost(this.client(), {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, byteSize],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      Expires: 300,
    });
  }

  publicUrl(key: string): string {
    return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }

  async verifyUpload(key: string) {
    const client = this.client();
    let head;
    try {
      head = await client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (cause) {
      if (isMissingObject(cause)) {
        throw new BadRequestException(
          'No encontramos la foto cargada. Vuelve a seleccionarla e inténtalo de nuevo.',
        );
      }
      throw cause;
    }
    const object = await client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Range: 'bytes=0-11',
      }),
    );
    const bytes = await object.Body?.transformToByteArray();
    return {
      byteSize: head.ContentLength ?? 0,
      contentType: head.ContentType ?? '',
      signature: bytes ? Buffer.from(bytes) : Buffer.alloc(0),
    };
  }

  async delete(key: string): Promise<void> {
    await this.client().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private client(): S3Client {
    if (this.clientInstance) return this.clientInstance;
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new ServiceUnavailableException(
        'La carga de fotos no está configurada. Contacta al administrador de KanchaYA.',
      );
    }
    this.clientInstance = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
    return this.clientInstance;
  }
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
