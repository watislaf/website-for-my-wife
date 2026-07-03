import fs from "node:fs";
import path from "node:path";

/**
 * PUBLIC media route — serves uploaded landing images from the volume. It is NOT
 * under the /admin proxy (landing images must render for anonymous visitors), so
 * it does no auth. Its only job is to read a single file from UPLOAD_DIR after
 * strictly sanitizing the requested name against path traversal.
 */
export const dynamic = "force-dynamic";

// Same dir the upload action writes to: <dir of DATABASE_PATH>/uploads.
const UPLOAD_DIR = path.join(
  path.dirname(process.env.DATABASE_PATH ?? "./data/app.db"),
  "uploads",
);

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  // Reject anything that isn't a plain filename: no path separators, no "..",
  // only a conservative charset. This is the traversal guard.
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const ext = path.extname(name).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Unsupported media type", { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, name);

  // Defense in depth: ensure the resolved path is still inside UPLOAD_DIR.
  const resolved = path.resolve(filePath);
  if (resolved !== path.join(path.resolve(UPLOAD_DIR), name)) {
    return new Response("Bad request", { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.promises.readFile(resolved);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
