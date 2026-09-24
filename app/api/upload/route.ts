import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 8;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

function getExtension(mimeType: string, fileName?: string): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'image/svg+xml') return '.svg';
  if (fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) return ext;
  }
  return '.jpg';
}

async function saveFile(file: Blob, uploadDir: string): Promise<{ url: string; fileName: string; size: number; mimeType: string }> {
  const mimeType = file.type || '';

  if (!ALLOWED_TYPES.includes(mimeType) && !mimeType.startsWith('image/')) {
    throw new Error('Invalid file format. Please upload a JPEG, PNG, WEBP, or GIF image.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File is too large. Maximum file size is 10MB per image.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = file instanceof File ? file.name : undefined;
  const extension = getExtension(mimeType, originalName);
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const fileName = `upload-${uniqueId}${extension}`;
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);

  return { url: `/uploads/${fileName}`, fileName, size: file.size, mimeType };
}

export async function POST(request: NextRequest) {
  try {
    // Optional auth — verify if token provided but don't block if missing
    const authorization = request.headers.get('authorization');
    const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (idToken) {
      try {
        await getAuth().verifyIdToken(idToken);
      } catch {
        // non-blocking
      }
    }

    const formData = await request.formData();

    // Support both single-file ("file") and multi-file ("files") field names
    const multipleFiles = formData.getAll('files') as Blob[];
    const singleFile = formData.get('file') as Blob | null;

    const filesToProcess: Blob[] = multipleFiles.length > 0 ? multipleFiles : singleFile ? [singleFile] : [];

    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No file(s) provided.' }, { status: 400 });
    }

    if (filesToProcess.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_FILES} images per upload.` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Process all files in parallel
    const results = await Promise.all(
      filesToProcess.map((file) => saveFile(file, uploadDir))
    );

    // Single-file response: keep backward-compat shape { url, fileName, ... }
    if (results.length === 1) {
      return NextResponse.json({ success: true, ...results[0] }, { status: 201 });
    }

    // Multi-file response: { urls: [...], files: [...] }
    return NextResponse.json(
      {
        success: true,
        urls: results.map((r) => r.url),
        files: results,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
}
