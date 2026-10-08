/**
 * Albert's own standup, mounted by the cohort standup screen: 60 to 90 seconds said aloud
 * (yesterday, today, blocked on), transcribed live on the device where the browser can,
 * checked against the record since the last standup, and logged for the date.
 *
 * The audio is recorded with MediaRecorder (Safari, including a Home Screen app, and the
 * Mac browsers) and kept in this browser's IndexedDB for 14 days; it is never uploaded.
 * The transcript comes from the Web Speech API when there is one; otherwise, or when it
 * fails, the learner types or edits it. The log entry (transcript, flags, duration) syncs
 * with the rest of the learner's state.
 */
import type { JSX } from 'preact';
import { currentProblemKey } from '@learnhub/content';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { admissions } from '@/ui/campaignShared';
import { paperName } from '@/model/campaign';
import { campaign } from '@/model/campaignStore';
import { ALL_TOPICS } from '@/model/courses';
import { masteryOf, topicOfKey } from '@/model/learner';
import { learnerSynced } from '@/model/learnerChange';
import { LADDER_KEY } from '@/model/ladderStore';
import { loadPlaces } from '@/model/lessonState';
import { MAX_TRANSCRIPT, loadStandups, previousStandup, saveStandup, type StandupEntry } from '@/model/standupLog';
import { loadStandupAudio, saveStandupAudio } from '@/model/standupAudio';
import { checkStandup, factLines, gatherFacts, sinceOf, type StandupFacts } from '@/model/standupCheck';
import { now, progress } from '@/model/store';
import { parseAttempts } from '@/sync/learner/ladder';
import '@/styles/standup.css';

/** The recording stops itself here. */
export const MAX_SECONDS = 90;
/** Under this, the timer asks for a little more. */
export const MIN_SECONDS = 60;

const mmss = (n: number): string => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const timeOfDay = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).toLowerCase();

// ---------------------------------------------------------------- the browser's speech API (not in every DOM typing)

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [i: number]: { readonly transcript: string };
}
interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [i: number]: RecognitionResult };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function canRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

/** Safari records MP4 (AAC); Chrome and Firefox record WebM (Opus). */
function pickMime(): string | undefined {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return candidates.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

// ---------------------------------------------------------------- the record since the last standup

function storedLadder() {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LADDER_KEY);
    return raw === null ? [] : parseAttempts(JSON.parse(raw));
  } catch {
    return [];
  }
}

function factsFor(date: string): StandupFacts {
  const p = progress.value;
  const until = now();
  const prev = previousStandup(loadStandups(), date);
  const adm = admissions.value;
  return gatherFacts(
    { progress: p, ladder: storedLadder(), campaign: campaign.value, places: loadPlaces(), since: sinceOf(prev?.checkedAt ?? null, until), until },
    {
      topics: ALL_TOPICS,
      stageOf: (id) => (p === null ? 'unlearned' : masteryOf(p, id).stage),
      topicOfProblem: (key) => topicOfKey(currentProblemKey(key)),
      paperLabel: (id) => {
        const paper = adm?.registryPaper(id);
        return paper === undefined ? id : paperName(paper);
      },
    },
  );
}

// ---------------------------------------------------------------- the slot

type Phase = 'ready' | 'asking' | 'recording' | 'review';

interface Live {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  mime: string | undefined;
  recognition: Recognition | null;
  startedAt: number;
  timer: ReturnType<typeof setInterval>;
  active: boolean;
}

