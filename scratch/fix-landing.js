const fs = require('fs');
let content = fs.readFileSync('components/shared/public-landing.tsx', 'utf8');

// 1. Remove + design (SVG grid)
content = content.replace(
  /backgroundImage:\s*`url\("data:image\/svg\+xml,[^`]+`\),/g,
  ''
);

// 2. FAQ Icon
content = content.replace(
  /import\s*\{\s*HelpCircle,\s*ChevronDown\s*}\s*from\s*"lucide-react";/g,
  'import { HelpCircle, ChevronDown, PlusIcon } from "lucide-react";'
);
content = content.replace(
  /<HelpCircle\s+size=\{16\}\s+color=\{iconColor\}\s*\/>/g,
  '<PlusIcon size={16} color={iconColor} />'
);

// 3. Text colors
// Hero gradient text
content = content.replace(
  /background:\s*"linear-gradient\(135deg,#1f766e 30%,#2176ae\)",\s*WebkitBackgroundClip:\s*"text",\s*WebkitTextFillColor:\s*"transparent",\s*backgroundClip:\s*"text",/g,
  'color: isDark ? "#f9fafb" : "#030712",'
);

// General text color replacements
content = content.replace(/"#e8f5f3"\s*:\s*"#0a2e2a"/g, '"#f9fafb" : "#030712"');
content = content.replace(/"#e8f5f3"\s*:\s*"#0f3d38"/g, '"#f9fafb" : "#030712"');
content = content.replace(/"#c8e6e2"\s*:\s*"#0a2e2a"/g, '"#f9fafb" : "#030712"');
content = content.replace(/"#d2f2ed"\s*:\s*"#154a44"/g, '"#f9fafb" : "#030712"');

content = content.replace(/"#7fb8b2"\s*:\s*"#3d6b64"/g, '"#9ca3af" : "#4b5563"');
content = content.replace(/"#6aaba4"\s*:\s*"#4a7a74"/g, '"#9ca3af" : "#4b5563"');
content = content.replace(/"#5a9990"\s*:\s*"#6aaba4"/g, '"#9ca3af" : "#4b5563"');
content = content.replace(/"#5a9990"\s*:\s*"#5a8a84"/g, '"#9ca3af" : "#4b5563"');
content = content.replace(/"#5a9990"\s*:\s*"#4a8a82"/g, '"#9ca3af" : "#4b5563"');

content = content.replace(/"#9dc8c3"\s*:\s*"#2a6b64"/g, '"#d1d5db" : "#374151"');
content = content.replace(/"#9dc8c3"\s*:\s*"#3d6b64"/g, '"#d1d5db" : "#374151"');

// Fix remaining green colors that might be missed
content = content.replace(/"#5a9990"\s*:\s*"#8aaca8"/g, '"#9ca3af" : "#6b7280"');
content = content.replace(/"#9dc8c3"\s*:\s*"#1f766e"/g, '"#d1d5db" : "#374151"');
content = content.replace(/"#3a6a64"\s*:\s*"#9dc8c3"/g, '"#374151" : "#d1d5db"');
content = content.replace(/"#4a8a82"\s*:\s*"#7ab5ae"/g, '"#4b5563" : "#9ca3af"');

// specific FAQ colors
// const questionColor= isDark ? "#c8e6e2" : "#0a2e2a";
// const answerColor  = isDark ? "rgba(200,230,226,0.72)" : "rgba(10,46,42,0.7)";
content = content.replace(/const answerColor\s*=\s*isDark \? "rgba\(200,230,226,0\.72\)" : "rgba\(10,46,42,0\.7\)";/g, 'const answerColor = isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.7)";');

fs.writeFileSync('components/shared/public-landing.tsx', content);
console.log("Replacements complete!");
