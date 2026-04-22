import { LegalContent } from "@/components/shared/legal-content";
import { getLegalContent, getPlatformConfig } from "@/models/PlatformConfig";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = createPageMetadata({
  title: "Terms, Privacy, and Policies",
  description:
    "Read the latest Question Call terms, privacy information, and platform policies before using the service.",
  path: "/legal",
});

export default async function LegalPage() {
  let legalContent;
  
  try {
    const config = await getPlatformConfig();
    legalContent = getLegalContent(config);
  } catch (error) {
    console.error("Failed to fetch legal content:", error);
    legalContent = getLegalContent(null);
  }

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
