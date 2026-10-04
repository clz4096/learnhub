/**
 * Help entry points. HelpButton sits next to the mode switch and opens the Help page.
 * HelpLayer mounts the Help page and the walkthrough, opens the walkthrough on a
 * viewer's first visit, and shows a failed "try this" action.
 */
import { useEffect } from 'preact/hooks';
import { HelpDialog } from '@/ui/help/HelpDialog';
import { Tour, setTourReturnFocus } from '@/ui/help/Tour';
import { autoStartTour, dispatchTour, tour } from '@/ui/help/walkthrough';
import { helpNotice, helpOpen } from '@/ui/help/state';
import '@/ui/help/help.css';

export function HelpButton() {
  return (
    <button
      type="button"
      class="btn btn-small help-button"
      aria-haspopup="dialog"
      aria-expanded={helpOpen.value}
      onClick={() => {
        if (tour.value.open) dispatchTour('close');
        helpOpen.value = true;
      }}
    >
      Help
    </button>
  );
}

export function HelpLayer() {
  useEffect(() => {
    if (autoStartTour()) setTourReturnFocus(document.querySelector<HTMLElement>('.help-button'));
  }, []);
  const notice = helpNotice.value;
  return (
    <>
      {notice && (
        <div class="help-notice error small" role="alert">
          <span>{notice}</span>
          <button type="button" class="btn btn-small" onClick={() => { helpNotice.value = null; }}>Dismiss</button>
        </div>
      )}
      <HelpDialog />
      <Tour />
    </>
  );
}
