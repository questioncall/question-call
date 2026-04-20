# Task Tracking

## Chunk
- Fix the logged-in home feed so question cards do not overflow or get cut off on the right side on small devices.
- Keep the compact course rail only below the `md` breakpoint, and restore the previous later/lower workspace sections from `md` upward.
- Keep the workspace header fixed and consistent by making it sticky at the top and never auto-hiding, while still removing header sideways scroll and preventing page-level x-overflow.
- Prevent long profile names in the question author chip from stretching the row vertically.
- Make question images smaller, fixed-height tiles that fully cover their image boxes.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [components\shared\workspace-home.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\workspace-home.tsx)
- [components\shared\workspace-shell.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\workspace-shell.tsx)
- [components\shared\authenticated-header.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\shared\authenticated-header.tsx)

## Exit Condition
- The logged-in home feed stays within the viewport on phones, with long question content and media wrapping cleanly instead of pushing the card to the right.
- Small devices show a compact horizontally scrollable browse-courses rail immediately below the workspace header, while `md` and larger screens return to the previous later workspace panels.
- The workspace header stays sticky at the top without any hide-on-scroll behavior, and the mobile header no longer has a sideways scroll area.
- The question author chip keeps the avatar and name on one clean line without growing taller for long names.
- Question images render in smaller fixed tiles with `object-cover`, filling their card area cleanly.
- The updated home screen still passes a production `next build`.
