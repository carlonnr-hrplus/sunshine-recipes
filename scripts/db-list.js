import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const BACKUP_DIR = ".database-backups";

const EXIT_OK = 0;
const EXIT_ERROR = 1;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  function addSize(path) {
    let stats;
    try {
      stats = statSync(path);
    } catch {
      return;
    }

    if (stats.isDirectory()) {
      let entries = [];
      try {
        entries = readdirSync(path);
      } catch {
        entries = [];
      }
      entries.forEach((file) => addSize(join(path, file)));
    } else {
      totalSize += stats.size;
    }
  }

  addSize(dirPath);
  return totalSize;
}

function safeReadFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function listBackups() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      console.log("No backups directory found.");
      console.log(`Create one with: npm run db:backup`);
      process.exit(EXIT_OK);
      return;
    }

    let entries = [];
    try {
      entries = readdirSync(BACKUP_DIR, { withFileTypes: true });
    } catch {
      console.log("No backups directory found.");
      console.log(`Create one with: npm run db:backup`);
      process.exit(EXIT_OK);
      return;
    }

    const backups = entries
      .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith("backup_"))
      .map((dirent) => dirent.name)
      .sort()
      .reverse();

    if (backups.length === 0) {
      console.log("No backups found.");
      console.log(`Create one with: npm run db:backup`);
      process.exit(EXIT_OK);
      return;
    }

    console.log("");
    console.log("Available Database Backups");
    console.log("===============================================================");
    console.log("");

    let firstBackupId = null;

    backups.forEach((backupName) => {
      const backupPath = join(BACKUP_DIR, backupName);
      const infoFile = join(backupPath, `${backupName}_info.txt`);

      const content = safeReadFile(infoFile);

      if (content) {
        const shortIdMatch = content.match(/Backup ID: (\w+)/);
        const createdMatch = content.match(/Created: ([^\n]+)/);
        const branchMatch = content.match(/Git Branch: ([^\n]+)/);
        const commitMatch = content.match(/Git Commit: ([^\n]+)/);

        const shortId = shortIdMatch ? shortIdMatch[1] : "N/A";
        const created = createdMatch ? createdMatch[1] : "Unknown";
        const branch = branchMatch ? branchMatch[1] : "Unknown";
        const commit = commitMatch ? commitMatch[1] : "Unknown";

        if (!firstBackupId && shortId !== "N/A") firstBackupId = shortId;

        const size = getDirectorySize(backupPath);

        console.log(`ID: ${shortId}`);
        console.log(`  Created:  ${created}`);
        console.log(`  Branch:   ${branch}`);
        console.log(`  Commit:   ${commit}`);
        console.log(`  Name:     ${backupName}`);
        console.log(`  Size:     ${formatBytes(size)}`);
        console.log("");
      } else {
        const size = getDirectorySize(backupPath);
        console.log(`ID: ${backupName}`);
        console.log("  Note: missing metadata file");
        console.log(`  Size: ${formatBytes(size)}`);
        console.log("");
      }
    });

    console.log("===============================================================");
    console.log("");
    console.log("To restore a backup:");
    console.log("  npm run db:restore <backup-id>");
    console.log("");

    if (firstBackupId) {
      console.log("Example:");
      console.log(`  npm run db:restore ${firstBackupId}`);
      console.log("");
    }

    process.exit(EXIT_OK);
  } catch (error) {
    console.error("ERROR: Failed to list backups.");
    console.error(error && error.message ? error.message : String(error));
    process.exit(EXIT_ERROR);
  }
}

listBackups();
