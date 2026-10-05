/**
 * The Letters tab: Euclid College's seal, then the campaign's letters, each in full:
 * written by the study plan from the learner's own numbers at each milestone, newest
 * first, stamped with the University's arms and marked simulated. Below them the two milestone
 * documents: the offer letter, filled from the campaign once the offer arrives (Act IV
 * complete), and the degree certificate. Before its milestone each is a locked preview
 * with example data, labelled as an example. Letters due are delivered here too, so the
 * tab never lags the campaign.
 */
import { useState } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import { letterText, type Admissions, type Campaign } from '@/model/campaign';
import { campaign } from '@/model/campaignStore';
import { summarize } from '@/model/campaignSummary';
import { loadDays } from '@/model/dayLog';
import { now } from '@/model/store';
import { AppLink, WithAdmissions, shortStamp, useDeliverLetters } from '@/ui/campaignShared';
import { Certificate, EXAMPLE_DEGREE, EXAMPLE_OFFER, OfferLetter, offerData, type OfferData } from '@/ui/Documents';
import { Arms, Seal } from '@/ui/Seal';

const LEAD = 'Written by the study plan from your real results at each milestone.';

function Head() {
  return (
    <>
      <Seal class="letters-seal" label="Seal of Euclid College" />
      <h1 id="letters-title">Letters</h1>
      <p class="lead">{LEAD}</p>
    </>
  );
}

/** The two documents; `offer` is the real offer letter's data, or null for the example. */
function DocumentsSection({ offer }: { offer: OfferData | null }) {
  return (
    <section class="sec docs" aria-labelledby="documents">
      <div class="sec-h"><h2 id="documents">Documents</h2></div>
      <h3 class="c-h3">The offer</h3>
      {offer === null && (
        <p class="doc-cap"><b>Example.</b> Your own offer letter is written here from your results when Act IV, the interview, is complete.</p>
      )}
      <div class={`doc${offer === null ? ' doc-example' : ''}`}>
        {offer === null && <span class="doc-tag" aria-hidden="true">Example</span>}
        <OfferLetter d={offer ?? EXAMPLE_OFFER} />
      </div>
      <h3 class="c-h3">The degree</h3>
      <p class="doc-cap">
        <b>Example.</b> Your certificate is written here from your Tripos results when Part II is complete. The campaign does not track the
        Tripos years yet, so this stays an example for now.
      </p>
      <div class="doc doc-example">
        <span class="doc-tag" aria-hidden="true">Example</span>
        <Certificate d={EXAMPLE_DEGREE} />
      </div>
    </section>
  );
}

export function LettersView({ p }: { p: Progress }) {
  const c = campaign.value;
  if (c === null) {
    return (
      <section class="camp" aria-labelledby="letters-title">
        <Head />
        <p class="c-body">No letters yet. Begin the campaign first: <AppLink to={{ view: 'campaign' }}>Campaign</AppLink>.</p>
        <DocumentsSection offer={null} />
      </section>
    );
  }
  return <WithAdmissions>{(adm) => <LettersBody adm={adm} c={c} p={p} />}</WithAdmissions>;
}

function LettersBody({ adm, c, p }: { adm: Admissions; c: Campaign; p: Progress }) {
  const [log] = useState(loadDays);
  const s = summarize(adm, c, p, log, now());
  useDeliverLetters(s);
  const offer = c.letters.find((l) => l.id === 'offer');
  return (
    <section class="camp" aria-labelledby="letters-title">
      <Head />
      {c.letters.length === 0 && <p class="c-body">None yet. The first arrives when your application is filed.</p>}
      {[...c.letters].reverse().map((l) => {
        const t = letterText(adm, c, l.id, s.projection.entry);
        return (
          <article key={l.id} class="letter" aria-labelledby={`letter-${l.id}`}>
            <div class="lh"><span><Arms class="stamp" />Simulated</span><span>{shortStamp(l.at)}</span></div>
            <h2 id={`letter-${l.id}`}>{t.title}</h2>
            {t.lines.map((x, i) => <p key={i}>{x}</p>)}
          </article>
        );
      })}
      {c.letters.length > 0 && <p class="note">Simulated by this study plan from your own numbers. Not a letter from the University or a college.</p>}
      <DocumentsSection offer={offer === undefined ? null : offerData(adm, c, offer.at, s.projection.entry)} />
    </section>
  );
}