export function StandupSlot({ date, onDone }: { date: string /* YYYY-MM-DD */; onDone: () => void }): JSX.Element | null {
  const [entry, setEntry] = useState<StandupEntry | null>(() => loadStandups()[date] ?? null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [seconds, setSeconds] = useState(0);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [liveOk, setLiveOk] = useState(() => recognitionCtor() !== null);
  const [error, setError] = useState<string | null>(null);
  const live = useRef<Live | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const recordable = canRecord();

  // A standup submitted on another device arrives by sync.
  const synced = learnerSynced.value;
  useEffect(() => {
    setEntry(loadStandups()[date] ?? null);
  }, [date, synced]);

  useEffect(() => () => teardown(), []);

  function teardown(): void {
    const l = live.current;
    if (l === null) return;
    l.active = false;
    clearInterval(l.timer);
    try {
      if (l.recorder.state !== 'inactive') l.recorder.stop();
    } catch {
      // Already stopped.
    }
    try {
      l.recognition?.stop();
    } catch {
      // Already stopped.
    }
    for (const t of l.stream.getTracks()) t.stop();
    live.current = null;
  }

  function stop(): void {
    const l = live.current;
    if (l === null) return;
    const secs = Math.min(MAX_SECONDS, Math.round((Date.now() - l.startedAt) / 1000));
    teardown();
    setDuration(secs);
    setTranscript(`${finalRef.current} ${interimRef.current}`.trim().slice(0, MAX_TRANSCRIPT));
    setInterim('');
    setPhase('review');
  }


  function startRecognition(l: Live): void {
    const Ctor = recognitionCtor();
    if (Ctor === null) return;
    let r: Recognition;
    try {
      r = new Ctor();
    } catch {
      setLiveOk(false);
      return;
    }
    r.continuous = true;
    r.interimResults = true;
    r.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    r.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) finalRef.current = `${finalRef.current} ${text.trim()}`.trim();
        else pending += text;
      }
      interimRef.current = pending.trim();
      setFinalText(finalRef.current);
      setInterim(interimRef.current);
    };
    r.onerror = (e) => {
      // "no-speech" and "aborted" are pauses; anything else means no live transcript here.
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setLiveOk(false);
        l.recognition = null;
      }
    };
    r.onend = () => {
      // Recognition stops by itself after a silence; keep it going while recording.
      if (l.active && l.recognition === r) {
        try {
          r.start();
        } catch {
          setLiveOk(false);
        }
      }
    };
    l.recognition = r;
    try {
      r.start();
    } catch {
      l.recognition = null;
      setLiveOk(false);
    }
  }

  async function record(): Promise<void> {
    setError(null);
    setPhase('asking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError(denied
        ? 'The microphone is blocked for this site. To record, allow it in the browser\'s settings (on iPhone: Settings, then Safari, then Microphone). Or type your standup below.'
        : 'No microphone could be opened. Type your standup below.');
      setPhase('review');
      return;
    }
    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime === undefined ? new MediaRecorder(stream) : new MediaRecorder(stream, { mimeType: mime });
    } catch {
      for (const t of stream.getTracks()) t.stop();
      setError('This browser cannot record audio here. Type your standup below.');
      setPhase('review');
      return;
    }
    // Recording again starts the transcript afresh, as it replaces the audio.
    finalRef.current = '';
    setTranscript('');
    setDuration(0);
    interimRef.current = '';
    setFinalText(finalRef.current);
    setInterim('');
    const startedAt = Date.now();
    const l: Live = {
      stream, recorder, chunks: [], mime, recognition: null, startedAt, active: true,
      timer: setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(Math.min(s, MAX_SECONDS));
        if (s >= MAX_SECONDS) stop();
      }, 250),
    };
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) l.chunks.push(e.data);
    };
    recorder.onstop = () => {
      if (l.chunks.length === 0) return;
      const type = recorder.mimeType || mime || 'audio/mp4';
      void saveStandupAudio(date, { blob: new Blob(l.chunks, { type }), mime: type, savedAt: now() }, date);
    };
    live.current = l;
    setSeconds(0);
    setPhase('recording');
    // A timeslice, so a long recording arrives in pieces rather than one buffer at the end.
    recorder.start(1000);
    startRecognition(l);
  }

  const facts = useMemo(() => (phase === 'review' ? factsFor(date) : null), [phase, date]);
  const check = useMemo(() => (facts === null ? null : checkStandup(transcript, facts)), [facts, transcript]);

  function submit(): void {
    if (facts === null) return;
    const text = transcript.trim();
    if (text === '') return;
    const c = checkStandup(text, facts);
    const e: StandupEntry = { date, transcript: text, checkedAt: now(), flags: c.flags, duration };
    if (!saveStandup(e)) {
      setError('The standup could not be saved in this browser (storage is blocked or full).');
      return;
    }
    setEntry(e);
    onDone();
  }

  if (entry !== null) return <DoneView entry={entry} />;

  return (
    <section class="ds-standup" aria-labelledby="su-title">
      <span class="ds-eyebrow">Your standup</span>
      <h2 id="su-title" class="ds-su-h">Sixty to ninety seconds</h2>
      {phase === 'ready' && (
        <>
          <p class="ds-su-p">Say what was done yesterday, what is planned for today, and what is blocking progress. It is checked against the record since the last standup.</p>
          {recordable ? (
            <>
              <p class="ds-note">When you press Record, the browser asks to use the microphone. The recording stays on this device for 14 days and is never uploaded; only the words sync.</p>
              <div class="ds-su-row">
                <button type="button" class="ds-btn" onClick={() => void record()}>Record</button>
                <button type="button" class="ds-link" onClick={() => setPhase('review')}>Type it instead</button>
              </div>
            </>
          ) : (
            <>
              <p class="ds-note">This browser cannot record audio here. Type your standup instead.</p>
              <div class="ds-su-row"><button type="button" class="ds-btn" onClick={() => setPhase('review')}>Type it</button></div>
            </>
          )}
        </>
      )}
      {phase === 'asking' && <p class="ds-note" role="status">Waiting for the microphone. Allow it when the browser asks.</p>}
      {phase === 'recording' && (
        <>
          <div class="ds-su-timer" role="timer" aria-label={`Recording, ${mmss(seconds)} of ${mmss(MAX_SECONDS)}`}>
            <span class="ds-su-dot" aria-hidden="true" />
            <span class="ds-su-time">{mmss(seconds)}</span>
            <span class="ds-su-of">/ {mmss(MAX_SECONDS)}</span>
          </div>
          <div class="ds-track" aria-hidden="true"><i style={{ width: `${(100 * seconds) / MAX_SECONDS}%` }} /></div>
          <p class="ds-meta ds-su-hint">{seconds < MIN_SECONDS ? `Aim for at least ${mmss(MIN_SECONDS)}. Stops by itself at ${mmss(MAX_SECONDS)}.` : `Good. Wrap up by ${mmss(MAX_SECONDS)}.`}</p>
          {liveOk ? (
            <p class="ds-su-live" aria-live="polite">
              {finalText}{interim !== '' && <span class="ds-su-interim"> {interim}</span>}
              {finalText === '' && interim === '' && <span class="ds-su-interim">Listening.</span>}
            </p>
          ) : (
            <p class="ds-note">Live transcription is not available in this browser. Type what you said when you stop.</p>
          )}
          <div class="ds-su-row">
            <button type="button" class="ds-btn" onClick={stop}>{seconds < MIN_SECONDS ? 'Stop early' : 'Stop'}</button>
          </div>
        </>
      )}
      {phase === 'review' && (
        <>
          {error !== null && <p class="ds-su-error" role="alert">{error}</p>}
          {duration > 0 && <p class="ds-meta">Recorded {mmss(duration)}. The audio stays on this device.</p>}
          <label class="ds-su-label" for="su-text">{duration > 0 && liveOk ? 'Transcript (edit anything it misheard)' : 'What you said'}</label>
          <textarea
            id="su-text" class="ds-su-text" rows={6} maxLength={MAX_TRANSCRIPT} value={transcript}
            placeholder="Yesterday I finished sequences. Today I will start induction. Nothing is blocking me."
            onInput={(e) => setTranscript((e.target as HTMLTextAreaElement).value)}
          />
          {check !== null && <Flags flags={check.flags} />}
          {facts !== null && <Record lines={factLines(facts)} />}
          <div class="ds-su-row">
            <button type="button" class="ds-btn" disabled={transcript.trim() === ''} onClick={submit}>Submit standup</button>
            {recordable && <button type="button" class="ds-link" onClick={() => void record()}>Record again</button>}
          </div>
        </>
      )}
    </section>
  );
}

