/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { Commit, Comparison, getCommit, getComparison } from "./github.ts";
import { success, warning } from "./icons.tsx";

async function migrationInfo(comparison: Comparison): Promise<JSX.Element> {
  // TODO it's not really necessary to fetch all commits in order to get file names
  // if none of the file names in the comparison match the regex
  const commits = await Promise.all(
    comparison.commits.map(async (
      commit,
    ) => (await getCommit(commit.url))),
  );

  const migrationRegex = /migrate|migration/i;
  const possibleMigrationCommits = commits.filter((commit) =>
    migrationRegex.test(commit.commit.message) ||
    commit.files.some((file) => migrationRegex.test(file.filename))
  );

  if (possibleMigrationCommits.length === 0) {
    return (
      <>
        {success} None detected (no commit message or file matched{" "}
        <code>/migrate|migration/i</code>)
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

function nonCherryPickedCommits(
  headComparison: Comparison,
  reverseComparison: Comparison,
) {
  return reverseComparison.commits.filter((commit) => {
    !headComparison.commits.some((headCommit) =>
      headCommit.commit.message.includes(
        `cherry picked from commit ${commit.sha}`,
      ) ||
      commit.commit.message.includes(
        `cherry picked to commit ${headCommit.sha}`,
      )
    );
  });
}

async function fastForwardInfo(
  comparison: Comparison,
  base: string,
  head: string,
): Promise<JSX.Element> {
  if (comparison.status === "ahead") {
    return (
      <>{success} Is fast-forward: Yes (ahead by{"  "}{comparison.ahead_by})</>
    );
  } else {
    const reverseComparison = await getComparison(head, base);
    const nonCherryPickCommits = nonCherryPickedCommits(
      comparison,
      reverseComparison,
    );
    if (nonCherryPickCommits.length === 0) {
      return (
        <>
          {success} Is fast-forward: No, {comparison.status} (ahead by{" "}
          {comparison.ahead_by}, behind by{" "}
          {comparison.behind_by}, but all diverging commits are cherry-picked
          across branches)
        </>
      );
    } else {
      return (
        <>
          {warning} Is fast-forward: No, {comparison.status} (ahead by{" "}
          {comparison.ahead_by}, behind by{"  "}{comparison.behind_by},{" "}
          {nonCherryPickCommits.length}{" "}
          commits that are not cherry-picked across branches)
          <p>
            {nonCherryPickCommits.map((commit) => (
              <a href={commit.html_url} target="_blank">
                {commit.commit.message}
              </a>
            ))}
          </p>
        </>
      );
    }
  }
}

function unknownCheck(description: JSX.Element): JSX.Element {
  return (
    <label>
      <input type="checkbox" /> {description}
    </label>
  );
}

const testResultSheetUrl =
  "https://docs.google.com/spreadsheets/d/1Pji8dkzcNTzh1NxqaEHj-4o_otLHFArkrBecETZqSgM";

const simpleChecks: JSX.Element[] = [
  unknownCheck("Full regression run passed"),
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
  unknownCheck("Any updates to Auth0 tenants or localization files completed"),
];

export async function getAllChecks(
  comparison: Comparison,
  base: string,
  head: string,
): Promise<JSX.Element> {
  return (
    <ul>
      <li>{await migrationInfo(comparison)}</li>
      <li>{await fastForwardInfo(comparison, base, head)}</li>
      {simpleChecks.map((check) => <li>{check}</li>)}
    </ul>
  );
}
