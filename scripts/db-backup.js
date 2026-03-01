import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

const BACKUP_DIR = ".database-backups";

const EXIT_OK = 0;
const EXIT_ERROR = 1;

function run(command, options = {}) {
  const { silent = false } = options;
  try {
    return execSync(command, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr) : "";
    const stdout = error && error.stdout ? String(error.stdout) : "";
    const msg = stderr.trim() || stdout.trim() || (error && error.message ? error.message : "Unknown error");
    throw new Error(`Command failed: ${command}\n${msg}`);
  }
}

function getGitInfo() {
  try {
    const branch = run("git branch --show-current", { silent: true }).trim();
    const commit = run("git rev-parse --short HEAD", { silent: true }).trim();
    const status = run("git status --porcelain", { silent: true }).trim();
    const hasUncommitted = status.length > 0;

    return {
      branch: hasUncommitted ? `${branch} (UNCOMMITTED CHANGES)` : branch,
      commit,
      hasUncommitted,
      status: hasUncommitted ? "Uncommitted changes present" : "Clean working directory",
    };
  } catch {
    return {
      branch: "unknown",
      commit: "unknown",
      hasUncommitted: false,
      status: "Git not available",
    };
  }
}

function safeRm(path) {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function createBackup() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "_");

  const backupName = `backup_${timestamp}`;
  const backupFolder = join(BACKUP_DIR, backupName);
  const shortId = timestamp.slice(-6);

  console.log(`Creating database backup: ${backupName}`);
  console.log("");

  try {
    mkdirSync(backupFolder, { recursive: true });
  } catch (error) {
    console.error("ERROR: Failed to create backup directory.");
    throw error;
  }

  const git = getGitInfo();

  const schemaPath = join(backupFolder, `${backupName}_schema.sql`);
  const dataPath = join(backupFolder, `${backupName}_data.sql`);
  const infoPath = join(backupFolder, `${backupName}_info.txt`);

  console.log("Backing up database schema...");
  try {
    run(`npx supabase db dump --schema public -f "${schemaPath}"`, { silent: true });
    console.log("  OK: Schema backed up");
  } catch (error) {
    console.error("ERROR: Failed to backup schema.");
    safeRm(backupFolder);
    throw error;
  }

  console.log("Backing up data...");
  try {
    run(`npx supabase db dump --data-only -f "${dataPath}"`, { silent: true });
    console.log("  OK: Data backed up");
  } catch (error) {
    console.error("ERROR: Failed to backup data.");
    safeRm(backupFolder);
    throw error;
  }

  const metadata = `Backup ID: ${shortId}
Backup Name: ${backupName}
Created: ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC
Git Branch: ${git.branch}
Git Commit: ${git.commit}
Git Status: ${git.status}

---
RESTORE INSTRUCTIONS:
To restore this backup, run:
  npm run db:restore ${backupName}
Or using short ID:
  npm run db:restore ${shortId}

This restore will:
  - Reset the linked remote database
  - Restore public schema and data
  - Sync migration tracking records
  - Sync Edge Functions deployment
`;

  try {
    writeFileSync(infoPath, metadata, "utf8");
  } catch (error) {
    console.error("ERROR: Failed to write backup metadata file.");
    safeRm(backupFolder);
    throw error;
  }

  console.log("");
  console.log("OK: Backup complete");
  console.log(`Location: ${backupFolder}`);
  console.log(`Backup ID: ${shortId}`);
  console.log(`Full Name: ${backupName}`);
  console.log("");
  console.log(`Restore with: npm run db:restore ${shortId}`);
}

createBackup()
  .then(() => process.exit(EXIT_OK))
  .catch((error) => {
    console.error("");
    console.error("ERROR: Backup failed.");
    console.error(error && error.message ? error.message : String(error));
    process.exit(EXIT_ERROR);
  });
