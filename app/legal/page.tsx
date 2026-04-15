import { LegalContent } from "@/components/shared/legal-content";
import { getLegalContent, getPlatformConfig } from "@/models/PlatformConfig";

export const dynamic = 'force-dynamic';

export default async function LegalPage() {
  const config = await getPlatformConfig();
  const legalContent = getLegalContent(config);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <LegalContent
          privacyPolicyContent={legalContent.privacyPolicyContent}
          termsOfUseContent={legalContent.termsOfUseContent}
          updatedAt={legalContent.updatedAt}
        />
      </div>
    </div>
  );
}
