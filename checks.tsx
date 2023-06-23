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

function unknownCheck(description: JSX.Element): JSX.Element {
  return (
    <label>
      <input type="checkbox" /> {description}
    </label>
  );
}

const testLodgeUrl = "https://app.testlodge.com/a/11041/projects/41748/runs";
const testResultSheetUrl =
  "https://docs.google.com/spreadsheets/d/1Pji8dkzcNTzh1NxqaEHj-4o_otLHFArkrBecETZqSgM";

const simpleChecks: JSX.Element[] = [
  unknownCheck(
    <a href={testLodgeUrl} target="_blank">Build verification tests passing</a>,
  ),
  unknownCheck(
    <>
      No significant new issues found by testers (check{" "}
      <a href={testResultSheetUrl} target="_blank">test results log</a>)
    </>,
  ),
  unknownCheck(
    <>
      <a
        href="https://jira.sil.org/projects/SF?selectedItem=com.atlassian.jira.jira-projects-plugin:release-page"
        target="_blank"
      >
        Jira release created
      </a>{" "}
      & issues added to it (bulk edit is useful for copying issues from a QA
      release)
    </>,
  ),
  unknownCheck("Issues in release have testing completed"),
  unknownCheck(
    <>
      <a
        href="https://build.palaso.org/admin/editBuild.html?id=buildType:xForgeDeploy_ScriptureForgeLive"
        target="_blank"
      >
        Build counter in TeamCity
      </a>{" "}
      updated and counter reset to 0 (if planning a major or minor release)
    </>,
  ),
  unknownCheck("Any updates to Auth0 tenants or localization files completed"),
];

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
      {simpleChecks.map((check) => <li>{check}</li>)}
    </ul>
  );
}
