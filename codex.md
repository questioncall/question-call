# Handoff

## Current task
- Finish mobile Google auth and web referral/subscription config cleanup.

## Done already
- Mobile build now succeeds on the Android device.
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\app\app.json`
  - added Android scheme for `com.siddthecoder.qustioncall`
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\app\android\app\src\main\AndroidManifest.xml`
  - added deep link intent filter for `com.siddthecoder.qustioncall`
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\web\models\PlatformConfig.ts`
  - added `bonusQuestionValueNpr`
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\web\app\(admin)\admin\pricing\pricing-client.tsx`
  - referral config UI now has both bonus fields
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\web\app\(admin)\admin\format-config\format-client.tsx`
  - added bonus question NPR config field
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\web\app\(workspace)\subscription\page.tsx`
  - passes config values into subscription UI
- `D:\siddhant-files\projects\CLIENT_PROJECTS\Jiwan-Mijhar\web\app\(workspace)\subscription\subscription-client.tsx`
  - referral text/share email now use config values
  - plan cards show a “Save NPR X” badge from DB config

## Next tasks
1. Google Cloud Console
   - enable custom URI scheme for the Android OAuth client
   - use `com.siddthecoder.qustioncall`
   - confirm correct package name + SHA-1
2. Rebuild dev client and retest Google login on the phone
3. If Google login still fails after redirect fix, check `/api/mobile/login` backend token verification for Android audience support
4. Do one quick web pass for any leftover hardcoded referral strings and verify config save/load end-to-end
