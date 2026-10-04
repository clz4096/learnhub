/**
 * "Try it for real": the matching benchmark in bench/, how to build and run it per OS
 * (or in a Linux VM), and an import that compares a run's results with the simulator.
 */
import { useEffect, useState } from 'preact/hooks';
import { BENCH_NAMES, buildCommands, loadBenchSource, type Os } from '@/ui/bench';
import { workloadId } from '@/ui/state';
import { ImportResults } from '@/ui/tryit/ImportResults';
import { VM_CAVEAT, VM_COMMAND, VM_STEPS } from '@/ui/tryit/vm';

/** Where to run: an OS on this machine, or the Linux VM that scripts/vm-linux manages. */
type Target = Os | 'vm';
const TARGET_LABEL: Record<Target, string> = { macos: 'macOS', linux: 'Linux', windows: 'Windows', vm: 'Linux VM' };

export function TryItPanel() {
  const id = workloadId.value;
  const name = BENCH_NAMES[id];
  const [os, setOs] = useState<Target>(guessOs());
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setCode(undefined);
    void loadBenchSource(id).then((c) => { if (live) setCode(c); });
    return () => { live = false; };
  }, [id]);

  if (!name) {
    return (
      <section class="panel" aria-labelledby="try-title">
        <h2 id="try-title">Try it for real</h2>
        <p class="small muted">This workload has no native benchmark (workloads 1 to 8 do).</p>
      </section>
    );
  }
  return (
    <section class="panel" aria-labelledby="try-title">
      <h2 id="try-title">Try it for real</h2>
      <p class="small">Build and run <span class="mono">bench/{name}.cpp</span> on your machine to see the same trend in real hardware.</p>
      <div class="segmented" role="radiogroup" aria-label="Where to run">
        {(Object.keys(TARGET_LABEL) as Target[]).map((o) => (
          <button key={o} type="button" role="radio" aria-checked={os === o} onClick={() => setOs(o)}>{TARGET_LABEL[o]}</button>
        ))}
      </div>
      {os === 'vm' ? (
        <>
          <pre class="cmd mono">{VM_COMMAND}</pre>
          <ol class="small tryit-steps">{VM_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
          <p class="small muted">{VM_CAVEAT}</p>
        </>
      ) : (
        <pre class="cmd mono">{buildCommands(os, name).join('\n')}</pre>
      )}
      <details>
        <summary>Benchmark source</summary>
        {code === undefined && <p class="small muted">Loading…</p>}
        {code === null && <p class="small muted">Source not available in this build.</p>}
        {code && <pre class="code-block mono">{code}</pre>}
      </details>
      <ImportResults workloadId={id} benchName={name} />
    </section>
  );
}

function guessOs(): Os {
  const p = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Windows/i.test(p)) return 'windows';
  if (/Mac/i.test(p)) return 'macos';
  return 'linux';
}
