#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
// HRplus – Selective Deploy (Node.js)
// ──────────────────────────────────────────────────────────────────
// Lists all client environments and lets you pick which one(s)
// to deploy to, then triggers the manual deploy workflow.
//
// Prerequisites:
//   1. GitHub CLI installed & authenticated: gh auth login
//   2. deploy-manual.yml committed and pushed to the default branch
//   3. Run from repo root:  node scripts/deploy-select.mjs
// ──────────────────────────────────────────────────────────────────

import { execSync } from "child_process";
import { createInterface } from "readline";

// ── Colours ──
const RED = "\x1b[0;31m";
const GREEN = "\x1b[0;32m";
const CYAN = "\x1b[0;36m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

function ask(question) {
  return new Promise((resolve) => {
    const r = createInterface({ input: process.stdin, output: process.stdout });
    r.question(question, (answer) => { r.close(); resolve(answer.trim()); });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if gh CLI is installed; offer to install if not. */
async function ensureGhCli() {
  const ghVersion = run("gh --version");
  if (ghVersion) return;

  console.log(`${RED}GitHub CLI (gh) is not installed.${NC}`);
  console.log(`It is required for this script to trigger deploys via the GitHub API.`);
  console.log();
  const install = await ask(`${GREEN}Install it now via winget?${NC} [y/N]: `);
  if (!/^[Yy]$/.test(install)) {
    console.log(`${RED}Cannot continue without the GitHub CLI. Install it manually:${NC}`);
    console.log(`  ${CYAN}winget install GitHub.cli${NC}`);
    console.log(`  ${CYAN}https://cli.github.com/${NC}`);
    process.exit(1);
  }

  console.log(`${CYAN}Installing GitHub CLI...${NC}`);
  try {
    execSync("winget install GitHub.cli --accept-source-agreements --accept-package-agreements", {
      stdio: "inherit",
    });
  } catch {
    console.error(`${RED}Installation failed. Install it manually:${NC}`);
    console.log(`  ${CYAN}winget install GitHub.cli${NC}`);
    console.log(`  ${CYAN}https://cli.github.com/${NC}`);
    process.exit(1);
  }

  // Refresh PATH from registry so current process can find gh
  try {
    const userPath = run('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"') ?? "";
    const machinePath = run('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'Machine\')"') ?? "";
    process.env.PATH = `${userPath};${machinePath}`;
  } catch { /* ignore */ }

  const check = run("gh --version");
  if (!check) {
    console.log(`${YELLOW}⚠  gh was installed but is not in the current PATH.${NC}`);
    console.log(`${YELLOW}   Please close this terminal, open a new one, and run this script again.${NC}`);
    process.exit(1);
  }

  console.log(`${GREEN}✓ GitHub CLI installed: ${check}${NC}`);
  console.log();

  const authStatus = run("gh auth status");
  if (!authStatus || authStatus.includes("not logged")) {
    console.log(`${YELLOW}You need to authenticate with GitHub.${NC}`);
    console.log(`Running ${CYAN}gh auth login${NC}...`);
    console.log();
    try {
      execSync("gh auth login", { stdio: "inherit" });
    } catch {
      console.error(`${RED}Authentication failed. Run 'gh auth login' manually and try again.${NC}`);
      process.exit(1);
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
  // ── Ensure gh CLI is available ──
  await ensureGhCli();

  const REPO = run('gh repo view --json nameWithOwner -q ".nameWithOwner"');
  if (!REPO) {
    console.error(`${RED}Error: Could not determine repo. Run 'gh auth login' first.${NC}`);
    process.exit(1);
  }

  console.log();
  console.log(`${CYAN}╔══════════════════════════════════════════════════════╗${NC}`);
  console.log(`${CYAN}║   HRplus – Selective Deploy                          ║${NC}`);
  console.log(`${CYAN}║   Repo: ${YELLOW}${REPO}${NC}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════════════╝${NC}`);
  console.log();

  // ── Fetch all environments that start with "client-" ──
  console.log(`${CYAN}Fetching client environments...${NC}`);
  const envsRaw = run(`gh api repos/${REPO}/environments --jq ".environments[].name"`);
  if (!envsRaw) {
    console.error(`${RED}Could not fetch environments. Check 'gh auth login' status.${NC}`);
    process.exit(1);
  }

  const envs = envsRaw
    .split("\n")
    .map((e) => e.trim())
    .filter((e) => e.startsWith("client-"))
    .sort();

  if (envs.length === 0) {
    console.error(`${RED}No client environments found (looking for names starting with 'client-').${NC}`);
    console.log(`Run ${CYAN}node scripts/onboard-client.mjs${NC} to create one first.`);
    process.exit(1);
  }

  // ── Display environments with numbers ──
  console.log();
  console.log(`${GREEN}Available clients:${NC}`);
  envs.forEach((env, i) => {
    console.log(`  ${YELLOW}${i + 1})${NC} ${env}`);
  });
  console.log(`  ${YELLOW}A)${NC} ALL clients`);
  console.log();

  // ── Prompt for selection ──
  const selection = await ask(`${GREEN}Select clients to deploy${NC} (comma-separated numbers, or A for all): `);

  let selectedClients = [];

  if (/^[Aa]$/.test(selection)) {
    selectedClients = [...envs];
    console.log(`${CYAN}Selected: ALL clients${NC}`);
  } else {
    const indices = selection.split(",").map((s) => s.trim());
    for (const idx of indices) {
      const num = parseInt(idx, 10);
      if (!isNaN(num) && num >= 1 && num <= envs.length) {
        selectedClients.push(envs[num - 1]);
      } else {
        console.log(`${RED}Invalid selection: ${idx}${NC}`);
      }
    }
  }

  if (selectedClients.length === 0) {
    console.error(`${RED}No clients selected. Exiting.${NC}`);
    process.exit(1);
  }

  // ── Confirm ──
  console.log();
  console.log(`${CYAN}Will deploy to:${NC}`);
  for (const client of selectedClients) {
    console.log(`  ${YELLOW}→${NC} ${client}`);
  }
  console.log();

  const confirm = await ask(`${GREEN}Proceed?${NC} [y/N]: `);
  if (!/^[Yy]$/.test(confirm)) {
    console.log("Cancelled.");
    process.exit(0);
  }

  // ── Trigger deploys ──
  console.log();
  for (const client of selectedClients) {
    process.stdout.write(`  Deploying ${YELLOW}${client}${NC}... `);
    const result = run(`gh workflow run deploy-manual.yml -f client=${client}`);
    if (result !== null) {
      console.log(`${GREEN}✓ triggered${NC}`);
    } else {
      console.log(`${RED}✗ failed to trigger${NC}`);
    }
    // Small delay to avoid rate limiting
    await sleep(1000);
  }

  console.log();
  console.log(`${GREEN}✅ Done! Monitor progress:${NC}`);
  console.log(`   ${YELLOW}gh run list --workflow=deploy-manual.yml${NC}`);
  console.log(`   ${YELLOW}https://github.com/${REPO}/actions${NC}`);
  console.log();
}

main().catch((err) => {
  console.error(`${RED}${err.message}${NC}`);
  process.exit(1);
});
