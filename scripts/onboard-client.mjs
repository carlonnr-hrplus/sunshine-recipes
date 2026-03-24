#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────
// HRplus Client Onboarding Script (Node.js)
// ──────────────────────────────────────────────────────────────────
// Prerequisites:
//   1. GitHub CLI installed: https://cli.github.com/
//   2. Authenticated:  gh auth login
//   3. Run from the repo root:  node scripts/onboard-client.mjs
//
// What it does:
//   - Prompts for all required client-specific values
//   - Creates (or updates) a GitHub Environment with secrets & variables
//   - Optionally adds the client to the deploy workflows
//   - Optionally triggers an immediate deploy to the new client
// ──────────────────────────────────────────────────────────────────

import { execSync } from "child_process";
import { createInterface } from "readline";
import { readFileSync, writeFileSync, existsSync } from "fs";

// ── Colours ──
const RED = "\x1b[0;31m";
const GREEN = "\x1b[0;32m";
const CYAN = "\x1b[0;36m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

// ── Helpers ──
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: opts.stdio ?? "pipe", ...opts }).trim();
  } catch {
    return null;
  }
}

function rl() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

/** Check if gh CLI is installed; offer to install if not. */
async function ensureGhCli() {
  const ghVersion = run("gh --version");
  if (ghVersion) return; // already installed

  console.log(`${RED}GitHub CLI (gh) is not installed.${NC}`);
  console.log(`It is required for this script to create environments, set secrets, and trigger deploys.`);
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

  // winget installs to a PATH that the current shell session may not have yet
  // Refresh PATH by reading it from the registry
  try {
    const userPath = run('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"') ?? "";
    const machinePath = run('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'Machine\')"') ?? "";
    process.env.PATH = `${userPath};${machinePath}`;
  } catch { /* ignore — user may need to restart terminal */ }

  // Verify it worked
  const check = run("gh --version");
  if (!check) {
    console.log(`${YELLOW}⚠  gh was installed but is not in the current PATH.${NC}`);
    console.log(`${YELLOW}   Please close this terminal, open a new one, and run this script again.${NC}`);
    process.exit(1);
  }

  console.log(`${GREEN}✓ GitHub CLI installed: ${check}${NC}`);
  console.log();

  // Check if authenticated
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

function ask(question) {
  return new Promise((resolve) => {
    const r = rl();
    r.question(question, (answer) => { r.close(); resolve(answer.trim()); });
  });
}

// For sensitive values — still shows typing (Node has no built-in hidden input
// without raw mode), but keeps prompts consistent. Mark with [secret] so user knows.
async function askSecret(question) {
  return ask(`${question} ${YELLOW}[secret]${NC}: `);
}

function setSecret(repo, envName, name, value) {
  if (!value) {
    console.log(`  ${YELLOW}⊘${NC} Skipped: ${name} (empty)`);
    return;
  }
  const result = run(`gh secret set ${name} --env ${envName} --repo ${repo} --body "${value.replace(/"/g, '\\"')}"`);
  if (result !== null) {
    console.log(`  ${GREEN}✓${NC} Secret: ${name}`);
  } else {
    console.log(`  ${RED}✗${NC} Failed to set secret: ${name}`);
  }
}

function setVariable(repo, envName, name, value) {
  if (!value) {
    console.log(`  ${YELLOW}⊘${NC} Skipped: ${name} (empty)`);
    return;
  }
  // Try gh variable set first, fall back to API
  let ok = run(`gh variable set ${name} --env ${envName} --repo ${repo} --body "${value.replace(/"/g, '\\"')}"`);
  if (ok === null) {
    // Try create via API
    ok = run(`gh api repos/${repo}/environments/${envName}/variables -X POST -f name=${name} -f value="${value.replace(/"/g, '\\"')}"`)
      ?? run(`gh api repos/${repo}/environments/${envName}/variables/${name} -X PATCH -f value="${value.replace(/"/g, '\\"')}"`);
  }
  if (ok !== null) {
    console.log(`  ${GREEN}✓${NC} Variable: ${name}`);
  } else {
    console.log(`  ${RED}✗${NC} Failed to set variable: ${name}`);
  }
}

function removeNoClientsBlock(filePath) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, "utf-8");
  // Remove the no-clients job block
  content = content.replace(/\n {2}no-clients:[\s\S]*?echo "No clients configured yet[^"]*"\n?/g, "\n");
  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, "\n\n");
  writeFileSync(filePath, content, "utf-8");
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
async function main() {
  // ── Ensure gh CLI is available ──
  await ensureGhCli();

  // ── Determine repo ──
  const REPO = run('gh repo view --json nameWithOwner -q ".nameWithOwner"');
  if (!REPO) {
    console.error(`${RED}Error: Could not determine repo. Run this from inside your git repo, or run 'gh auth login' first.${NC}`);
    process.exit(1);
  }

  const DEPLOY_WORKFLOW = ".github/workflows/deploy-all.yml";
  const MANUAL_WORKFLOW = ".github/workflows/deploy-manual.yml";

  console.log();
  console.log(`${CYAN}╔══════════════════════════════════════════════════════╗${NC}`);
  console.log(`${CYAN}║       HRplus – Client Onboarding                    ║${NC}`);
  console.log(`${CYAN}║       Repo: ${YELLOW}${REPO}${NC}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════════════╝${NC}`);
  console.log();

  // ── 0. Check for repo-level SUPABASE_ACCESS_TOKEN ──
  const repoSecrets = run(`gh secret list --repo ${REPO}`) ?? "";
  if (repoSecrets.includes("SUPABASE_ACCESS_TOKEN")) {
    console.log(`${GREEN}✓ SUPABASE_ACCESS_TOKEN found at repo level.${NC}`);
  } else {
    console.log(`${YELLOW}⚠  SUPABASE_ACCESS_TOKEN is not set at the repo level.${NC}`);
    console.log(`   This token is required for the Supabase CLI to authenticate.`);
    console.log(`   Get it from: ${CYAN}https://supabase.com/dashboard/account/tokens${NC}`);
    console.log();
    const token = await askSecret(`${GREEN}Paste your Supabase Access Token${NC} (or press Enter to skip)`);
    if (token) {
      run(`gh secret set SUPABASE_ACCESS_TOKEN --repo ${REPO} --body "${token}"`);
      console.log(`${GREEN}✓ SUPABASE_ACCESS_TOKEN set at repo level.${NC}`);
    } else {
      console.log(`${RED}⚠  Skipped. Deploys will fail without this token. Set it later:${NC}`);
      console.log(`   ${CYAN}gh secret set SUPABASE_ACCESS_TOKEN --repo ${REPO}${NC}`);
    }
  }
  console.log();

  // ── 1. Client name ──
  const CLIENT_NAME = await ask(`${GREEN}Client environment name${NC} (e.g. client-acme): `);
  if (!CLIENT_NAME) {
    console.error(`${RED}Client name is required.${NC}`);
    process.exit(1);
  }

  const envCheck = run(`gh api repos/${REPO}/environments/${CLIENT_NAME}`);
  if (envCheck) {
    console.log(`${YELLOW}⚠  Environment '${CLIENT_NAME}' already exists. Secrets/variables will be updated.${NC}`);
  } else {
    console.log(`${GREEN}✚  Will create new environment '${CLIENT_NAME}'.${NC}`);
  }
  console.log();

  // ── 2. Prompt for all values ──
  console.log(`${CYAN}── Supabase Project Details ──${NC}`);
  const SUPABASE_PROJECT_REF = await ask("  Supabase Project Ref (e.g. hmdewkkytchwrenqagkw): ");
  const VITE_SUPABASE_URL = await ask("  Supabase URL (e.g. https://xyz.supabase.co): ");
  const VITE_SUPABASE_ANON_KEY = await ask("  Supabase Anon Key (the publishable key): ");
  const DB_PASSWORD = await askSecret("  Supabase DB Password");
  console.log();

  console.log(`${CYAN}── Azure Static Web App ──${NC}`);
  const AZURE_SWA_TOKEN = await askSecret("  Azure SWA Deployment Token");
  console.log();

  console.log(`${CYAN}── Edge Function Secrets ──${NC}`);
  console.log(`  ${YELLOW}(Press Enter to skip any you want to set later)${NC}`);
  const LOVABLE_API_KEY = await askSecret("  LOVABLE_API_KEY");
  const RESEND_API_KEY = await askSecret("  RESEND_API_KEY");
  const PAYMENT_WEBHOOK_SECRET = await askSecret("  PAYMENT_WEBHOOK_SECRET");
  const CLOUDFLARE_API_TOKEN = await askSecret("  CLOUDFLARE_API_TOKEN");
  const CLOUDFLARE_ZONE_ID = await ask("  CLOUDFLARE_ZONE_ID: ");
  console.log();

  // ── 3. Create / update environment ──
  console.log(`${CYAN}Creating/updating environment '${CLIENT_NAME}'...${NC}`);
  run(`gh api repos/${REPO}/environments/${CLIENT_NAME} -X PUT`);

  console.log();
  console.log(`${CYAN}── Setting Variables (non-sensitive, plaintext) ──${NC}`);
  setVariable(REPO, CLIENT_NAME, "SUPABASE_PROJECT_REF", SUPABASE_PROJECT_REF);
  setVariable(REPO, CLIENT_NAME, "VITE_SUPABASE_URL", VITE_SUPABASE_URL);
  setVariable(REPO, CLIENT_NAME, "VITE_SUPABASE_ANON_KEY", VITE_SUPABASE_ANON_KEY);
  setVariable(REPO, CLIENT_NAME, "CLOUDFLARE_ZONE_ID", CLOUDFLARE_ZONE_ID);

  console.log();
  console.log(`${CYAN}── Setting Secrets (encrypted) ──${NC}`);
  setSecret(REPO, CLIENT_NAME, "DB_PASSWORD", DB_PASSWORD);
  setSecret(REPO, CLIENT_NAME, "AZURE_SWA_TOKEN", AZURE_SWA_TOKEN);
  setSecret(REPO, CLIENT_NAME, "LOVABLE_API_KEY", LOVABLE_API_KEY);
  setSecret(REPO, CLIENT_NAME, "RESEND_API_KEY", RESEND_API_KEY);
  setSecret(REPO, CLIENT_NAME, "PAYMENT_WEBHOOK_SECRET", PAYMENT_WEBHOOK_SECRET);
  setSecret(REPO, CLIENT_NAME, "CLOUDFLARE_API_TOKEN", CLOUDFLARE_API_TOKEN);

  console.log();
  console.log(`${GREEN}✅ Environment '${CLIENT_NAME}' configured.${NC}`);

  // ── 4. Optionally add to deploy workflows ──
  const JOB_SLUG = CLIENT_NAME.replace(/^client-/, "");
  console.log();
  const addToWorkflows = await ask(`${GREEN}Add '${CLIENT_NAME}' to the deploy workflows?${NC} [y/N]: `);

  if (/^[Yy]$/.test(addToWorkflows)) {
    // ── 4a. Update deploy-all.yml ──
    if (existsSync(DEPLOY_WORKFLOW)) {
      const content = readFileSync(DEPLOY_WORKFLOW, "utf-8");
      if (content.includes(`deploy-${JOB_SLUG}:`)) {
        console.log(`${YELLOW}⚠  '${CLIENT_NAME}' is already in ${DEPLOY_WORKFLOW}.${NC}`);
      } else {
        removeNoClientsBlock(DEPLOY_WORKFLOW);
        const jobBlock = `
  deploy-${JOB_SLUG}:
    uses: ./.github/workflows/_deploy-client.yml
    with:
      environment: ${CLIENT_NAME}
    secrets: inherit
`;
        let updated = readFileSync(DEPLOY_WORKFLOW, "utf-8");
        updated = updated.trimEnd() + "\n" + jobBlock;
        writeFileSync(DEPLOY_WORKFLOW, updated, "utf-8");
        console.log(`${GREEN}✓ Added '${CLIENT_NAME}' to ${DEPLOY_WORKFLOW}.${NC}`);
        console.log(`${YELLOW}  Remember to commit and push this change!${NC}`);
      }
    } else {
      console.log(`${RED}⚠  ${DEPLOY_WORKFLOW} not found.${NC}`);
    }

    // ── 4b. Update deploy-manual.yml ──
    if (existsSync(MANUAL_WORKFLOW)) {
      let content = readFileSync(MANUAL_WORKFLOW, "utf-8");
      if (content.includes(`deploy-all-${JOB_SLUG}:`)) {
        console.log(`${YELLOW}⚠  '${CLIENT_NAME}' already in ${MANUAL_WORKFLOW}.${NC}`);
      } else {
        removeNoClientsBlock(MANUAL_WORKFLOW);
        content = readFileSync(MANUAL_WORKFLOW, "utf-8");

        // Add to dropdown options (before "- ALL")
        if (!content.includes(`          - ${CLIENT_NAME}`)) {
          content = content.replace(
            /^( +- ALL)$/m,
            `          - ${CLIENT_NAME}\n$1`
          );
        }

        // Append the deploy-all job
        const jobBlock = `
  deploy-all-${JOB_SLUG}:
    if: inputs.client == 'ALL'
    uses: ./.github/workflows/_deploy-client.yml
    with:
      environment: ${CLIENT_NAME}
    secrets: inherit
`;
        content = content.trimEnd() + "\n" + jobBlock;
        writeFileSync(MANUAL_WORKFLOW, content, "utf-8");
        console.log(`${GREEN}✓ Added '${CLIENT_NAME}' to ${MANUAL_WORKFLOW}.${NC}`);
      }
    } else {
      console.log(`${RED}⚠  ${MANUAL_WORKFLOW} not found.${NC}`);
    }
  }

  // ── 5. Optionally trigger immediate deploy ──
  console.log();
  const deployNow = await ask(`${GREEN}Deploy to '${CLIENT_NAME}' now?${NC} [y/N]: `);
  if (/^[Yy]$/.test(deployNow)) {
    console.log(`${CYAN}Triggering manual deploy for '${CLIENT_NAME}'...${NC}`);
    const triggered = run(`gh workflow run deploy-manual.yml -f client=${CLIENT_NAME}`)
      ?? run(`gh workflow run "Manual Deploy" -f client=${CLIENT_NAME}`);
    if (triggered !== null) {
      console.log(`${GREEN}✓ Deploy triggered. Check status: gh run list --workflow=deploy-manual.yml${NC}`);
    } else {
      console.log(`${RED}⚠  Could not trigger. Make sure deploy-manual.yml exists and is committed.${NC}`);
    }
  }

  console.log();
  console.log(`${CYAN}╔══════════════════════════════════════════════════════╗${NC}`);
  console.log(`${CYAN}║  Done! Summary:                                      ║${NC}`);
  console.log(`${CYAN}║  Environment: ${YELLOW}${CLIENT_NAME}${NC}`);
  console.log(`${CYAN}║  Repo:        ${YELLOW}${REPO}${NC}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════════════╝${NC}`);
  console.log();
  console.log(`  View environment: ${YELLOW}https://github.com/${REPO}/settings/environments/${CLIENT_NAME}${NC}`);
  console.log(`  View actions:     ${YELLOW}https://github.com/${REPO}/actions${NC}`);
  console.log();
}

main().catch((err) => {
  console.error(`${RED}${err.message}${NC}`);
  process.exit(1);
});
