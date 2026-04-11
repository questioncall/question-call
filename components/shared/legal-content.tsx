type LegalContentProps = {
  termsOfUseContent: string;
  privacyPolicyContent: string;
  updatedAt?: string | Date | null;
};

function renderParagraphs(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function formatUpdatedAt(updatedAt?: string | Date | null) {
  if (!updatedAt) {
    return "Live platform document";
  }

  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "Live platform document";
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LegalContent({
  termsOfUseContent,
  privacyPolicyContent,
  updatedAt,
}: LegalContentProps) {
  const updatedLabel = formatUpdatedAt(updatedAt);
  const sections = [
    {
      body: renderParagraphs(termsOfUseContent),
      title: "Terms of Use",
    },
    {
      body: renderParagraphs(privacyPolicyContent),
      title: "Privacy Policy",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-5">
        <p className="eyebrow text-[11px] font-semibold text-muted-foreground">
          Legal
        </p>
        <h1 className="headline text-3xl font-bold tracking-tight text-foreground">
          Terms and Policies
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Please read these terms and policies carefully before using the
          platform. This content is managed through the platform configuration
          and can be updated by the admin team.
        </p>
        <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          Last updated: {updatedLabel}
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="whitespace-pre-line text-sm leading-7 text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
