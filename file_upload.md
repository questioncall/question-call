Recommended Setup

Use:

Cloudflare R2
S3-compatible SDK
presigned uploads
Next.js API routes/server actions

Because R2 is S3-compatible.

So you use normal AWS SDK.

1. Install Packages
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

If handling multipart/form-data:

npm install formidable

or:

npm install uploadthing

But honestly:

direct presigned upload > uploading through Next.js server
2. Create R2 Bucket

Inside Cloudflare:

R2 → Create Bucket

Example:

my-platform-storage
3. Create API Tokens

Go:

R2 → Manage R2 API Tokens

Create token:

Read & Write

You will get:

R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=

Endpoint looks like:

https://<accountid>.r2.cloudflarestorage.com
4. Add Environment Variables
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=my-platform-storage
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
5. Create R2 Client

Example:

// lib/r2.ts

import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
6. Upload File API Route

Example:

// app/api/upload/route.ts

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export async function POST(req: Request) {
  const formData = await req.formData();

  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const key = `uploads/${Date.now()}-${file.name}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  const url = `https://pub-xxxxx.r2.dev/${key}`;

  return Response.json({
    success: true,
    url,
  });
}
7. Frontend Upload Example
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  return res.json();
}
8. Public Access

You have 2 options:

Option A — Public Bucket

Easy.

Files accessible directly:

https://pub-xxxxx.r2.dev/file.pdf

Good for:

images
public docs
assets
Option B — Signed URLs

More secure.

Required for:

paid course content
private documents
premium assets

Later you can generate temporary access URLs.

IMPORTANT ARCHITECTURE NOTE
Do NOT Upload Huge Files Through Next.js Server
apply rhis to mux too. let the mux own handles big files if possible .. first tell me what can be done to mux. 


Bad:

Client
→ Next.js server
→ R2

Because:

server memory usage
Vercel limits
slow uploads
timeout risk
Better Architecture
Presigned Upload URLs

Flow:

Frontend
→ asks backend for signed upload URL
→ uploads directly to R2

This is production-grade.

Professional Recommended Flow
Frontend
    ↓
Get signed upload URL
    ↓
Direct upload to R2
    ↓
Save returned URL in DB

This avoids:

server bandwidth costs
memory issues
upload bottlenecks
For Your Platform

You should probably structure uploads like this:

Type	Storage
Videos	Mux
Audio	Mux
Images	Cloudinary
PDFs/docs	R2
ZIP/resources	R2
Course assets	R2
One More Thing

You should also validate:

mime types
file size
auth
user quotas

before generating upload URLs.

Otherwise users can abuse storage quickly.