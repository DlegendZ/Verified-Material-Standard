import { PublicShell } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { OBJECTION_TEXT } from "@/lib/text";
export const metadata = { title: OBJECTION_TEXT.title };
export default function ObjectionPage() {
  return (
    <PublicShell>
      <article className="space-y-6">
        <div>
          <Badge tone="neutral">{OBJECTION_TEXT.badge}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
            {OBJECTION_TEXT.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            {OBJECTION_TEXT.introduction}
          </p>
        </div>
        <ol className="space-y-4">
          {OBJECTION_TEXT.steps.map((step, i) => (
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
          <PanelHeader title={OBJECTION_TEXT.previewTitle} />
          <PanelBody>
            <fieldset disabled className="space-y-4">
              <Field label={OBJECTION_TEXT.reason} htmlFor="objection-reason">
                <Textarea id="objection-reason" disabled />
              </Field>
              <Checkbox label={OBJECTION_TEXT.confirmation} disabled />
              <Button disabled>{OBJECTION_TEXT.submit}</Button>
            </fieldset>
          </PanelBody>
        </Panel>
        <p className="text-sm leading-7 text-ink-muted">
          {OBJECTION_TEXT.closing}
        </p>
      </article>
    </PublicShell>
  );
}
