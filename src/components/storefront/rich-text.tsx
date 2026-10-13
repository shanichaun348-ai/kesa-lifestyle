import * as React from "react";

import { parseRichText, type InlineRun } from "@/modules/content/rich-text";
import { cn } from "@/lib/utils";

type RichTextProps = {
  text: string;
  className?: string | undefined;
};

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((run, i) =>
        run.bold ? (
          <strong key={i} className="font-semibold text-ink">
            {run.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{run.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/**
 * Owner-written product copy with its light formatting: `**bold**`,
 * `- ` bullet points and one paragraph per line. Renders React elements
 * from parsed text, never HTML, so pasted content cannot inject markup.
 */
export function RichText({ text, className }: RichTextProps) {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {blocks.map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Runs runs={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Runs runs={block.runs} />
          </p>
        ),
      )}
    </div>
  );
}
