# ✅ COMPLETED — Notes Service

The note service has been built end-to-end. Here's what was implemented:

## Model
- `web/models/Note.ts` — Mongoose model with title, description, subject, grade, fileType, fileUrl, uploaderId

## API Routes
- `GET /api/notes` — List notes with filters (subject, grade, cursor pagination)
- `POST /api/notes` — Create a note (all authenticated users)
- `GET /api/notes/[id]` — Fetch single note detail
- `PATCH /api/notes/[id]` — Update metadata (owner only)
- `DELETE /api/notes/[id]` — Delete note (owner or admin)

## Web
- `/notes` browse page with search, grid layout, upload dialog
- `/notes/[id]` detail page with read mode + inline edit for owner
- "Community Notes" panel in workspace home right sidebar
- "Notes" link added to sidebar navigation

## Mobile App
- `app/notes.tsx` now uses real API (replaced MOCK_NOTES)
- Pull-to-refresh, loading state, real POST for uploads

## Pending (future)
- File upload to Cloudinary (fileUrl is currently optional/null)
- Integrate file picker in both web upload dialog and mobile upload modal