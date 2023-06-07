/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { Commit, getCommit } from "./github.ts";
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

function unknownCheck(description: string) {
  return (
    <label>
      <input type="checkbox"></input>
      {description}
    </label>
  );
}

const checksWithoutKnownStatus = `Build verification tests passing
No significant new issues found by testers (check test results log)
Jira release created & issues added to it (bulk edit is useful for copying issues from a QA release)
Issues in release have testing completed
Build counter in TeamCity updated and counter reset to 0 (if planning a major or minor release)
Any updates to Auth0 tenants or localization files completed
`
  .split("\n")
  .map((check) => check.trim())
  .filter((check) => check !== "");

export async function getAllChecks(comparison: any): Promise<JSX.Element> {
  const commits = await Promise.all(
    comparison.commits.map(async (commit: any) => await getCommit(commit.url)),
  );

  return (
    <ul>
      <li>{migrationInfo(commits)}</li>
      <li>
        {comparison.status === "ahead" ? success : warning}
        Is fast-forward: {comparison.status === "ahead" ? "Yes" : "No"},{" "}
        {comparison.status} (ahead by{"  "}{comparison.ahead_by}, behind by{" "}
        {comparison.behind_by})
      </li>
      {checksWithoutKnownStatus.map((check) => <li>{unknownCheck(check)}</li>)}
    </ul>
  );
}
