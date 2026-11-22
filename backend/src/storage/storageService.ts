import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { BadRequestError } from "../common/errors.ts";
import { env } from "../config/env.ts";

export interface StoredFileResult {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface StorageProvider {
  saveImage(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<StoredFileResult>;
  deleteImage(storageKey: string): Promise<void>;
}

const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function validateImage(file: {
  buffer: Buffer;
  mimetype: string;
  size: number;
}): void {
  if (!ALLOWED_MIME_EXT[file.mimetype]) {
    throw new BadRequestError("Format gambar harus JPG, PNG, atau WebP");
  }
  if (
    file.size <= 0 ||
    file.size > MAX_IMAGE_BYTES ||
    file.buffer.length !== file.size
  ) {
    throw new BadRequestError("Ukuran gambar maksimal 5 MB");
  }

  const buffer = file.buffer;
  const valid =
    (file.mimetype === "image/jpeg" &&
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff) ||
    (file.mimetype === "image/png" &&
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.mimetype === "image/webp" &&
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP");

  if (!valid)
    throw new BadRequestError(
      "Isi file tidak sesuai dengan format gambar yang diizinkan",
    );
}

export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir = path.resolve(process.cwd(), env.uploadDir)) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolveSafePath(storageKey: string): string {
    if (!storageKey || storageKey.includes("\0"))
      throw new BadRequestError("Nama file tidak valid");
    const cleanKey = path.basename(storageKey);
    const resolved = path.resolve(this.baseDir, cleanKey);
    if (!resolved.startsWith(this.baseDir + path.sep)) {
      throw new BadRequestError("Akses path file tidak diizinkan");
    }
    return resolved;
  }

  async saveImage(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<StoredFileResult> {
    validateImage(file);
    await fs.mkdir(this.baseDir, { recursive: true });
    const storageKey = `${crypto.randomUUID()}${ALLOWED_MIME_EXT[file.mimetype]}`;
    await fs.writeFile(this.resolveSafePath(storageKey), file.buffer);
    return {
      storageKey,
      publicUrl: `/uploads/${storageKey}`,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async deleteImage(storageKey: string): Promise<void> {
    if (!storageKey) return;
    try {
      await fs.unlink(this.resolveSafePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    if (!env.cloudinary.configured) {
      throw new Error("Cloudinary belum dikonfigurasi");
    }
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
  }

  async saveImage(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<StoredFileResult> {
    validateImage(file);
    const publicId = `wedding-invitations/${crypto.randomUUID()}`;
    const uploaded = await new Promise<{
      public_id: string;
      secure_url: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "image",
          overwrite: false,
          unique_filename: false,
        },
        (error, result) => {
          if (error || !result)
            return reject(error ?? new Error("Upload Cloudinary gagal"));
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
          });
        },
      );
      stream.end(file.buffer);
    });

    return {
      storageKey: uploaded.public_id,
      publicUrl: uploaded.secure_url,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async deleteImage(storageKey: string): Promise<void> {
    if (!storageKey) return;
    const result = await cloudinary.uploader.destroy(storageKey, {
      resource_type: "image",
    });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Gagal menghapus media Cloudinary: ${result.result}`);
    }
  }
}

export const storageService: StorageProvider = env.cloudinary.configured
  ? new CloudinaryStorageProvider()
  : new LocalStorageProvider();
