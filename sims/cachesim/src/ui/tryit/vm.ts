/** Plain-language text for the "Linux VM" choice in the Try it for real panel. */

export const VM_COMMAND = 'scripts/vm-linux';

/** What the command does, one short step per item, for someone new to VMs. */
export const VM_STEPS: string[] = [
  'A virtual machine (VM) is a second computer that runs in software on this one. This option runs the benchmarks on Linux without a Linux machine.',
  'You need Multipass, a free tool that creates Ubuntu VMs. Get it from multipass.run.',
  'Run the command from the project folder on macOS or Linux.',
  'The first run creates a VM named cachesim-linux (2 CPUs, 3 GB of memory, 10 GB of disk) and installs a compiler and measuring tools. That takes a few minutes.',
  'Each run copies the benchmarks into the VM, builds and runs them, and copies the results back to bench/results/linux-.../ on this computer.',
  'The VM stops when the run ends. To remove it for good, run scripts/vm-linux delete.',
];

/** Why VM numbers are trends only. */
export const VM_CAVEAT =
  'The VM shares this computer’s caches with every other program, so compare the ratios between variants, not the exact times.';
