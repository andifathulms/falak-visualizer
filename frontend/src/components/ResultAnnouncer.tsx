"use client";

/**
 * Announces a finished calculation to a screen reader.
 *
 * Every result page mounts its output below the form and leaves focus on the
 * submit button, so a screen reader user pressing "Compute" previously heard
 * nothing at all - no completion, no verdict, no error. WCAG 4.1.3.
 *
 * role="status" rather than moving focus: the result is not a new context, it
 * is an update to this one, and yanking focus out of the form would make it
 * harder to adjust an input and recompute. A polite live region lets the
 * announcement finish without interrupting whatever the user is doing.
 *
 * role is the right tool here and not an ARIA-first shortcut - there is no
 * native HTML element that announces its own content changes.
 *
 * The text is a short summary, not the whole result. A live region that
 * re-reads an entire table on every change is worse than silence; the detail
 * stays on screen, navigable at the user's pace.
 *
 * Rendered visually hidden rather than with `hidden` or display:none, which
 * would remove it from the accessibility tree and stop it announcing at all.
 */
export function ResultAnnouncer({ message }: { message: string | null }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message ?? ""}
    </p>
  );
}