function Flags({ flags }: { flags: readonly string[] }) {
  if (flags.length === 0) return <p class="ds-su-ok">Matches your record. Nothing missing.</p>;
  return (
    <ul class="ds-su-flags" aria-label="Check against the record">
      {flags.map((f) => <li key={f}><span class="ds-dot" aria-hidden="true" />{f}</li>)}
    </ul>
  );
}

function Record({ lines }: { lines: readonly string[] }) {
  return (
    <details class="ds-su-record">
      <summary>Since your last standup ({lines.length === 0 ? 'nothing logged' : `${lines.length} logged`})</summary>
      {lines.length > 0 && <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>}
    </details>
  );
}

function DoneView({ entry }: { entry: StandupEntry }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    void loadStandupAudio(entry.date).then((a) => {
      if (!alive || a === null || typeof URL.createObjectURL !== 'function') return;
      made = URL.createObjectURL(a.blob);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made !== null) URL.revokeObjectURL(made);
    };
  }, [entry.date]);
  return (
    <section class="ds-standup" aria-labelledby="su-done">
      <span class="ds-eyebrow">Your standup</span>
      <h2 id="su-done" class="ds-su-h">Done for today</h2>
      <p class="ds-meta">Submitted at {timeOfDay(entry.checkedAt)}{entry.duration > 0 ? ` · ${mmss(entry.duration)} recorded` : ''}</p>
      <blockquote class="ds-su-quote">{entry.transcript}</blockquote>
      <Flags flags={entry.flags} />
      {url !== null && <audio class="ds-su-audio" controls src={url} />}
    </section>
  );
}
