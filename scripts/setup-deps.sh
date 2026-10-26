#!/usr/bin/env bash
#
# scripts/setup-deps.sh - prepare (or verify) everything Vaultara needs to build and test.
#
# Idempotent: each dependency is probed first and only installed when it is missing or wrong.
# Re-running on a healthy checkout changes nothing and prints a status table.
#
# What it covers, in order:
#   1. Node.js       - must satisfy `engines.node` in package.json (the single source of truth).
#   2. npm           - must be new enough to understand the committed lockfile (version 3).
#   3. npm packages  - every manifests' installed version must equal the version resolved in
#                      package-lock.json; otherwise `npm ci` (never `npm install`, so the
#                      lockfile stays authoritative).
#   4. Headless Chromium for `npm run test:e2e`, resolved in this order:
#                      $PLAYWRIGHT_CHROMIUM -> an existing Playwright-managed Chromium ->
#                      `npx playwright install chromium` when its CDN is reachable -> the
#                      optional @sparticuz/chromium payload, which is fetched *without* being
#                      saved to the manifest because it exists only to work around sandboxes
#                      where the Playwright CDN is unreachable. The binary is verified by
#                      asking it for its version.
#                      Extracted binaries live in node_modules/.vaultara/chromium, which is
#                      git-ignored; playwright.config.ts reads that location automatically.
#
# Nothing here is required for `npm run typecheck`, `npm run lint`, or `npm test`: only step 4
# is needed for the end-to-end suite, so a failure there is a warning, not an error, unless
# --browser is passed.
#
# Usage:
#   scripts/setup-deps.sh              # install what is missing, verify the rest
#   scripts/setup-deps.sh --check      # verify only; exit 1 if anything would need installing
#   scripts/setup-deps.sh --no-browser # skip step 4 (unit tests and typecheck only)
#   scripts/setup-deps.sh --browser    # treat a missing Chromium as a failure
#   scripts/setup-deps.sh --verbose    # echo the commands being run
#
# Exit codes: 0 all good, 1 a required dependency is missing or could not be fixed (or --check
# found drift), 2 bad usage.
#
# Environment:
#   PLAYWRIGHT_CHROMIUM=/path  Use this Chromium instead of provisioning one. Must be launchable;
#                              the script verifies it and playwright.config.ts honours it.
#   VAULTARA_CHROMIUM_DIR=/path  Where extracted fallback binaries are kept (default:
#                              node_modules/.vaultara/chromium).

set -euo pipefail

# ------------------------------------------------------------------------------- setup

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE="install"                       # install | check
BROWSER="auto"                       # auto | required | skip
VERBOSE=0
CHROMIUM_DIR="${VAULTARA_CHROMIUM_DIR:-$REPO_ROOT/node_modules/.vaultara/chromium}"
CHROMIUM_BIN="$CHROMIUM_DIR/chromium"
CHROMIUM_LIBS="$CHROMIUM_DIR/lib"

for arg in "$@"; do
  case "$arg" in
    --check) MODE="check" ;;
    --no-browser) BROWSER="skip" ;;
    --browser) BROWSER="required" ;;
    --verbose | -v) VERBOSE=1 ;;
    -h | --help)
      sed -n '2,42p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown option: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

if [[ -t 1 ]]; then
  C_OK=$'\033[32m' C_WARN=$'\033[33m' C_ERR=$'\033[31m' C_DIM=$'\033[2m' C_BOLD=$'\033[1m' C_OFF=$'\033[0m'
else
  C_OK="" C_WARN="" C_ERR="" C_DIM="" C_BOLD="" C_OFF=""
fi

FAILURES=0
WARNINGS=0
CHANGES=0
SUMMARY=()

ok() { SUMMARY+=("${C_OK}  ok   ${C_OFF} $1"); }
fixed() {
  SUMMARY+=("${C_OK} fixed ${C_OFF} $1")
  CHANGES=$((CHANGES + 1))
}
warn() {
  SUMMARY+=("${C_WARN} warn  ${C_OFF} $1")
  WARNINGS=$((WARNINGS + 1))
}
fail() {
  SUMMARY+=("${C_ERR} FAIL  ${C_OFF} $1")
  FAILURES=$((FAILURES + 1))
}
step() { printf '%s==>%s %s\n' "$C_BOLD" "$C_OFF" "$1"; }
detail() { printf '    %s%s%s\n' "$C_DIM" "$1" "$C_OFF"; }
run() {
  if [[ $VERBOSE -eq 1 ]]; then printf '    $ %s\n' "$*"; fi
  "$@"
}
have() { command -v "$1" >/dev/null 2>&1; }

