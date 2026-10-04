/** A visible way back from a view reached by a button, next to the browser's own Back. */
import { go, type Route } from '@/model/route';

export function BackLink({ to, label }: { to: Route; label: string }) {
  return (
    <p class="back-row">
      <button type="button" class="linklike back" onClick={() => go(to)}>{label}</button>
    </p>
  );
}
