/**
 * The two milestone documents of the campaign, with the layout and wording of the approved
 * art (book-mockup/documents.html): the conditional offer letter from Euclid College, and the degree certificate. Each is filled from the
 * campaign's real data once its milestone is reached; before then the Letters view shows
 * it as a locked preview with example data, labelled as an example.
 */
import type { Admissions, Campaign, Condition } from '@/model/campaign';
import { ROUTE_NAMES, collegeOf, offerConditions } from '@/model/campaign';
import { CrestStamp, Emblem } from '@/ui/Seal';

const COLLEGE = 'Euclid College';
const SIMULATED = 'Simulated document. Not issued by any real university or college.';

export interface OfferData {
  /** "27 April 2028" */
  date: string;
  applicant: string;
  course: string;
  college: string;
  entry: number;
  conditions: readonly string[];
}

export const EXAMPLE_OFFER: OfferData = {
  date: '27 April 2028',
  applicant: 'EC-28-04142',
  course: 'Computational Mathematics',
  college: 'St Edmund\'s',
  entry: 2028,
  conditions: [
    'A* in A level Mathematics',
    'A* in A level Further Mathematics',
    'A in A level Computer Science',
    'Grade 1 in Sixth Term Examination Paper (STEP) Mathematics 2',
    'Grade 1 in Sixth Term Examination Paper (STEP) Mathematics 3',
  ],
};

/** One condition of the offer as the letter words it: "A* in A level Mathematics". */
export function conditionLine(x: Condition): string {
  const step = /^STEP (\d)$/.exec(x.label);
  const grade = /grade (\S+)/.exec(x.need)?.[1] ?? '1';
  if (step !== null) return `Grade ${grade} in Sixth Term Examination Paper (STEP) Mathematics ${step[1]}`;
  return `${x.need.split(' ')[0] ?? ''} in ${x.label}`;
}

/** The offer letter's data from the campaign, as of the day the offer letter arrived. */
export function offerData(adm: Admissions, c: Campaign, at: number, entry: number | null): OfferData {
  const year = entry ?? Number(new Date(at).toLocaleDateString('en-US', { year: 'numeric', timeZone: 'America/New_York' }));
  return {
    date: new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' }),
    applicant: `EC-${String(year % 100).padStart(2, '0')}-${String(c.startedAt % 100000).padStart(5, '0')}`,
    course: ROUTE_NAMES[c.route],
    college: collegeOf(c.college)?.name ?? 'your college',
    entry: year,
    conditions: offerConditions(adm, c).map(conditionLine),
  };
}

export function OfferLetter({ d }: { d: OfferData }) {
  return (
    <article class="offer" aria-label="Offer letter">
      <div class="lhead">
        <Emblem class="lhseal" label="Seal of Euclid College" />
        <div class="org">{COLLEGE}<small>Office of Undergraduate Admissions</small></div>
        <div class="ref">Senate Court<br />Tripos Road<br />admissions@euclid-college.example</div>
      </div>

      <div class="meta2">
        <div class="addr">Mr Albert Burt<br />Brooklyn<br />New York<br />United States</div>
        <dl class="refs">
          <dt>Date</dt><dd>{d.date}</dd>
          <dt>Applicant number</dt><dd>{d.applicant}</dd>
          <dt>Course</dt><dd>{d.course} (Tripos)</dd>
          <dt>College</dt><dd>{d.college}</dd>
          <dt>Entry</dt><dd>October {d.entry}</dd>
        </dl>
      </div>

      <p>Dear Mr Burt,</p>
      <h3>Conditional offer of admission</h3>
      <p>
        I am very pleased to write on behalf of the Admissions Committee to offer you a place to read {d.course}, beginning in Michaelmas
        Term {d.entry}. The Committee was impressed by your application and by the way you reasoned through unfamiliar problems at interview.
      </p>
      <p>
        This offer is conditional. To confirm your place you must meet each of the following conditions, and your results must be received
        by the College no later than 31 August {d.entry}:
      </p>
      <ol class="numbered">
        {d.conditions.map((x) => <li key={x}>{x}</li>)}
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
        <div class="role">Admissions Tutor, {COLLEGE}</div>
      </div>
      <div class="foot"><span>{COLLEGE} · Office of Undergraduate Admissions</span><span>{SIMULATED}</span></div>
    </article>
  );
}

export interface DegreeData {
  name: string;
  degree: string;
  honours: string;
  /** "Twenty-eighth Day of June, Two Thousand and Thirty-One" */
  given: string;
}

export const EXAMPLE_DEGREE: DegreeData = {
  name: 'ALBERT BURT',
  degree: 'Bachelor of Computational Mathematics',
  honours: 'Tripos, with First Class Honours',
  given: 'Twenty-eighth Day of June, Two Thousand and Thirty-One',
};

export function Certificate({ d }: { d: DegreeData }) {
  return (
    <div class="certwrap">
      <article class="cert" aria-label="Certificate">
        <Emblem class="topseal" label="Seal of Euclid College" />
        <div class="inst">Euclid College</div>
        <div class="instrule" aria-hidden="true"><span />✦<span /></div>
        <div class="body">
          I hereby certify that
          <span class="nm">{d.name}</span>
          having completed the appointed course of study<br />
          and examination to the satisfaction of the Committee<br />
          has been admitted to the degree of
          <span class="deg">{d.degree}</span>
          <span class="cls">{d.honours}</span>
        </div>
        <div class="witness">Given under the seal of the College this<br />{d.given}</div>
        <div class="signs">
          <div><div class="sg a">Ada Lambda</div><div class="role">Director of Studies</div></div>
          <div><div class="sg b">Q. E. Demonstrandum</div><div class="role">Keeper of the Record</div></div>
        </div>
        <CrestStamp class="wax" />
        <div class="sim">Simulated · a study game · not a qualification</div>
      </article>
    </div>
  );
}
