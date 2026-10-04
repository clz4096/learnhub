/**
 * Help page content: one section per way to use the tool, each with a short "how to"
 * and an optional "try this" action that sets the app up through the controller
 * (actions.ts). Pure data, so tests can check every action's setup against the engine.
 *
 * Text follows the lessons' writing rules: short sentences, every term marked
 * [[id|text]] (a glossary link) at first use, analogies from the set at the top of
 * src/ui/modes/glossary.ts. GUIDE.md at the repo root carries the same content.
 */
import type { TermId } from '@/ui/Term';
import type { Action } from '@/ui/modes/lessons';
import type { Setup } from '@/ui/modes/setup';
import type { CenterViewKind, Mode, PhoneTab, Selection } from '@/ui/state';

export interface HelpAction {
  /** Button text. */
  label: string;
  /** Every action starts by loading this setup (preset, workload, params). */
  setup: Setup;
  /** Playback to run after the setup loads (step, play, run to end). */
  then?: Action[];
  /** Custom trace text, set before the setup loads (workload must be 'custom'). */
  trace?: string;
  mode?: Mode;
  view?: CenterViewKind;
  /** Phone layout: the tab to show afterwards. */
  phoneTab?: PhoneTab;
  /** Open this lesson in Guided mode. */
  lesson?: string;
  /** Open the glossary at this term. */
  term?: TermId;
  /** Explain mode: what to select once the run is ready. */
  select?: Selection;
  /** CSS selector of the panel to scroll into view and focus afterwards. */
  focus?: string;
}

export interface HelpBlock {
  /** Optional sub-heading, such as an OS name. */
  heading?: string;
  text: string;
  /** Commands, shown as a code block. */
  code?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  /** The "how to": 2 to 4 short sentences, with term marks. */
  howTo: string;
  /** Extra blocks under the how-to (per-OS commands, notes). */
  blocks?: HelpBlock[];
  /** A table of keys and what they do. */
  keys?: readonly KeyRow[];
  action?: HelpAction;
}

export interface KeyRow {
  keys: string;
  where: string;
  does: string;
}

const TEXTBOOK = 'textbook';

/**
 * A ready custom trace for the Textbook preset (L1d: 1 KiB, 2 ways, 8 sets of 64 B
 * lines, so lines 512 B apart share a set). content.test.ts runs it through the engine
 * and checks each comment's claim.
 */
export const EXAMPLE_TRACE = [
  '# <hex address> <R|W|I> <core>. A # starts a comment.',
  '# Core 0 reads one line twice: a miss, then a hit.',
  '0x10000000 R 0',
  '0x10000004 R 0',
  '# Two more lines that land in the same L1d set (512 B apart).',
  '# The set has 2 ways, so the third line evicts the first.',
  '0x10000200 R 0',
  '0x10000400 R 0',
  '# The first line is gone from L1d: this read misses there.',
  '0x10000000 R 0',
  '# Core 1 writes the same line, so core 0\'s copy is invalidated.',
  '0x10000000 W 1',
].join('\n');

export const SHORTCUTS: readonly KeyRow[] = [
  { keys: 'Space', where: 'anywhere except a button or text field', does: 'Play or pause' },
  { keys: 'Right arrow', where: 'anywhere except a button or text field', does: 'Step one access' },
  { keys: 'Tab', where: 'anywhere', does: 'Move to the next control; each grid and the 3D view can take focus' },
  { keys: 'Arrow keys', where: 'a focused 2D grid', does: 'Move the cursor one set (up, down) or one way (left, right)' },
  { keys: 'Home, End', where: 'a focused 2D grid', does: 'Jump to the first or last way in the row' },
  { keys: 'Page Up, Page Down', where: 'a focused 2D grid', does: 'Move 8 rows' },
  { keys: 'Enter or Space', where: 'a focused 2D grid', does: 'Select the slot (Explain mode explains it); on a grid that groups sets, zoom into the row' },
  { keys: 'Esc', where: 'a focused, zoomed 2D grid', does: 'Show all sets again' },
  { keys: 'Shift + arrow keys', where: 'the focused 3D view', does: 'Turn the chip' },
  { keys: '+ or =, - or _', where: 'the focused 3D view', does: 'Zoom in, zoom out' },
  { keys: 'Esc, Home, or 0', where: 'the focused 3D view', does: 'Return to the full chip' },
  { keys: 'Right arrow, Left arrow', where: 'the Start here tour', does: 'Next step, previous step' },
  { keys: 'Esc', where: 'the tour or this Help page', does: 'Close it' },
];

