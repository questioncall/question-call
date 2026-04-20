const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'lib/sendEmails/sendReferralInviteEmail.ts',
  'lib/sendEmails/sendLiveSessionInviteEmail.ts',
  'lib/sendEmails/sendAdminNotificationEmail.ts',
  'lib/course-page-data.ts',
  'lib/config.ts',
  'emails/ReferralInviteEmail.tsx',
  'emails/TransactionAlertEmail.tsx',
  'emails/LiveSessionInviteEmail.tsx',
  'components/shared/public-landing.tsx',
  'components/shared/workspace-shell.tsx',
  'components/shared/logo.tsx',
  'components/shared/guest-header.tsx',
  'components/course/CourseHeader.tsx',
  'app/[username]/page.tsx',
  'app/api/auth/register/route.ts',
  'app/studio/page.tsx',
  'app/(workspace)/subscription/subscription-client.tsx',
  'app/(courses)/courses/page.tsx',
  'app/(admin)/admin/notices/page.tsx',
  'app/(courses)/courses/[slug]/page.tsx',
  'app/(courses)/courses/my/page.tsx',
  'app/(courses)/courses/courses-browse.tsx',
  'app/subscription/payment/page.tsx',
  'app/layout.tsx'
];

for (const fileUrl of filesToUpdate) {
  const filePath = path.join(__dirname, fileUrl);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replacements
  // 1. process.env.NEXT_PUBLIC_APP_NAME || "Question Call" -> APP_NAME
  content = content.replace(/process\.env\.NEXT_PUBLIC_APP_NAME\s*\|\|\s*"Question Call"/g, 'APP_NAME');
  
  // 2. "Question Call" (in quotes)
  content = content.replace(/"Question Call"/g, 'APP_NAME');
  
  // 3. Question Call (in JSX text, e.g. <h1>Question Call</h1> or text)
  // Be careful with this global replace. Let's use negative lookbehind/lookahead for quotes,
  // but JS replace string with regex is fine since we already replaced the quoted ones above.
  content = content.replace(/(?<!["'`A-Za-z_-])Question Call(?!["'`A-Za-z_-])/g, '{APP_NAME}');

  // In string templates like `... Question Call ...` we might need ${APP_NAME} instead of {APP_NAME}.
  // We'll fix these up below by finding {APP_NAME} inside backticks and converting to ${APP_NAME}.
  // A simple hack: if it's inside `, this gets tricky.
  // Let's rely on standard text replacement first.
  
  // 4. "EduAsk"
  content = content.replace(/"EduAsk"/g, 'APP_NAME');
  content = content.replace(/(?<!["'`])EduAsk(?!["'`])/g, '{APP_NAME}');

  // 5. "Listeners" in app/layout.tsx
  if (fileUrl === 'app/layout.tsx') {
    content = content.replace(/"Listeners"/g, 'APP_NAME');
    content = content.replace(/%s \| Listeners/g, '%s | ${APP_NAME}'); // Need backticks for this to work
    // So let's replace the whole block dynamically:
    content = content.replace(/template: "%s \| \$\{APP_NAME\}"/, "template: `%s | ${APP_NAME}`");
  }

  // Import injection
  if (content !== originalContent && !content.includes('import { APP_NAME }')) {
    // Determine the relative path to lib/constants
    // or just use @/lib/constants
    const importStmt = `import { APP_NAME } from "@/lib/constants";\n`;
    
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const nextNewLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, nextNewLine + 1) + importStmt + content.slice(nextNewLine + 1);
    } else {
      content = importStmt + '\n' + content;
    }
  }

  // Write back
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', fileUrl);
  }
}