# In --check mode nothing may be installed.
can_install() { [[ $MODE == "install" ]]; }

# Returns 0 when version $1 is greater than or equal to version $2.
version_ge() {
  [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" == "$2" ]]
}

# Read a dotted JSON path out of a file. node is preferred; python3 is the fallback.
json_get() {
  local file="$1" path="$2"
  if have node; then
    node -e '
      const o = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const v = process.argv[2].split(".").reduce((a, k) => a?.[k], o);
      if (v === undefined) process.exit(1);
      console.log(typeof v === "string" ? v : JSON.stringify(v));
    ' "$file" "$path"
  elif have python3; then
    python3 -c '
import json, sys
value = json.load(open(sys.argv[1]))
for key in sys.argv[2].split("."):
    value = value[key]
print(value if isinstance(value, str) else json.dumps(value))
' "$file" "$path"
  else
    return 1
  fi
}

# --------------------------------------------------------------------------- 1. Node.js

REQUIRED_NODE_RANGE="$(json_get package.json engines.node 2>/dev/null || echo '>=22.12.0')"
REQUIRED_NODE_MIN="${REQUIRED_NODE_RANGE//[^0-9.]/}"

step "Node.js (package.json requires $REQUIRED_NODE_RANGE)"
NODE_OK=0
if have node; then
  NODE_VER="$(node --version | sed 's/^v//')"
  if version_ge "$NODE_VER" "$REQUIRED_NODE_MIN"; then
    ok "node v$NODE_VER satisfies $REQUIRED_NODE_RANGE"
    NODE_OK=1
  else
    fail "node v$NODE_VER is too old (need $REQUIRED_NODE_RANGE) - install from https://nodejs.org/"
  fi
else
  fail "node is not installed (need $REQUIRED_NODE_RANGE) - install from https://nodejs.org/"
fi

# ------------------------------------------------------------------------------- 2. npm

LOCKFILE_VERSION="$(json_get package-lock.json lockfileVersion 2>/dev/null || echo 3)"
step "npm (lockfileVersion $LOCKFILE_VERSION requires npm >= 7)"
if [[ $NODE_OK -eq 1 ]] && have npm; then
  NPM_VER="$(npm --version)"
  if version_ge "$NPM_VER" "7.0.0"; then
    ok "npm v$NPM_VER"
  else
    fail "npm v$NPM_VER cannot read lockfileVersion $LOCKFILE_VERSION - upgrade with: npm install -g npm@latest"
  fi
elif [[ $NODE_OK -eq 1 ]]; then
  fail "npm not found even though node is present - reinstall Node (npm ships with it)"
else
  detail "skipped (no usable node)"
fi

# ---------------------------------------------------------------------- 3. npm packages

# Compare each manifest dependency against the version resolved in package-lock.json. Reading
# node_modules directly keeps this fast and makes the "installed vs locked" comparison explicit.
step "npm packages (package-lock.json is authoritative)"
PKG_DRIFT=()
if [[ $NODE_OK -eq 1 && -f package-lock.json ]]; then
  while IFS=$'\t' read -r name locked installed; do
    if [[ "$installed" == "-" ]]; then
      PKG_DRIFT+=("$name: missing (lock resolves $locked)")
    elif [[ "$installed" != "$locked" ]]; then
      PKG_DRIFT+=("$name: $installed installed, lock resolves $locked")
    fi
  done < <(node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      const locked = lock.packages?.["node_modules/" + name]?.version ?? "?";
      let installed = "-";
      try {
        installed = JSON.parse(fs.readFileSync("node_modules/" + name + "/package.json", "utf8")).version;
      } catch {}
      process.stdout.write(`${name}\t${locked}\t${installed}\n`);
    }
  ')

  if [[ ${#PKG_DRIFT[@]} -eq 0 ]]; then
    ok "all locked packages present at the locked versions"
  else
    for entry in "${PKG_DRIFT[@]}"; do detail "$entry"; done
    if can_install; then
      detail "running npm ci"
      if run npm ci --no-audit --no-fund --loglevel=error; then
        fixed "npm ci restored node_modules to the lockfile (${#PKG_DRIFT[@]} package(s) were off)"
      else
        fail "npm ci failed - see the output above"
      fi
    else
      fail "${#PKG_DRIFT[@]} package(s) differ from package-lock.json (re-run without --check to fix)"
    fi
  fi
else
  detail "skipped (no usable node or no package-lock.json)"
fi

# -------------------------------------------------------- 4. Headless Chromium (E2E)

# Prints the reported version of a launchable Chromium, or nothing. The fallback payload links
# against NSS/NSPR, which only exist system-wide on some distributions, so the extracted lib
# directory is added to the loader path for the probe exactly as playwright.config.ts does at
# launch time.
chromium_version_of() {
  local bin="$1"
  LD_LIBRARY_PATH="$CHROMIUM_LIBS:${LD_LIBRARY_PATH:-}" \
    "$bin" --headless=new --no-sandbox --disable-gpu --version 2>/dev/null |
    awk '{print $2}' || true
}

playwright_managed_path() {
  node -e '
    import("playwright-core")
      .then((m) => {
        try {
          process.stdout.write(m.chromium.executablePath() ?? "");
        } catch {}
      })
      .catch(() => {});
  ' 2>/dev/null || true
}

# Inflate the @sparticuz/chromium payload into CHROMIUM_DIR along with the shared libraries it
# links against. Only the pieces the end-to-end suite needs are extracted: the Chromium binary,
# its NSS/NSPR dependencies, and the bundled fonts (without fonts, screenshots render text as
# boxes).
provision_fallback() {
  node -e '
    const fs = require("fs");
    const { brotliDecompressSync } = require("zlib");
    const bin = "node_modules/@sparticuz/chromium/bin/";
    const out = process.argv[1];
    const libs = process.argv[2];

    fs.mkdirSync(out, { recursive: true });
    fs.mkdirSync(libs, { recursive: true });

    const chromium = brotliDecompressSync(fs.readFileSync(bin + "chromium.br"));
    fs.writeFileSync(out + "/chromium", chromium, { mode: 0o755 });

    // al2023.tar.br carries libnspr4/libnss3 etc. as a plain tar of .so files.
    const tar = brotliDecompressSync(fs.readFileSync(bin + "al2023.tar.br"));
    fs.writeFileSync(out + "/.al2023.tar", tar);
    require("child_process").execFileSync("tar", ["-xf", out + "/.al2023.tar", "-C", out]);
    fs.rmSync(out + "/.al2023.tar");
    for (const entry of fs.readdirSync(out + "/lib")) {
      fs.copyFileSync(out + "/lib/" + entry, libs + "/" + entry);
    }

    const fonts = brotliDecompressSync(fs.readFileSync(bin + "fonts.tar.br"));
    fs.writeFileSync(out + "/.fonts.tar", fonts);
    require("child_process").execFileSync("tar", ["-xf", out + "/.fonts.tar", "-C", out]);
    fs.rmSync(out + "/.fonts.tar");
  ' "$CHROMIUM_DIR" "$CHROMIUM_LIBS"
}

step "headless Chromium (needed only for npm run test:e2e)"
if [[ $BROWSER == "skip" ]]; then
  detail "skipped (--no-browser)"
elif [[ $NODE_OK -ne 1 ]]; then
  detail "skipped (no usable node)"
else
  BROWSER_READY=0

  # 4a. Explicit override wins and is verified.
  if [[ -n "${PLAYWRIGHT_CHROMIUM:-}" ]]; then
    if [[ -x "$PLAYWRIGHT_CHROMIUM" ]]; then
      version="$(chromium_version_of "$PLAYWRIGHT_CHROMIUM")"
      if [[ -n "$version" ]]; then
        ok "PLAYWRIGHT_CHROMIUM launches (Chromium $version)"
        BROWSER_READY=1
      else
        fail "PLAYWRIGHT_CHROMIUM=$PLAYWRIGHT_CHROMIUM is not a launchable Chromium"
      fi
    else
      fail "PLAYWRIGHT_CHROMIUM=$PLAYWRIGHT_CHROMIUM is not an executable file"
    fi
  fi

  # 4b. An already-extracted fallback that still launches.
  if [[ $BROWSER_READY -eq 0 && -x "$CHROMIUM_BIN" ]]; then
    version="$(chromium_version_of "$CHROMIUM_BIN")"
    if [[ -n "$version" ]]; then
      ok "extracted fallback Chromium $version at $CHROMIUM_BIN"
      BROWSER_READY=1
    elif can_install; then
      detail "extracted binary does not launch here - re-extracting"
      rm -rf "$CHROMIUM_DIR"
    fi
  fi

  # 4c. Playwright's own managed browser, if it is already installed.
  if [[ $BROWSER_READY -eq 0 ]]; then
    managed="$(playwright_managed_path)"
    if [[ -n "$managed" && -x "$managed" ]]; then
      ok "Playwright-managed Chromium at $managed"
      BROWSER_READY=1
    fi
  fi

  # 4d. Ask Playwright to install one; this is the normal path on a developer machine and the
  #     one this sandbox cannot use, because cdn.playwright.dev is unreachable.
  if [[ $BROWSER_READY -eq 0 ]] && can_install; then
    detail "trying Playwright's managed Chromium download"
    if run npx --no-install playwright install chromium >/dev/null 2>&1; then
      managed="$(playwright_managed_path)"
      if [[ -n "$managed" && -x "$managed" ]]; then
        fixed "Playwright-managed Chromium installed"
        BROWSER_READY=1
      fi
    else
      detail "Playwright CDN unreachable or install failed"
    fi
  fi

  # 4e. Sandbox fallback: extract the bundled payload without touching the manifest. It is not a
  #     project dependency: nothing else imports it, and it is only needed where the Playwright
  #     CDN cannot be reached.
  if [[ $BROWSER_READY -eq 0 ]] && can_install; then
    if [[ ! -d node_modules/@sparticuz/chromium ]]; then
      detail "fetching the optional @sparticuz/chromium payload (not saved to package.json)"
      run npm install --no-save --no-package-lock --no-audit --no-fund @sparticuz/chromium@153 >/dev/null 2>&1 ||
        detail "could not fetch @sparticuz/chromium"
    fi

    if [[ -d node_modules/@sparticuz/chromium ]]; then
      detail "extracting Chromium and its libraries into $CHROMIUM_DIR"
      if provision_fallback && version="$(chromium_version_of "$CHROMIUM_BIN")" && [[ -n "$version" ]]; then
        fixed "fallback Chromium $version extracted to $CHROMIUM_DIR"
        BROWSER_READY=1
      else
        detail "the fallback binary could not be launched here (missing system libraries?)"
      fi
    fi
  fi

  if [[ $BROWSER_READY -eq 0 ]]; then
    if [[ $BROWSER == "required" ]]; then
      fail "no headless Chromium available - npm run test:e2e cannot run"
    else
      warn "no headless Chromium - typecheck, lint, and unit tests still work; test:e2e will not"
    fi
  fi
fi

# ------------------------------------------------------------------------------ report

echo
printf '%sVaultara dependency status%s (%s mode)\n' "$C_BOLD" "$C_OFF" "$MODE"
for line in "${SUMMARY[@]}"; do printf '%s\n' "$line"; done
echo

if [[ $FAILURES -gt 0 ]]; then
  printf '%s%d problem(s).%s\n' "$C_ERR" "$FAILURES" "$C_OFF"
  exit 1
fi

if [[ $MODE == "check" ]]; then
  printf '%sEverything required is installed.%s\n' "$C_OK" "$C_OFF"
else
  if [[ $CHANGES -gt 0 ]]; then
    printf '%sInstalled/updated %d item(s).%s ' "$C_OK" "$CHANGES" "$C_OFF"
  else
    printf '%sNothing to do - already up to date.%s ' "$C_OK" "$C_OFF"
  fi
  printf 'Next: %snpm run check%s\n' "$C_BOLD" "$C_OFF"
fi
[[ $WARNINGS -gt 0 ]] && printf '%s%d warning(s) above.%s\n' "$C_WARN" "$WARNINGS" "$C_OFF"
exit 0
