/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { Commit } from "./github.ts";
import { success, warning } from "./icons.tsx";

export function migrationInfo(commits: Commit[]): JSX.Element {
  const migrationRegex = /migrate|migration/i;
  const possibleMigrationCommits = commits.filter((commit) =>
    migrationRegex.test(commit.commit.message) ||
    commit.files.some((file) => migrationRegex.test(file.filename))
  );

  if (possibleMigrationCommits.length === 0) {
    return (
      <>
        {success} None detected (no commit message or file matched /migrate/i)
      </>
    );
  } else {
    const commitMessagesToShow = possibleMigrationCommits.map((commit) =>
      commit.commit.message + "\n\nPossible migration related files:\n" +
      commit.files.map((file) => file.filename).filter((file) =>
        migrationRegex.test(file)
      ).join("\n")
    );
    return (
      <>
        {warning} {possibleMigrationCommits.length}{" "}
        possible migration(s) detected
        {commitMessagesToShow.map((commit) => (
          <pre class="check-details">{commit}</pre>
        ))}
      </>
    );
  }
}
