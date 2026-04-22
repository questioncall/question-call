# Task Tracking

## Chunk
- Switch the app favicon/apple icon to the main `public/logo.png`, generating adjusted icon assets where needed.
- Make `/admin/settings` the default admin landing page and reorganize it into a cleaner settings hub.
- Add a smart admin search bar that searches tab metadata and navigates directly to the matching admin location from the dropdown.
- Split social media into its own dedicated settings section and move admin profile/password/admin creation under a clearer profile area.
- Verify the updated admin navigation/settings flow and favicon wiring with TypeScript after the refactor.

## Files To Touch
- [task.md](d:\siddhant-files\projects\LISTNERS\listeners\task.md)
- [app\layout.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\layout.tsx)
- [app\icon.png](d:\siddhant-files\projects\LISTNERS\listeners\app\icon.png)
- [app\apple-icon.png](d:\siddhant-files\projects\LISTNERS\listeners\app\apple-icon.png)
- [app\(admin)\admin\layout.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(admin)\admin\layout.tsx)
- [app\(admin)\admin\page.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(admin)\admin\page.tsx)
- [app\(admin)\admin\settings\page.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(admin)\admin\settings\page.tsx)
- [app\(admin)\admin\settings\settings-client.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(admin)\admin\settings\settings-client.tsx)
- [app\(admin)\admin\admin-nav.tsx](d:\siddhant-files\projects\LISTNERS\listeners\app\(admin)\admin\admin-nav.tsx)
- [components\admin\admin-header-client.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\admin\admin-header-client.tsx)
- [components\admin\admin-search-client.tsx](d:\siddhant-files\projects\LISTNERS\listeners\components\admin\admin-search-client.tsx)
- [lib\auth.ts](d:\siddhant-files\projects\LISTNERS\listeners\lib\auth.ts)
- [lib\admin-portal.ts](d:\siddhant-files\projects\LISTNERS\listeners\lib\admin-portal.ts)

## Exit Condition
- The app favicon and Apple touch icon are derived from `public/logo.png`.
- Visiting the default admin route lands on `/admin/settings`.
- Admin search can find settings sections and major admin routes from metadata/keywords and navigate from the dropdown.
- The settings page reads as a navigation hub, with social media isolated into its own section and admin profile/access grouped more clearly.
- TypeScript passes after the combined implementation.
