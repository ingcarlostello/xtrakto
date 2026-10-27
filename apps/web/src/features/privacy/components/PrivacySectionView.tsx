import { Fragment } from "react";
import { CONTACT_EMAIL } from "@/lib/site";
import { EMAIL_SLOT, type PrivacySection } from "../privacy.constants";

// A paragraph's text, with the contact address as a link where it names it.
function WithEmail({ text }: { text: string }) {
  const parts = text.split(EMAIL_SLOT);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && (
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      )}
    </Fragment>
  ));
}

/** One part of the privacy page: its title, its paragraphs and its list. */
export function PrivacySectionView({ section }: { section: PrivacySection }) {
  const titleId = `privacy-${section.id}`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-heading text-section font-semibold">
        {section.title}
      </h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-body text-ink-secondary">
          <WithEmail text={paragraph} />
        </p>
      ))}
      {section.items && (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-ink-secondary marker:text-ink-faint">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
