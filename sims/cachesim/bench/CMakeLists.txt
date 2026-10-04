# Real-hardware cache benchmarks. Standalone project:
#   cmake -S bench -B bench/build -DCMAKE_BUILD_TYPE=Release
#   cmake --build bench/build --config Release
cmake_minimum_required(VERSION 3.16)
project(cachesim_bench LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Timings from a Debug build are meaningless, so default single-config
# generators to Release. Multi-config generators (Visual Studio, Xcode) pick
# the config at build time: pass --config Release.
get_property(_multi_config GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
if(NOT _multi_config AND NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# -O2 rather than CMake's default -O3: -O2 is what most production builds
# ship, and -O3's extra unrolling/vectorization would shift the
# compute-vs-memory balance some benchmarks are trying to expose.
# No -march=native: results should reflect a portable binary.
if(MSVC)
  set(CMAKE_CXX_FLAGS_RELEASE "/O2 /DNDEBUG")
else()
  set(CMAKE_CXX_FLAGS_RELEASE "-O2 -DNDEBUG")
endif()

find_package(Threads REQUIRED)

# Workaround for a broken macOS Command Line Tools install: a stale
# <CLT>/usr/include/c++/v1 directory that lacks the libc++ headers shadows the
# SDK's copy, so even `#include <new>` fails. Only when that probe fails and
# the SDK has the headers do we point the compiler at them; a healthy
# toolchain never takes this branch. The real fix is reinstalling the CLT.
if(APPLE AND CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  include(CheckCXXSourceCompiles)
  check_cxx_source_compiles("#include <new>\nint main() { return 0; }" BENCH_HAVE_LIBCXX_HEADERS)
  if(NOT BENCH_HAVE_LIBCXX_HEADERS)
    execute_process(COMMAND xcrun --show-sdk-path OUTPUT_VARIABLE _sdk
                    OUTPUT_STRIP_TRAILING_WHITESPACE ERROR_QUIET)
    if(_sdk AND EXISTS "${_sdk}/usr/include/c++/v1/new")
      message(WARNING "libc++ headers not found on the default path; using ${_sdk}/usr/include/c++/v1. "
                      "Reinstall the Command Line Tools to fix this properly.")
      add_compile_options(-nostdinc++ "SHELL:-isystem ${_sdk}/usr/include/c++/v1")
    endif()
  endif()
endif()

set(BENCHMARKS
  seq_sum
  strided
  matrix_traverse
  matmul
  list_vs_vector
  aos_soa
  false_sharing
  spsc_ring
)

foreach(name IN LISTS BENCHMARKS)
  add_executable(${name} ${name}.cpp harness.hpp)
  target_link_libraries(${name} PRIVATE Threads::Threads)
  if(MSVC)
    # C4324: "structure was padded due to alignment specifier". The padding is
    # the point of false_sharing and spsc_ring.
    target_compile_options(${name} PRIVATE /W4 /permissive- /EHsc /wd4324)
  else()
    target_compile_options(${name} PRIVATE -Wall -Wextra)
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
      # GCC warns that hardware_destructive_interference_size may differ
      # across -mtune targets. We print the value used, which is the point.
      target_compile_options(${name} PRIVATE -Wno-interference-size)
    endif()
  endif()
endforeach()
