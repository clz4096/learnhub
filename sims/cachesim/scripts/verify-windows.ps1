<#
.SYNOPSIS
  Hardware cache counters for each benchmark on Windows.

.DESCRIPTION
  Normally called by scripts\verify.ps1. Uses the first available tool:

  1. Intel VTune Profiler (vtune): "memory-access" analysis per variant,
     then a CSV summary report. Intel CPUs get full cache/DRAM metrics; on
     AMD CPUs VTune falls back to limited, OS-level data.
  2. AMD uProf (AMDuProfCLI): a cache/data-access collection per variant,
     then a report. The predefined configuration names change between uProf
     releases; this script uses "data_access". List the ones your version
     accepts with:  AMDuProfCLI info --list collect-configs
     and override with -UProfConfig if needed.
  3. Windows Performance Recorder (wpr) with PMC sampling: built into
     Windows 10/11, but it needs an elevated prompt and a custom recording
     profile, so this script prints the steps instead of running them.

  If none of these exist it prints "skipped: ..." and exits 0.

  Each variant runs alone (--only <variant>, or one --strides value) because
  all of these tools count the whole process.

.PARAMETER BuildDir
  Directory containing the benchmark binaries (bench\build).
.PARAMETER ResultsDir
  Where to write profiler output. Default: a new bench\results\ folder.
.PARAMETER Benches
  Benchmarks to profile. Default: all eight.
.PARAMETER UProfConfig
  AMD uProf predefined collection config. Default: data_access.
#>
[CmdletBinding()]
param(
    [string]$BuildDir = '',
    [string]$ResultsDir = '',
    [string[]]$Benches = @('seq_sum', 'strided', 'matrix_traverse', 'matmul',
                           'list_vs_vector', 'aos_soa', 'false_sharing', 'spsc_ring'),
    [string]$UProfConfig = 'data_access'
)
$ErrorActionPreference = 'Continue'  # a failed profile run should not abort the rest
$Benches = @($Benches | ForEach-Object { $_ -split ',' } | Where-Object { $_ })

$Root = Split-Path -Parent $PSScriptRoot
if (-not $BuildDir) { $BuildDir = Join-Path $Root 'bench\build' }
if (-not $ResultsDir) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $ResultsDir = Join-Path $Root "bench\results\windows-$($env:PROCESSOR_ARCHITECTURE.ToLower())-$stamp-counters"
}
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

# Same unit table as verify-linux.sh / verify-macos.sh.
function Get-Units([string]$bench) {
    $only = { param($vs) $vs | ForEach-Object { [pscustomobject]@{ Label = $_; Args = @('--only', $_) } } }
    switch ($bench) {
        'seq_sum'         { & $only @('sum_L1', 'sum_L2', 'sum_L3', 'sum_DRAM') }
        'strided'         { 1, 2, 4, 8, 16, 32, 64 | ForEach-Object {
                                [pscustomobject]@{ Label = "stride$_"; Args = @('--strides', "$_", '--max-stride', '64') } } }
        'matrix_traverse' { & $only @('row_major', 'col_major') }
        'matmul'          { & $only @('naive_ijk', 'tiled_T16', 'tiled_T32', 'tiled_T64') }
        'list_vs_vector'  { & $only @('vector', 'list_ordered', 'list_shuffled') }
        'aos_soa'         { & $only @('aos', 'soa') }
        'false_sharing'   { & $only @('packed', 'padded') }
        'spsc_ring'       { & $only @('packed', 'padded', 'packed_nocache', 'padded_nocache') }
    }
}

function Find-Bench([string]$name) {
    foreach ($c in @((Join-Path $BuildDir "Release\$name.exe"), (Join-Path $BuildDir "$name.exe"))) {
        if (Test-Path $c -PathType Leaf) { return $c }
    }
    return $null
}

function Invoke-PerUnit([scriptblock]$action) {
    foreach ($b in $Benches) {
        $bin = Find-Bench $b
        if (-not $bin) { Write-Host "$b binary not found, skipping"; continue }
        foreach ($u in (Get-Units $b)) {
            Write-Host "-- $b/$($u.Label)"
            & $action $b $u $bin
        }
    }
}

$runArgs = @('--reps', '3')

if (Get-Command vtune -ErrorAction SilentlyContinue) {
    Write-Host '== Intel VTune: memory-access analysis'
    $out = Join-Path $ResultsDir 'vtune'
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    Invoke-PerUnit {
        param($b, $u, $bin)
        $r = Join-Path $out "$b-$($u.Label)"
        & vtune -collect memory-access -result-dir $r -- $bin @($u.Args) @runArgs *> "$r.log"
        if ($LASTEXITCODE -ne 0) { Write-Host "   vtune collect failed (see $r.log)"; return }
        & vtune -report summary -result-dir $r -format csv -report-output "$r-summary.csv" *>> "$r.log"
        if ($LASTEXITCODE -eq 0) { Write-Host "   summary: $r-summary.csv" }
    }
    Write-Host "== VTune results in $out (open with vtune-gui for the memory hierarchy view)"
    exit 0
}

if (Get-Command AMDuProfCLI -ErrorAction SilentlyContinue) {
    Write-Host "== AMD uProf: collect --config $UProfConfig"
    $out = Join-Path $ResultsDir 'uprof'
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    Invoke-PerUnit {
        param($b, $u, $bin)
        $r = Join-Path $out "$b-$($u.Label)"
        & AMDuProfCLI collect --config $UProfConfig -o $r $bin @($u.Args) @runArgs *> "$r.log"
        if ($LASTEXITCODE -ne 0) { Write-Host "   uProf collect failed (see $r.log)"; return }
        # collect writes a timestamped session folder under -o; report on it.
        $session = Get-ChildItem -Directory $r | Sort-Object LastWriteTime | Select-Object -Last 1
        if ($session) {
            & AMDuProfCLI report -i $session.FullName *>> "$r.log"
            Write-Host "   session: $($session.FullName)"
        }
    }
    Write-Host "== uProf results in $out"
    exit 0
}

if (Get-Command wpr -ErrorAction SilentlyContinue) {
    Write-Host @'
== Windows Performance Recorder (PMC) -- manual steps, not run automatically
WPR can sample hardware counters, but it needs an elevated prompt and a
recording profile that names the counters, so this script does not run it.
From an elevated Developer PowerShell:

  1. List the PMU sources this CPU and Windows build expose:
       wpr -pmcsources
     (on older systems: xperf -pmcsources, from the Windows Performance Toolkit)
     Look for cache-related sources (names differ by CPU vendor and model;
     for example an LLC-miss source). Use only names that this list prints.

  2. Either write a .wprp profile with a <HardwareCounter> section listing those
     sources and record with
       wpr -start cache.wprp -filemode
       bench\build\Release\matrix_traverse.exe --only col_major --reps 3
       wpr -stop col_major.etl
     or use tracelog (Windows Driver Kit) for PMC-on-context-switch counting,
     roughly:
       tracelog -start pmc -f pmc.etl -eflag CSWITCH -pmc <Source1>,<Source2>:CSWITCH
       <run the benchmark>
       tracelog -stop pmc
     (check `tracelog -?` for the exact -pmc syntax of your WDK version)

  3. Open the .etl in Windows Performance Analyzer (WPA) and add the
     PMC columns to the CPU Usage (Precise) or Generic Events table.

skipped: WPR PMC collection needs manual, elevated setup (steps above)
'@
    exit 0
}

Write-Host 'skipped: vtune, AMDuProfCLI, and wpr not found (hardware counters not collected)'
exit 0
