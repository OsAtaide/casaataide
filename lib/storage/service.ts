export type PrivateImageUpload = { fileName: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; fileSize: number; contentBase64: string };

export interface PrivateStorageAdapter {
  upload(input: PrivateImageUpload): Promise<{ storageKey: string }>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string): Promise<string>;
}

export function createPrivateStorageKey() {
  return `neon://task-evidence/${crypto.randomUUID()}`;
}
