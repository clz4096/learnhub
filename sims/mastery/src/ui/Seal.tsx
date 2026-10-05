/**
 * Euclid College's emblem (the round scarlet foil seal) and crest (the white-and-red stamp),
 * from the art in sealArt.ts. The art's defs go into the page once (SealDefs, in the app
 * shell); each emblem is then a small svg that draws the shared symbol, so the large
 * rosette path is in the document only once.
 */
import { SEAL_DEFS, WAX_STAMP } from '@/ui/sealArt';

/** The shared defs, hidden. Not display:none: gradients and filters inside such an svg stop working in some browsers. */
export function SealDefs() {
  return (
    <svg
      class="seal-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: `<defs>${SEAL_DEFS}</defs>` }}
    />
  );
}

/** The round emblem. With a label it is an image with that name; without, it is decoration. */
export function Emblem({ class: cls, label }: { class?: string; label?: string }) {
  return (
    <svg
      class={cls} viewBox="0 0 200 200" focusable="false"
      role={label === undefined ? undefined : 'img'} aria-label={label} aria-hidden={label === undefined ? 'true' : undefined}
    >
      <use href="#euclid-seal" />
    </svg>
  );
}

/** The crest as the white-and-red stamp with its motto scroll, as on the certificate. Decoration. */
export function CrestStamp({ class: cls }: { class?: string }) {
  return <svg class={cls} viewBox="0 0 120 178" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: WAX_STAMP }} />;
}
