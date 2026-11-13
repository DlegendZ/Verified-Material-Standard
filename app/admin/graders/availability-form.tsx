"use client";

import { useActionState } from "react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { setGraderAvailabilityAction, type ActionState } from "../actions";

export function AvailabilityForm({
  id,
  available,
}: {
  id: string;
  available: boolean;
}) {
  const en = useLocale() === "en";
  const [state, action, pending] = useActionState(
    setGraderAvailabilityAction,
    {} as ActionState,
  );
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="graderId" value={id} />
      <input type="hidden" name="available" value={String(!available)} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending
          ? en
            ? "Saving…"
            : "Menyimpan…"
          : available
            ? en
              ? "Mark unavailable"
              : "Tandai tidak tersedia"
            : en
              ? "Mark available"
              : "Tandai tersedia"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {en ? "Availability could not be saved." : state.error}
        </p>
      )}
    </form>
  );
}
