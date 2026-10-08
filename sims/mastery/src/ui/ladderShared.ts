/**
 * The timed ladder as the rest of the app sees it: the suggestion on Today's Up next and
 * where the palette's ladder action goes. Both read the app's state (the registry, the
 * campaign, the stored attempts); the rules are in model/ladderNext.ts.
 */
import { acts } from '@/model/campaign';
import { nextTimed } from '@/model/campaignCalendar';
import { campaign } from '@/model/campaignStore';
import { courseInputs } from '@/model/campaignSummary';
import type { Exam } from '@/model/ladder';
import { ladderNext, nextDetail, suggestedExam } from '@/model/ladderNext';
import { ensureLadder, ladder } from '@/model/ladderStore';
import { unlockLine } from '@/model/readiness';
import { learnedReadiness } from '@/model/readinessBar';
import type { Route } from '@/model/route';
import { progress } from '@/model/store';
import { admissions } from '@/ui/campaignShared';

/** The exam of the campaign's next timed paper, if there is a campaign and one is due. */
function campaignExam(): Exam | null {
  const adm = admissions.value;
  const c = campaign.value;
  const p = progress.value;
  if (adm === null || c === null || p === null) return null;
  const id = nextTimed(adm, c, acts(adm, c, courseInputs(p)))?.paperIds[0];
  return id === undefined ? null : adm.registryPaper(id)?.exam ?? null;
}

export interface LadderSuggestion {
  title: string;
  detail: string;
  to: Route;
}

/** Up next on the ladder: the suggested exam's next rung, its running clock, or marks to enter; null while the registry loads or when nothing is left. */
export function ladderSuggestion(): LadderSuggestion | null {
  const adm = admissions.value;
  if (adm === null) return null;
  const exam = suggestedExam(adm, ladder.value, campaignExam());
  const p = progress.value;
  const n = ladderNext(adm, campaign.value, ladder.value, exam, p === null ? null : learnedReadiness(p, exam, adm, campaign.value, ladder.value));
  if (n === null) return null;
  return { title: n.state === 'locked' ? n.title : `${exam} ladder: ${n.title}`, detail: nextDetail(n), to: n.to };
}

/**
 * What unlocks the campaign's first timed question, while its exam's topics are not ready;
 * null without a campaign, or once ready (the planner then holds the rung itself).
 */
export function campaignUnlockLine(): string | null {
  const exam = campaignExam();
  const p = progress.value;
  if (exam === null || p === null) return null;
  const r = learnedReadiness(p, exam, admissions.value, campaign.value, ladder.value);
  return r.ready ? null : unlockLine(r);
}

/** Where the palette's "Climb the timed ladder" goes: the suggested exam's ladder. */
export function ladderRoute(): Route {
  const adm = admissions.value;
  if (adm === null) return { view: 'ladder', exam: 'STEP' };
  ensureLadder(adm);
  return { view: 'ladder', exam: suggestedExam(adm, ladder.value, campaignExam()) };
}
