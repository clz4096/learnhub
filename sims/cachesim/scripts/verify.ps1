<#
.SYNOPSIS
  Build the real-hardware cache benchmarks (Release), run every one, save the
  outputs, then collect hardware counters if a supported profiler exists.

.DESCRIPTION
  Windows PowerShell 5.1 and PowerShell 7 (pwsh) both work. On Windows, run it
  from a "Developer PowerShell for VS 2022" (or a plain prompt; CMake then
  finds Visual Studio by itself). Under pwsh on Linux or macOS it builds and
  runs the same way and hands counters to the POSIX scripts.

  Outputs go to bench\results\<os>-<arch>-<date>\:
    <bench>.txt   full stdout of each benchmark
    results.csv   every RESULT line, with a header
    system.txt    OS, CPU, and compiler details

.PARAMETER Benches
  Benchmarks to run. Default: all eight.

.PARAMETER Generator
  CMake generator for a fresh build directory, for example "Ninja",
  "Visual Studio 17 2022", or "MinGW Makefiles". Default: CMake's choice
  (the newest Visual Studio on Windows).

.PARAMETER BenchArgs
  Extra arguments passed to every benchmark, for example "--reps","3".

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
.EXAMPLE
  .\scripts\verify.ps1 -Benches seq_sum,strided -BenchArgs '--reps','3'
#>
[CmdletBinding()]
param(
    [string[]]$Benches = @('seq_sum', 'strided', 'matrix_traverse', 'matmul',
                           'list_vs_vector', 'aos_soa', 'false_sharing', 'spsc_ring'),
    [string]$Generator = '',
    [string[]]$BenchArgs = @()
)
$ErrorActionPreference = 'Stop'
# `powershell -File` passes "a,b" as one string; accept both forms.
$Benches = @($Benches | ForEach-Object { $_ -split ',' } | Where-Object { $_ })

$Root = Split-Path -Parent $PSScriptRoot
$BenchDir = Join-Path $Root 'bench'
$BuildDir = Join-Path $BenchDir 'build'

# $IsWindows only exists in PowerShell 6+; Windows PowerShell 5.1 is Desktop.
$OnWindows = ($PSVersionTable.PSEdition -eq 'Desktop') -or $IsWindows
if ($OnWindows) {
    $Os = 'windows'
    $Arch = $env:PROCESSOR_ARCHITECTURE.ToLower()
} elseif ($IsMacOS) {
    $Os = 'macos'
    $Arch = (& uname -m)
} else {
    $Os = 'linux'
    $Arch = (& uname -m)
}

# Prefer cmake on PATH; fall back to the project-local venv
# (python -m venv .venv; .venv\Scripts\pip install cmake ninja).
function Find-Tool([string]$name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($dir in @((Join-Path $Root '.venv\Scripts'), (Join-Path $Root '.venv/bin'))) {
        foreach ($ext in @('.exe', '')) {
            $p = Join-Path $dir ($name + $ext)
            if (Test-Path $p) { return $p }
        }
    }
    return $null
}
$Cmake = Find-Tool 'cmake'
if (-not $Cmake) {
    Write-Error "cmake not found on PATH or in $Root\.venv. Install: python -m venv .venv; .venv\Scripts\pip install cmake ninja"
}
$NinjaPath = Find-Tool 'ninja'
if ($NinjaPath) { $env:PATH = (Split-Path -Parent $NinjaPath) + [IO.Path]::PathSeparator + $env:PATH }

$configureArgs = @('-S', $BenchDir, '-B', $BuildDir, '-DCMAKE_BUILD_TYPE=Release')
# CMake refuses to change the generator of an existing build directory.
if ($Generator -and -not (Test-Path (Join-Path $BuildDir 'CMakeCache.txt'))) {
    $configureArgs += @('-G', $Generator)
}
Write-Host "== configure ($Os-$Arch)"
& $Cmake @configureArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host '== build'
& $Cmake --build $BuildDir --config Release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Results = Join-Path $BenchDir (Join-Path 'results' "$Os-$Arch-$Stamp")
New-Item -ItemType Directory -Force -Path $Results | Out-Null

$sys = @("date: $(Get-Date -Format o)", "os: $([Environment]::OSVersion.VersionString)")
if ($OnWindows) {
    Get-CimInstance Win32_Processor | ForEach-Object {
        $sys += "cpu: $($_.Name)"
        $sys += "L2CacheSize_KB: $($_.L2CacheSize)"
        $sys += "L3CacheSize_KB: $($_.L3CacheSize)"
    }
}
$sys += "cmake: $((& $Cmake --version | Select-Object -First 1))"
$cache = Join-Path $BuildDir 'CMakeCache.txt'
if (Test-Path $cache) {
    $sys += Select-String -Path $cache -Pattern '^CMAKE_CXX_COMPILER:|^CMAKE_GENERATOR:' |
        ForEach-Object { $_.Line }
}
$sys | Set-Content -Path (Join-Path $Results 'system.txt')

# Multi-config generators (Visual Studio) put binaries in Release\.
function Find-Bench([string]$name) {
    foreach ($c in @((Join-Path $BuildDir "Release\$name.exe"), (Join-Path $BuildDir "$name.exe"),
                     (Join-Path $BuildDir "Release/$name"), (Join-Path $BuildDir $name))) {
        if (Test-Path $c -PathType Leaf) { return $c }
    }
    return $null
}

$csv = Join-Path $Results 'results.csv'
'bench,variant,param,median_ns,ns_per_access' | Set-Content -Path $csv
foreach ($b in $Benches) {
    $bin = Find-Bench $b
    if (-not $bin) { Write-Error "binary for $b not found under $BuildDir" }
    Write-Host "== run $b"
    $out = Join-Path $Results "$b.txt"
    & $bin @BenchArgs | Tee-Object -FilePath $out
    if ($LASTEXITCODE -ne 0) { Write-Error "$b exited with status $LASTEXITCODE" }
    Select-String -Path $out -Pattern '^RESULT,' | ForEach-Object { $_.Line.Substring(7) } |
        Add-Content -Path $csv
}
Write-Host "== timings saved to $Results"

# Hardware counters: a missing tool is a skip, not a failure.
if ($OnWindows) {
    $tools = @('vtune', 'AMDuProfCLI', 'wpr') | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue }
    if ($tools) {
        & (Join-Path $PSScriptRoot 'verify-windows.ps1') -BuildDir $BuildDir -ResultsDir $Results -Benches $Benches
    } else {
        Write-Host 'skipped: vtune, AMDuProfCLI, and wpr not found (hardware counters not collected)'
    }
} elseif ($Os -eq 'linux') {
    if ((Get-Command perf -ErrorAction SilentlyContinue) -or (Get-Command valgrind -ErrorAction SilentlyContinue)) {
        & sh (Join-Path $PSScriptRoot 'verify-linux.sh') $BuildDir $Results @Benches
    } else {
        Write-Host 'skipped: perf and valgrind not found (hardware counters not collected)'
    }
} else {
    & xcrun --find xctrace *> $null
    if ($LASTEXITCODE -eq 0) {
        & sh (Join-Path $PSScriptRoot 'verify-macos.sh') $BuildDir $Results @Benches
    } else {
        Write-Host 'skipped: xctrace not found (needs full Xcode, not just Command Line Tools)'
    }
}
exit 0
