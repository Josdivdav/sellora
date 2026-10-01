import { NextResponse, NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Prevent directory traversal attacks
    const cleanFilename = path.basename(filename);
    if (!cleanFilename || cleanFilename.includes("..")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", cleanFilename);

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(cleanFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
