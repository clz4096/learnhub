# How to use the Cache Hierarchy Simulator

This guide gets you from a fresh checkout to learning in a few minutes. The app has the same content under its **Help** button, plus a short **Start here** tour that opens on your first visit.

## Start in two minutes

1. Install Node.js 20 or later, then run `npm install` and `npm run dev` in the project folder.
2. Open http://localhost:5180. The **Start here** tour points at each part of the screen. Press **Next**, or use the Right arrow key.
3. Press **Guided** at the top and do lesson 1. Each step has a button that sets up the simulator for you.

## What you are looking at

This tool lets you watch a CPU cache at work while a small C++ loop runs. One picture covers the core ideas:

| idea | picture |
|---|---|
| main memory (DRAM) | a warehouse across town: it holds everything, but every trip is slow |
| cache | a bookcase near your desk that keeps copies of the boxes you used lately |
| cache levels | L1 is the bookcase at your desk, L2 a bigger one in your room, L3 the shared bookcases down the hall |
| cache line | a box of neighboring bytes: you always carry the whole box, never one item |
| set | the one shelf a box is allowed to go on |
| way | one slot on that shelf; associativity is the number of slots per shelf |
| hit, miss | the box is already on your shelf, or you must fetch it from farther away |
| eviction | the shelf is full, so a box goes back to make room |

The screen has five parts:

- **Center:** one grid per cache. A row is a set, a column is a way, and each cell holds one cache line. A white cell is empty. When the program reads or writes, the cell it used flashes: a green ✓ is a hit, a red ✕ is a miss. The legend above the grids lists every color.
- **Bottom bar:** **Play** runs the loop one memory access at a time, and pressing it again pauses. **Step** runs exactly one access. **Speed** sets how fast Play goes. **Run to end** (End on a small phone) computes the rest at once. **Reset** starts over.
- **Left:** **Hardware** picks the CPU to model, and **Workload** picks the C++ loop and its settings. Start with **Textbook small cache**: its caches are tiny, so you can see every slot. Changing anything starts the run over.
- **Right:** the metrics. **Miss breakdown** shows why each miss happened. **Per level** and **Per core** count hits and misses. **Totals** shows AMAT, the average cost of one access in CPU clock cycles: lower is faster.
- **Top:** the four modes, and **Help**.

On a phone, the left and right parts are the **Config**, **Workload**, and **Metrics** tabs, and the C++ source and **Try it for real** are in the **Code** tab.

## How to learn with this

1. **Predict.** Before you press Play, guess: will this loop mostly hit or miss? Which level will answer?
2. **Run.** Step through the first few accesses, then Run to end.
3. **Explain.** Click anything that surprised you in Explain mode, and read why.
4. **Break it.** Change one setting, such as ways, array size, or stride, and predict again. Find the size where the numbers jump.
5. **Measure for real.** Run the matching benchmark on your machine and import `results.csv`. Does the trend hold?

## Ways to use the tool

Each section ends with what the matching **Try this** button in the app's Help page does.

### Free mode

Free is where the app starts. Pick a CPU under Hardware and a C++ loop under Workload, then press Play in the bottom bar. Change any setting, such as the array size or the number of ways, and the run starts over with it. Watch the grids and the numbers change.

*Try this:* loads the Textbook preset with the sequential array sum and plays it.

### Guided lessons

Press **Guided** at the top. Each of the 10 lessons has a goal, steps whose buttons set up the simulator for you, what to notice, and a check question. The lessons build on each other, so start with lesson 1 and go in order. Your progress is saved in your browser.

*Try this:* opens lesson 1.

### Explain: click anything

Press **Explain** at the top, then click something: a cache's name above its grid, a set number at the left of a row, a cell, the access in **Current access**, or a row in the metrics. The Explain panel says in plain words why it looks that way, for example why an access was a miss: the data was not in that cache.

*Try this:* loads a 256-element sum, runs one access, and explains it.

