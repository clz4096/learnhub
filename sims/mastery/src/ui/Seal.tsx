/**
 * The arms of the University of New Cambridge and the scarlet foil seal of Euclid College,
 * from the art in sealArt.ts. The art's defs go into the page once (SealDefs, in the app
 * shell); each emblem is then a small svg that draws a shared symbol, so the large
 * guilloche path is in the document only once.
 */
import { SEAL_DEFS } from '@/ui/sealArt';

/** The shared defs, hidden. Not display:none: gradients and filters inside such an svg stop working in some browsers. */
export function SealDefs() {
  return (
    <svg
      class="seal-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: `<defs>${SEAL_DEFS}</defs>` }}
    />
  );
}

/** The round seal of Euclid College. With a label it is an image with that name; without, it is decoration. */
export function Seal({ class: cls, label }: { class?: string; label?: string }) {
  return (
    <svg
      class={cls} viewBox="0 0 200 200" focusable="false"
      role={label === undefined ? undefined : 'img'} aria-label={label} aria-hidden={label === undefined ? 'true' : undefined}
    >
      <use href="#euclid-seal" />
    </svg>
  );
}

/**
 * The arms of the University: the shield alone, or with its UNIVERSITAS NOVAE CANTABRIGIAE
 * scroll. With a label it is an image with that name; without, it is decoration.
 */
export function Arms({ class: cls, label, scroll = false }: { class?: string; label?: string; scroll?: boolean }) {
  return (
    <svg
      class={cls} viewBox={scroll ? '0 0 120 176' : '0 0 120 150'} focusable="false"
      role={label === undefined ? undefined : 'img'} aria-label={label} aria-hidden={label === undefined ? 'true' : undefined}
    >
      <use href={scroll ? '#euclid-armsUni' : '#euclid-arms'} />
    </svg>
  );
}
