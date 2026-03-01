import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const BACKUP_DIR = ".database-backups";

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 2;

function run(command, options = {}) {
  const { silent = false, allowFailure = false } = options;

  try {
    const stdout = execSync(command, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
    return { ok: true, stdout: silent ? stdout : "" };
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : "";
    const stderr = error && error.stderr ? String(error.stderr) : "";
    const msg = stderr.trim() || stdout.trim() || (error && error.message ? error.message : "Unknown error");

    if (allowFailure) {
      return { ok: false, stdout, stderr, message: msg };
    }

    throw new Error(`Command failed: ${command}\n${msg}`);
  }
}

function safeReadFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function findBackup(identifier) {
  if (!identifier) return null;

  // Exact match (full folder name)
  let path = join(BACKUP_DIR, identifier);
  if (existsSync(path)) return path;

  // backup_<id> match
  path = join(BACKUP_DIR, `backup_${identifier}`);
  if (existsSync(path)) return path;

  // Short ID match (suffix)
  if (!existsSync(BACKUP_DIR)) return null;

  let backups = [];
  try {
    backups = readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("backup_"))
      .map((d) => d.name);
  } catch {
    backups = [];
  }

  const match = backups.find((name) => name.endsWith(identifier));
  return match ? join(BACKUP_DIR, match) : null;
}

function listAvailableBackups() {
  if (!existsSync(BACKUP_DIR)) {
    console.log("No backups found.");
    return;
  }

  let backups = [];
  try {
    backups = readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("backup_"))
      .map((d) => d.name)
      .sort()
      .reverse();
  } catch {
    backups = [];
  }

  if (backups.length === 0) {
    console.log("No backups found.");
    return;
  }

  backups.forEach((name) => {
    const infoFile = join(BACKUP_DIR, name, `${name}_info.txt`);
    const content = safeReadFile(infoFile);
    if (!content) return;
    const match = content.match(/Backup ID: (\w+)/);
    if (match) {
      console.log(`  ${match[1]} - ${name}`);
    }
  });
}

async function promptYesNo(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  const v = (answer || "").trim().toLowerCase();
  return v === "yes" || v === "y";
}

function usage() {
  console.error("Usage: npm run db:restore <backup-id>");
  console.error("");
  console.error("Available backups:");
  listAvailableBackups();
}

function parseMigrationsOutput(outputText) {
  return outputText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d{14}$/.test(line));
}

function parseFunctionsList(outputText) {
  const lines = outputText.split("\n").map((l) => l.trim()).filter(Boolean);

  return lines
    .map((line) => line.split(/\s+/)[0])
    .filter((name) => name && name !== "NAME" && !name.includes("---") && name !== "No");
}