### Glossary

A word with a dotted underline is a link: click it to open its definition. Press **Glossary** at the top to search every term. Each entry has a one-line definition, an everyday picture, an example with numbers from this simulator, and a link that shows it in the simulator.

*Try this:* opens the glossary at "cache line".

### 2D grids and the 3D view

The center shows 2D grids: one grid per cache, a row per set, a column per way. On a computer, the switch above the grids also offers **3D die**: the same caches drawn as a chip you can turn and zoom. The 3D view needs WebGL 2, a graphics feature of current browsers; without it the app shows the 2D grids and says why. Phones always use the 2D grids.

*Try this:* switches to the 3D view and plays a loop.

### Reading the metrics

Run a loop to the end, then read the right panel from the top. **Over time** charts the hit rate of each level (the share of lookups that found the data). **Miss breakdown** splits misses by cause: compulsory (the first use of a line), capacity (the cache is too small for the data), conflict (too many lines want one set), and coherence (another core's write threw this copy away). **Totals** shows AMAT, the average cost of one access in cycles: compare it between runs, lower is faster. Each metrics heading has a **What is this?** note.

*Try this:* runs a 4,096-element sum to the end and shows Miss breakdown.

### Address breakdown

Under the grids, **Address breakdown** shows how each cache splits the current address, like a catalog number. The low bits are the offset (where in the box), the middle bits the set index (which shelf), and the rest the tag (the label on the box). Step through a loop and watch which part changes. The **Address breakdown** box in the bottom bar (under **Options** on a phone) shows or hides it.

*Try this:* steps through the first 17 reads of a 256-element sum.

### Custom traces

Workload 10, **Custom trace**, replays a list of memory accesses you type or paste. Write one access per line: a hex address, `R` (read), `W` (write), or `I` (instruction fetch), and a core number from 0. A `#` starts a comment. Bad lines are listed under the box and skipped.

This example, on the Textbook preset (L1d: 1 KiB, 2 ways, 8 sets of 64 B lines), shows a hit, a conflict in one set, and a write by another core. A test runs it through the simulator and checks each comment.

```text
# <hex address> <R|W|I> <core>. A # starts a comment.
# Core 0 reads one line twice: a miss, then a hit.
0x10000000 R 0
0x10000004 R 0
# Two more lines that land in the same L1d set (512 B apart).
# The set has 2 ways, so the third line evicts the first.
0x10000200 R 0
0x10000400 R 0
# The first line is gone from L1d: this read misses there.
0x10000000 R 0
# Core 1 writes the same line, so core 0's copy is invalidated.
0x10000000 W 1
```

*Try this:* loads this example as a custom trace.

### Try it for real

Workloads 1 to 8 each have a real C++ benchmark in `bench/`. The **Try it for real** panel (next to the C++ source on a computer, in the **Code** tab on a phone) shows its source and the build commands for your system. You need CMake 3.16 or later and a C++20 compiler. Compare the ratios between variants, not exact times: the simulator teaches trends, not run time.

**macOS.** Install the Command Line Tools (`xcode-select --install`). From the project folder, run every benchmark:

```sh
scripts/verify
```

**Linux.** Install a compiler and CMake (for example `build-essential` and `cmake`). From the project folder:

```sh
scripts/verify
```

**Windows.** Open a Developer PowerShell for VS 2022 in the project folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
```

**Linux in a virtual machine.** No Linux computer? `scripts/vm-linux` runs the Linux benchmarks in an Ubuntu virtual machine (a second computer that runs in software) on macOS or Linux. It needs [Multipass](https://multipass.run). The first run takes a few minutes to set up. The VM shares your computer's caches, so read its results as trends only.

```sh
scripts/vm-linux
```

**Import your results.** Each run writes `bench/results/<os>-<arch>-<date>/results.csv`. In **Try it for real**, under **Compare your results**, choose that file or drop it on the box. The table shows, per variant, whether your machine and the simulator agree on which one is slower. The file stays in your browser.

No CMake? See [Verify against real hardware](README.md#verify-against-real-hardware) for a project-local install. [bench/README.md](bench/README.md) has per-OS details, and [VERIFY.md](VERIFY.md) compares the simulator with measured results, workload by workload.

*Try this:* picks the matrix traversal workload and shows its benchmark.

### Keyboard shortcuts

Every control works from the keyboard. Press Tab to reach a grid, then use the arrow keys to read its cells; a screen reader announces each one.

| key | where | does |
|---|---|---|
| Space | anywhere except a button or text field | Play or pause |
| Right arrow | anywhere except a button or text field | Step one access |
| Tab | anywhere | Move to the next control; each grid and the 3D view can take focus |
| Arrow keys | a focused 2D grid | Move the cursor one set (up, down) or one way (left, right) |
| Home, End | a focused 2D grid | Jump to the first or last way in the row |
| Page Up, Page Down | a focused 2D grid | Move 8 rows |
| Enter or Space | a focused 2D grid | Select the slot (Explain mode explains it); on a grid that groups sets, zoom into the row |
| Esc | a focused, zoomed 2D grid | Show all sets again |
| Shift + arrow keys | the focused 3D view | Turn the chip |
| + or =, - or _ | the focused 3D view | Zoom in, zoom out |
| Esc, Home, or 0 | the focused 3D view | Return to the full chip |
| Right arrow, Left arrow | the Start here tour | Next step, previous step |
| Esc | the tour or the Help page | Close it |

*Try this:* moves focus to the first grid.

## Learning path

Do the Guided lessons in this order. Each takes a few minutes.

1. **Tag, set, and offset.** Split an address the way the cache does, and see which part picks where your data goes.
2. **Hits and spatial locality.** See why reading an array front to back hits 15 times out of 16, and what a prefetcher adds.
3. **Stride and the 64 B line.** Skipping elements inside a line saves almost nothing, because the cache moves whole lines.
4. **Row order vs column order.** Walk a row-major matrix down its columns and use one double from each line you fetch.
5. **Conflict misses and associativity.** Watch a power-of-two stride pile into a few sets while the rest of the cache sits empty.
6. **Capacity and the hierarchy.** Grow an array past each cache level and watch which level answers the reads.
7. **Pointer chasing: list vs vector.** Compare a vector with a linked list in address order, then with a shuffled one.
8. **Array of structs vs struct of arrays.** See how unused struct fields waste the cache lines your loop fetches.
9. **MESI and false sharing.** Follow one line through the MESI states as two cores write neighboring counters.
10. **SPSC ring: when padding is not enough.** See why padding a ring's head and tail apart does not speed up a plain single-producer, single-consumer queue.

### Suggested experiments

Use Free mode and the predict, run, explain loop above.

- **Find the cliff.** With Sequential array sum and Passes = 2, raise Elements (N) step by step. Note the size where the second pass stops hitting in L1d, then in L2. Compare it with each cache's size.
- **More ways, fewer conflicts?** Press Load and run in lesson 5's first step. Then, in Hardware, set L1d Ways to 4, then 8, then 16 (the size stays 1 KiB). Predict where the conflict misses disappear before each run.
- **Change the line size.** Switch Line size between 64 B and 128 B for the strided loop. Where does the miss rate reach 100% now?
- **Turn on the prefetcher.** Run each variant of Pointer chasing: list vs vector with Prefetch off, then on (bottom bar). Which variants does it help, and why not the others?
- **Pick a real CPU.** Run the same workload on Textbook and on Intel Coffee Lake. Which numbers change, and which trend stays?
- **Write your own trace.** Use Custom trace to build the smallest trace that causes a conflict miss, then one that causes false sharing between two cores.
- **Measure it.** Run `scripts/verify` (or `scripts/vm-linux`), import `results.csv` in Try it for real, and check whether your machine agrees with the simulator.