export const HELP_SECTIONS: readonly HelpSection[] = [
  {
    id: 'free',
    title: 'Free mode',
    howTo: 'Free is where the app starts. Pick a CPU under Hardware and a C++ loop under Workload, then press Play in the bottom bar. '
      + 'Change any setting, such as the array size or the number of [[way|ways]], and the run starts over with it. '
      + 'Watch the grids and the numbers change.',
    action: {
      label: 'Load a simple loop and play it',
      setup: { preset: TEXTBOOK, workload: 'seq-sum' },
      then: [{ kind: 'play' }],
      mode: 'free',
      phoneTab: 'view',
    },
  },
  {
    id: 'guided',
    title: 'Guided lessons',
    howTo: 'Press Guided at the top. Each of the 10 lessons has a goal, steps whose buttons set up the simulator for you, '
      + 'what to notice, and a check question. The lessons build on each other, so start with lesson 1 and go in order. '
      + 'Your progress is saved in this browser.',
    action: {
      label: 'Open lesson 1',
      setup: { preset: TEXTBOOK, workload: 'seq-sum' },
      mode: 'guided',
      lesson: 'address-breakdown',
    },
  },
  {
    id: 'explain',
    title: 'Explain: click anything',
    howTo: 'Press Explain at the top, then click something: a cache\'s name above its grid, a set number at the left of a row, a cell, '
      + 'the access in Current access, or a row in the metrics. The Explain panel says in plain words why it looks that way, '
      + 'for example why an access was a [[miss|miss]]: the data was not in that [[cache|cache]].',
    action: {
      label: 'Explain the first access',
      setup: { preset: TEXTBOOK, workload: 'seq-sum', params: { N: 256, passes: 1 } },
      then: [{ kind: 'step', n: 1 }],
      mode: 'explain',
      select: { type: 'access', accessIndex: 0 },
      phoneTab: 'view',
    },
  },
  {
    id: 'glossary',
    title: 'Glossary',
    howTo: 'A word with a dotted underline is a link: click it to open its definition. Press Glossary at the top to search every term. '
      + 'Each entry has a one-line definition, an everyday picture, an example with numbers from this simulator, '
      + 'and a link that shows it in the simulator.',
    action: {
      label: 'Look up "cache line"',
      setup: { preset: TEXTBOOK, workload: 'seq-sum' },
      term: 'cache-line',
    },
  },
  {
    id: 'views',
    title: '2D grids and the 3D view',
    howTo: 'The center shows 2D grids: one grid per cache, a row per [[set|set]], a column per [[way|way]]. '
      + 'On a computer, the switch above the grids also offers 3D die: the same caches drawn as a chip you can turn and zoom. '
      + 'The 3D view needs WebGL 2, a graphics feature of current browsers; without it the app shows the 2D grids and says why. '
      + 'Phones always use the 2D grids.',
    action: {
      label: 'Show the 3D view',
      setup: { preset: TEXTBOOK, workload: 'seq-sum' },
      then: [{ kind: 'play' }],
      view: '3d',
      phoneTab: 'view',
    },
  },
  {
    id: 'metrics',
    title: 'Reading the metrics',
    howTo: 'Run a loop to the end, then read the right panel from the top. Over time charts the [[hit-rate|hit rate]] of each level '
      + '(the share of lookups that found the data). Miss breakdown splits misses by cause, such as [[compulsory-miss|compulsory]] '
      + '(first use of a line) or [[conflict-miss|conflict]] (too many lines want one set). '
      + 'Totals shows [[amat|AMAT]], the average cost of one access in cycles: compare it between runs, lower is faster.',
    action: {
      label: 'Run a loop to the end',
      setup: { preset: TEXTBOOK, workload: 'seq-sum', params: { N: 4096, passes: 1 } },
      then: [{ kind: 'runToEnd' }],
      phoneTab: 'metrics',
      focus: 'section[aria-labelledby="miss-title"]',
    },
  },
  {
    id: 'breakdown',
    title: 'Address breakdown',
    howTo: 'Under the grids, Address breakdown shows how each cache splits the current [[address|address]], like a catalog number. '
      + 'The low bits are the [[offset|offset]] (where in the box), the middle bits the [[set-index|set index]] (which shelf), '
      + 'and the rest the [[tag|tag]] (the label on the box). Step through a loop and watch which part changes. '
      + 'The Address breakdown box in the bottom bar (under Options on a phone) shows or hides it.',
    action: {
      label: 'Step through 17 reads',
      setup: { preset: TEXTBOOK, workload: 'seq-sum', params: { N: 256, passes: 1 }, breakdown: true },
      then: [{ kind: 'step', n: 17 }],
      phoneTab: 'view',
      focus: 'section[aria-labelledby="bd-title"]',
    },
  },
  {
    id: 'custom',
    title: 'Custom traces',
    howTo: 'Workload 10, Custom trace, replays a list of memory accesses you type or paste. '
      + 'Write one access per line: a hex address, R (read), W (write), or I (instruction fetch), and a core number from 0. '
      + 'A # starts a comment. Bad lines are listed under the box and skipped.',
    blocks: [{ heading: 'Example', text: 'A hit, a conflict in one set, and a write by another core.', code: EXAMPLE_TRACE }],
    action: {
      label: 'Load this example',
      setup: { preset: TEXTBOOK, workload: 'custom', arrows: true, breakdown: true },
      trace: EXAMPLE_TRACE,
      mode: 'free',
      phoneTab: 'workload',
      focus: '#trace-text',
    },
  },
  {
    id: 'tryit',
    title: 'Try it for real',
    howTo: 'Workloads 1 to 8 each have a real C++ benchmark in the bench folder. The Try it for real panel (next to the C++ source on a computer, '
      + 'in the Code tab on a phone) shows its source and the commands for your system. You need CMake 3.16 or later and a C++20 compiler. '
      + 'Compare the ratios between variants, not exact times: the simulator teaches trends, not run time.',
    blocks: [
      {
        heading: 'macOS',
        text: 'Install the Command Line Tools (xcode-select --install). From the project folder, run every benchmark:',
        code: 'scripts/verify',
      },
      {
        heading: 'Linux',
        text: 'Install a compiler and CMake (for example build-essential and cmake). From the project folder:',
        code: 'scripts/verify',
      },
      {
        heading: 'Windows',
        text: 'Open a Developer PowerShell for VS 2022 in the project folder and run:',
        code: 'powershell -ExecutionPolicy Bypass -File scripts\\verify.ps1',
      },
      {
        heading: 'Linux in a virtual machine',
        text: 'No Linux computer? scripts/vm-linux runs the Linux benchmarks in an Ubuntu virtual machine (a second computer that runs in software) '
          + 'on macOS or Linux. It needs Multipass (multipass.run). The first run takes a few minutes to set up. '
          + 'The VM shares this computer\'s caches, so read its results as trends only.',
        code: 'scripts/vm-linux',
      },
      {
        heading: 'Import your results',
        text: 'Each run writes bench/results/<os>-<arch>-<date>/results.csv. In Try it for real, under Compare your results, '
          + 'choose that file or drop it on the box. The table shows, per variant, whether your machine and the simulator agree on '
          + 'which one is slower. The file stays in this browser.',
      },
    ],
    action: {
      label: 'Show the matrix benchmark',
      setup: { preset: TEXTBOOK, workload: 'matrix-traverse' },
      phoneTab: 'code',
      focus: 'section[aria-labelledby="try-title"]',
    },
  },
  {
    id: 'keys',
    title: 'Keyboard shortcuts',
    howTo: 'Every control works from the keyboard. Press Tab to reach a grid, then use the arrow keys to read its cells; '
      + 'a screen reader announces each one.',
    keys: SHORTCUTS,
    action: {
      label: 'Focus the first grid',
      setup: { preset: TEXTBOOK, workload: 'seq-sum' },
      view: '2d',
      phoneTab: 'view',
      focus: '.grid2d-canvas',
    },
  },
];

/** "How to learn with this": the loop the lessons follow, for free exploring too. */
export const LEARN_STEPS: readonly { name: string; text: string }[] = [
  { name: 'Predict', text: 'Before you press Play, guess: will this loop mostly hit or miss? Which level will answer?' },
  { name: 'Run', text: 'Step through the first few accesses, then Run to end.' },
  { name: 'Explain', text: 'Click anything that surprised you in Explain mode, and read why.' },
  { name: 'Break it', text: 'Change one setting, such as ways, array size, or stride, and predict again. Find the size where the numbers jump.' },
  { name: 'Measure for real', text: 'Run the matching benchmark on your machine and import results.csv. Does the trend hold?' },
];