async function restoreBackup() {
  const identifier = process.argv[2];

  if (!identifier) {
    console.error("ERROR: Backup identifier required.");
    usage();
    process.exit(EXIT_USAGE);
    return;
  }

  if (!existsSync(BACKUP_DIR)) {
    console.error(`ERROR: Backups directory not found: ${BACKUP_DIR}`);
    usage();
    process.exit(EXIT_ERROR);
    return;
  }

  const backupFolder = findBackup(identifier);

  if (!backupFolder || !existsSync(backupFolder)) {
    console.error("ERROR: Backup not found.");
    console.error(`Searched for: ${identifier}`);
    console.error("");
    usage();
    process.exit(EXIT_ERROR);
    return;
  }

  const backupName = backupFolder.split(/[/\\]/).pop();
  const dataFile = join(backupFolder, `${backupName}_data.sql`);
  const schemaFile = join(backupFolder, `${backupName}_schema.sql`);
  const infoFile = join(backupFolder, `${backupName}_info.txt`);

  if (!existsSync(schemaFile) || !existsSync(dataFile)) {
    console.error("ERROR: Backup files incomplete.");
    console.error(`Missing schema/data SQL in: ${backupFolder}`);
    process.exit(EXIT_ERROR);
    return;
  }

  console.log("Backup Information:");
  console.log("");
  const info = safeReadFile(infoFile);
  if (info) {
    console.log(info);
  } else {
    console.log(`Backup: ${backupName}`);
  }
  console.log("");

  const confirmed = await promptYesNo("This will REPLACE your linked remote database. Continue? (yes/no) ");
  console.log("");

  if (!confirmed) {
    console.log("Restore cancelled.");
    process.exit(EXIT_OK);
    return;
  }

  console.log("Starting restoration process...");
  console.log("");

  console.log("1) Resetting linked remote database...");
  try {
    run("npx supabase db reset --linked", { silent: true });
    console.log("  OK: Database reset complete");
  } catch (error) {
    console.error("ERROR: Failed to reset database.");
    console.error(error && error.message ? error.message : String(error));
    process.exit(EXIT_ERROR);
    return;
  }

  console.log("2) Restoring database schema...");
  try {
    run(`npx supabase db execute -f "${schemaFile}"`, { silent: true });
    console.log("  OK: Schema restored");
  } catch (error) {
    console.error("ERROR: Failed to restore schema.");
    console.error(error && error.message ? error.message : String(error));
    process.exit(EXIT_ERROR);
    return;
  }

  console.log("3) Restoring data...");
  try {
    run(`npx supabase db execute -f "${dataFile}"`, { silent: true });
    console.log("  OK: Data restored");
  } catch (error) {
    console.error("ERROR: Failed to restore data.");
    console.error(error && error.message ? error.message : String(error));
    process.exit(EXIT_ERROR);
    return;
  }

  console.log("4) Syncing migration records...");
  const migrationsDir = "supabase/migrations";

  if (existsSync(migrationsDir)) {
    try {
      let localMigrations = [];
      try {
        localMigrations = readdirSync(migrationsDir)
          .filter((file) => file.endsWith(".sql"))
          .map((file) => file.replace(".sql", ""));
      } catch {
        localMigrations = [];
      }

      if (localMigrations.length === 0) {
        console.log("  OK: No local migrations to sync");
      } else {
        const remoteOut = run(
          'npx supabase db execute --query "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"',
          { silent: true, allowFailure: true }
        );

        const remoteMigrations = remoteOut.ok ? parseMigrationsOutput(remoteOut.stdout) : [];
        const orphaned = remoteMigrations.filter((v) => !localMigrations.includes(v));

        orphaned.forEach((version) => {
          run(
            `npx supabase db execute --query "DELETE FROM supabase_migrations.schema_migrations WHERE version = '${version}';"`,
            { silent: true, allowFailure: true }
          );
        });

        // Ensure all local migrations are represented remotely (without re-running them).
        localMigrations.forEach((version) => {
          run(
            `npx supabase db execute --query "INSERT INTO supabase_migrations.schema_migrations(version) VALUES('${version}') ON CONFLICT DO NOTHING;"`,
            { silent: true, allowFailure: true }
          );
        });

        console.log(`  OK: Migration records synced (${localMigrations.length} local)`);
      }
    } catch {
      console.log("  WARN: Could not fully sync migration records");
    }
  } else {
    console.log("  OK: No migrations directory found; clearing remote migration records...");
    const cleared = run('npx supabase db execute --query "TRUNCATE supabase_migrations.schema_migrations;"', {
      silent: true,
      allowFailure: true,
    });
    if (cleared.ok) {
      console.log("  OK: Remote migration records cleared");
    } else {
      console.log("  WARN: Could not clear migration records");
    }
  }

  console.log("5) Syncing Edge Functions...");
  const functionsDir = "supabase/functions";

  if (existsSync(functionsDir)) {
    try {
      let localFunctions = [];
      try {
        localFunctions = readdirSync(functionsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        localFunctions = [];
      }

      const remoteList = run("npx supabase functions list", { silent: true, allowFailure: true });
      const remoteFunctions = remoteList.ok ? parseFunctionsList(remoteList.stdout) : [];

      remoteFunctions.forEach((func) => {
        if (!localFunctions.includes(func)) {
          console.log(`  Deleting remote function: ${func}`);
          run(`npx supabase functions delete ${func} --force`, { silent: true, allowFailure: true });
        }
      });

      if (localFunctions.length === 0) {
        console.log("  OK: No local functions to deploy");
      } else {
        const deploy = run("npx supabase functions deploy", { silent: true, allowFailure: true });
        if (deploy.ok) {
          console.log("  OK: Edge Functions synced");
        } else {
          console.log("  WARN: Function deployment had issues");
        }
      }
    } catch {
      console.log("  WARN: Could not fully sync Edge Functions");
    }
  } else {
    console.log("  OK: No local functions directory found; removing remote functions...");
    const remoteList = run("npx supabase functions list", { silent: true, allowFailure: true });
    const remoteFunctions = remoteList.ok ? parseFunctionsList(remoteList.stdout) : [];

    if (remoteFunctions.length === 0) {
      console.log("  OK: No remote functions to delete");
    } else {
      remoteFunctions.forEach((func) => {
        console.log(`  Deleting remote function: ${func}`);
        run(`npx supabase functions delete ${func} --force`, { silent: true, allowFailure: true });
      });
      console.log("  OK: Remote functions deleted");
    }
  }

  console.log("");
  console.log("OK: Restore complete");
  console.log("");
  console.log("Next steps:");
  console.log("  1) Run the app: npm run dev");
  console.log("  2) Verify schema/data and auth flows");
  console.log("  3) If you use Edge Functions, verify they work");
}

restoreBackup().catch((error) => {
  console.error("");
  console.error("ERROR: Restore failed.");
  console.error(error && error.message ? error.message : String(error));
  process.exit(EXIT_ERROR);
});
