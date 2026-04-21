1. add social media tab in admin panel too form where the the amdin can add more field of socail media and reomve the social medai make sure it have atleast 10 already iconed blank social media which admincal can easily add the url link. and savong those urlled handles instantyl showed up in the heeader share icon whenhvoerd.

also in the chat-area the video and images are takign mcuh widht and ehight make that fix ratio and also lets make thoose supprot multiple files max 10 at atime . video or photos . 
6:34 PM



I’m looking at the admin social config flow and the chat attachment flow together so we can wire both cleanly without bolting on messy state. First I’m checking how the current social handles are stored/rendered, then I’ll trace how chat uploads and attachment previews are handled so we can add multi-file support safely.


Ran 5 commands
I’ve found the two main surfaces. Social links are still hard-coded as fixed fields in PlatformConfig, and chat attachments currently work as a single pending file with unconstrained preview sizing. I’m reading those two implementations in detail now so I can refactor them once, not patch them in three places.


Ran 8 commands
I hit the shape of the social feature now: the admin form saves to DB, but the workspace header only gets the handles once from the server, so it can’t reflect changes live yet. I’m checking the existing Pusher config update channel next, because that’s the cleanest way to make the hovered share panel update instantly after save.


Ran 7 commands
Worked for 52s
I’ve confirmed we don’t need a risky backend message-schema change for the multi-upload part. The clean path is to let the picker accept up to 10 files, upload them one by one, and create one message per attachment so it stays compatible with the current chat model and APIs.

Ran Get-Content -LiteralPath 'D:\siddhant-files\projects\LISTNERS\listeners\app\api\channels\[channelId]\messages\route.ts' | Select-Object -First 320 for 1s
Ran rg -n "Tabs|tab|settings tabs|SettingsClient" app\(admin)\admin components\ui for 1s
Ran Get-Content 'models\Message.ts' | Select-Object -First 240
Ran rg -n "Tabs|TabsList|TabsTrigger|TabsContent" 'app\(admin)\admin' components\ui
Ran rg --files app\api | rg "channels.*messages.*route\.ts$"
Ran Get-ChildItem -Recurse -Filter route.ts app\api\channels | Select-Object -ExpandProperty FullName
Ran Get-Content -LiteralPath 'D:\siddhant-files\projects\LISTNERS\listeners\app\api\channels\[id]\messages\route.ts' | Select-Object -First 320
Ran Get-Content 'components\ui\tabs.tsx' | Select-Object -First 220
Steered conversation
in white mode the rating channel the rating star appear nearly non - make them black borders stars nwhite mode and white bordered in darkmode.  

Ran rg -n "DEFAULT_PLATFORM_SOCIAL_HANDLES|SOCIAL_HANDLE_META|SocialHandleKey" .
Steered conversation
You've hit your usage limit. To get more access now, send a request to your admin or try again at 10:45 PM.



2. in the wallet of teacher show the history that how the have earned which and how much points and when. all deatilly. like in the history section of the wallet. 