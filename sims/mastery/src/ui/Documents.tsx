/**
 * The two milestone documents of the campaign, with the layout and wording of the approved
 * art (book-mockup/documents.html): the conditional offer letter from Euclid College,
 * University of New Cambridge, and the Latin degree certificate. Each is filled from the
 * campaign's real data once its milestone is reached; before then the Letters view shows
 * it as a locked preview with example data, labelled as an example.
 */
import type { Admissions, Campaign, Condition } from '@/model/campaign';
import { ROUTE_NAMES, offerConditions } from '@/model/campaign';
import { Arms, Seal } from '@/ui/Seal';

const UNIVERSITY = 'University of New Cambridge';
const COLLEGE = 'Euclid College';
const ARMS = `Arms of the ${UNIVERSITY}`;
const SEAL = `Seal of ${COLLEGE}`;
const SIMULATED = 'Simulated document. Not issued by any real university or college.';

/** One condition of the offer as the letter words it: the grade in bold, then the rest. */
export interface OfferCondition {
  /** "A*", "Grade 1" */
  grade: string;
  /** "A level Mathematics", "Sixth Term Examination Paper (STEP) Mathematics 2" */
  subject: string;
}

export interface OfferData {
  /** "27 April 2028" */
  date: string;
  applicant: string;
  course: string;
  entry: number;
  conditions: readonly OfferCondition[];
}

export const EXAMPLE_OFFER: OfferData = {
  date: '27 April 2028',
  applicant: 'EC-28-04142',
  course: 'Computational Mathematics',
  entry: 2028,
  conditions: [
    { grade: 'A*', subject: 'A level Mathematics' },
    { grade: 'A*', subject: 'A level Further Mathematics' },
    { grade: 'A', subject: 'A level Computer Science' },
    { grade: 'Grade 1', subject: 'Sixth Term Examination Paper (STEP) Mathematics 2' },
    { grade: 'Grade 1', subject: 'Sixth Term Examination Paper (STEP) Mathematics 3' },
  ],
};

/** One condition of the offer as the letter words it: "A*" in "A level Mathematics". */
export function conditionLine(x: Condition): OfferCondition {
  const step = /^STEP (\d)$/.exec(x.label);
  const grade = /grade (\S+)/.exec(x.need)?.[1] ?? '1';
  if (step !== null) return { grade: `Grade ${grade}`, subject: `Sixth Term Examination Paper (STEP) Mathematics ${step[1]}` };
  return { grade: x.need.split(' ')[0] ?? '', subject: x.label };
}

/** The offer letter's data from the campaign, as of the day the offer letter arrived. */
export function offerData(adm: Admissions, c: Campaign, at: number, entry: number | null): OfferData {
  const year = entry ?? Number(new Date(at).toLocaleDateString('en-US', { year: 'numeric', timeZone: 'America/New_York' }));
  return {
    date: new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' }),
    applicant: `EC-${String(year % 100).padStart(2, '0')}-${String(c.startedAt % 100000).padStart(5, '0')}`,
    course: ROUTE_NAMES[c.route],
    entry: year,
    conditions: offerConditions(adm, c).map(conditionLine),
  };
}

export function OfferLetter({ d }: { d: OfferData }) {
  return (
    <article class="offer" aria-label="Offer letter">
      <div class="lhead">
        <Arms class="lharms" label={ARMS} scroll />
        <div class="org">{UNIVERSITY}<small>{COLLEGE} · Admissions</small></div>
        <div class="ref">Senate Court<br />Tripos Road<br />admissions@euclid.example</div>
      </div>

      <div class="meta2">
        <div class="addr">Mr Albert Burt<br />Brooklyn<br />New York<br />United States</div>
        <dl class="refs">
          <dt>Date</dt><dd>{d.date}</dd>
          <dt>Applicant number</dt><dd>{d.applicant}</dd>
          <dt>Course</dt><dd><b>{d.course} (Tripos)</b></dd>
          <dt>College</dt><dd>{COLLEGE}</dd>
          <dt>Entry</dt><dd><b>October {d.entry}</b></dd>
        </dl>
      </div>

      <p>Dear Mr Burt,</p>
      <h3>Conditional offer of admission: {d.course}</h3>
      <p>
        I am very pleased to write on behalf of the Admissions Committee to offer you a place to read <b>{d.course}</b>, beginning
        in <b>Michaelmas Term {d.entry}</b>. The Committee was impressed by your application and by the way you reasoned through
        unfamiliar problems at interview.
      </p>
      <p>
        This offer is conditional. To confirm your place you must meet each of the following conditions, and your results must be received
        by the College no later than <b>31 August {d.entry}</b>:
      </p>
      <ol class="numbered">
        {d.conditions.map((x) => <li key={`${x.grade} ${x.subject}`}><b>{x.grade}</b> in {x.subject}</li>)}
      </ol>
      <p>
        You should also note the general conditions that apply to every offer: that the information given in your application is complete
        and accurate, and that you take up the place in the year stated above.
      </p>
      <p>
        Please reply to this offer by <b>1 June {d.entry}</b>, indicating whether you accept it as your firm choice. If you have any questions
        about the conditions, the Admissions Office will be glad to help.
      </p>
      <p>May I congratulate you on reaching this stage. We look forward to welcoming you in October.</p>
      <div class="close">
        <p style="margin:0">Yours sincerely,</p>
        <div class="sign" aria-hidden="true">E. Noether-Gauss</div>
        <div class="who">Dr E. Noether-Gauss</div>
        <div class="role">Admissions Tutor, {COLLEGE}, {UNIVERSITY}</div>
        <Seal class="lseal" label={SEAL} />
      </div>
      <div class="foot"><span>{UNIVERSITY} · {COLLEGE} · Office of Undergraduate Admissions</span><span>{SIMULATED}</span></div>
    </article>
  );
}

export interface DegreeData {
  name: string;
  /** The day of the Congregation, in the body: "die XXVIII mensis Iunii MMXXXI" */
  conferred: string;
  /** The same day, in the witness line: "die vicesimo octavo mensis Iunii, anno MMXXXI" */
  witnessed: string;
}

export const EXAMPLE_DEGREE: DegreeData = {
  name: 'Albert Burt',
  conferred: 'die XXVIII mensis Iunii MMXXXI',
  witnessed: 'die vicesimo octavo mensis Iunii, anno MMXXXI',
};

export function Certificate({ d }: { d: DegreeData }) {
  return (
    <div class="certwrap">
      <article class="cert" aria-label="Certificate">
        <Arms class="arms" label={ARMS} scroll />
        <div class="inst">Universitas Novae Cantabrigiae</div>
        <div class="body">
          Hisce litteris testor
          <span class="nm">{d.name}</span>
          <span class="coll">Collegii Euclidis</span> alumnum<br />
          in plena Congregatione<br />
          in Aula Collegii habita<br />
          {d.conferred}<br />
          ad gradum
          <span class="degree">Baccalaurei in<br />Mathematica Computationali</span>
          admissum esse.
        </div>
        <div class="witness">In cuius rei testimonium manus nostras apposuimus<br />{d.witnessed}</div>
        <div class="signs">
          <div><div class="sg a">Ada Lambda</div><div class="role">Registrarius Collegii</div></div>
          <div><div class="sg b">Q. E. Demonstrandum</div><div class="role">Magister Collegii</div></div>
        </div>
        <Seal class="cseal" label={SEAL} />
        <div class="sim">Documentum simulatum · ludus studiorum · non gradus academicus</div>
      </article>
    </div>
  );
}
