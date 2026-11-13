import { getLocale } from "@/lib/locale-server";
import { objectionEn } from "@/lib/public-english";
import { PublicShell } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OBJECTION_TEXT } from "@/lib/text";
export async function generateMetadata() {
  return {
    title:
      (await getLocale()) === "en" ? objectionEn.title : OBJECTION_TEXT.title,
  };
}
export default async function ObjectionPage() {
  const copy = (await getLocale()) === "en" ? objectionEn : OBJECTION_TEXT;
  return (
    <PublicShell>
      <article className="space-y-6">
        <div>
          <Badge tone="neutral">{copy.badge}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {copy.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            {copy.introduction}
          </p>
        </div>
        <ol className="space-y-4">
          {copy.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono font-semibold text-brand">
                {i + 1}
              </span>
              <div>
                <h2 className="font-semibold text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <Panel>
          <PanelHeader title={copy.previewTitle} />
          <PanelBody>
            <fieldset disabled className="space-y-4">
              <Field label={copy.reason} htmlFor="objection-reason">
                <Textarea id="objection-reason" disabled />
              </Field>
              <Checkbox label={copy.confirmation} disabled />
              <Button disabled>{copy.submit}</Button>
            </fieldset>
          </PanelBody>
        </Panel>
        <p className="text-sm leading-7 text-ink-muted">{copy.closing}</p>
      </article>
    </PublicShell>
  );
}
