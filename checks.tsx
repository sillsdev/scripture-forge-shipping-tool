/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { Commit, Comparison, getCommit, getComparison } from "./github.ts";
import { success, warning } from "./icons.tsx";

async function migrationInfo(comparison: Comparison): Promise<JSX.Element> {
  // TODO it's not really necessary to fetch all commits in order to get file names
  // if none of the file names in the comparison match the regex
  const commits = await Promise.all(
    comparison.commits.map(async (commit) => await getCommit(commit.url))
  );

  const migrationRegex = /migrate|migration/i;
  const possibleMigrationCommits = commits.filter(
    (commit) =>
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
    const commitMessagesToShow = possibleMigrationCommits.map(
      (commit) =>
        commit.commit.message +
        "\n\nPossible migration related files:\n" +
        commit.files
          .map((file) => file.filename)
          .filter((file) => migrationRegex.test(file))
          .join("\n")
    );
    return (
      <>
        {warning} {possibleMigrationCommits.length} possible migration(s)
        detected
        {commitMessagesToShow.map((commit) => (
          <pre class="check-details">{commit}</pre>
        ))}
      </>
    );
  }
}

function nonCherryPickedCommits(
  headComparison: Comparison,
  reverseComparison: Comparison
) {
  return reverseComparison.commits.filter((commit) => {
    !headComparison.commits.some(
      (headCommit) =>
        headCommit.commit.message.includes(
          `cherry picked from commit ${commit.sha}`
        ) ||
        commit.commit.message.includes(
          `cherry picked to commit ${headCommit.sha}`
        )
    );
  });
}

async function fastForwardInfo(
  comparison: Comparison,
  base: string,
  head: string
): Promise<JSX.Element> {
  if (comparison.status === "ahead") {
    return (
      <>
        {success} Is fast-forward: Yes (ahead by{"  "}
        {comparison.ahead_by})
      </>
    );
  } else {
    const reverseComparison = await getComparison(head, base);
    const nonCherryPickCommits = nonCherryPickedCommits(
      comparison,
      reverseComparison
    );
    if (nonCherryPickCommits.length === 0) {
      return (
        <>
          {success} Is fast-forward: No, {comparison.status} (ahead by{" "}
          {comparison.ahead_by}, behind by {comparison.behind_by}, but all
          diverging commits are cherry-picked across branches)
        </>
      );
    } else {
      return (
        <>
          {warning} Is fast-forward: No, {comparison.status} (ahead by{" "}
          {comparison.ahead_by}, behind by{"  "}
          {comparison.behind_by}, {nonCherryPickCommits.length} commits that are
          not cherry-picked across branches)
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
const testResultObservationsFolderUrl =
  "https://drive.google.com/drive/folders/1vv5XI_p3VsuLjA5K47nL6arthNY772HS";
const regressionTestReportUrl =
  "https://drive.google.com/drive/folders/1pDlACD3VtNW2JffFFdcUNo399UKKvemW";
const auth0PRsUrl = "https://github.com/sillsdev/auth0-configs/pulls";
const auth0StringsUrl =
  "https://github.com/sillsdev/auth0-configs/commits/master/i18n/en.json";
const releaseToLiveWorkflowUrl =
  "https://github.com/sillsdev/web-xforge/actions/workflows/release-live.yml";
const releaseToQAWorkflowUrl =
  "https://github.com/sillsdev/web-xforge/actions/workflows/release-qa.yml";
const sfUrl = "https://scriptureforge.org/";
const jiraReleasesUrl =
  "https://jira.sil.org/projects/SF?selectedItem=com.atlassian.jira.jira-projects-plugin:release-page";

const shipActions: JSX.Element[] = [
  unknownCheck(
    <>
      In conjunction with performing any needed migrations, release by running
      the{" "}
      <a href={releaseToLiveWorkflowUrl} target="_blank">
        workflow
      </a>
      .{" "}
      <p class="more-information">
        In <span class="ui">level of release</span>, choose{" "}
        <span class="ui">patch</span> for a release with only bug fixes,{" "}
        <span class="ui">minor</span> for a release with new features, or{" "}
        <span class="ui">major</span> when the house needs a new color of paint.
      </p>
    </>
  ),
  unknownCheck(
    <>
      Smoke-test the{" "}
      <a href={sfUrl} target="_blank">
        release
      </a>
      .
    </>
  ),
];

export async function getDeterminationChecks(
  comparison: Comparison,
  base: string,
  head: string
): Promise<JSX.Element> {
  const determinationChecks: JSX.Element[] = [
    unknownCheck(
      <>
        No blockers in full regression test{" "}
        <a href={regressionTestReportUrl} target="_blank">
          report
        </a>
      </>
    ),
    unknownCheck(
      <>
        No blocking issues found by testers in{" "}
        <a href={testResultSheetUrl} target="_blank">
          results summary
        </a>
        .{" "}
        <p class="more-information">
          This summary is made by examining the{" "}
          <a href={testResultObservationsFolderUrl} target="_blank">
            test observations
          </a>
          .
        </p>
      </>
    ),
    unknownCheck(
      <>
        Prepare to handle any needed migrations.
        <p>{await migrationInfo(comparison)}</p>
      </>
    ),
    unknownCheck(
      "Consider the commits being released, below. Does anything need attention?"
    ),
    unknownCheck(
      <>
        Issues in release have testing completed.{" "}
        <p class="more-information">
          They will have status Resolved, Helps, or Closed if their testing is
          completed.
        </p>
      </>
    ),
    unknownCheck(
      <>
        If there is a hotfix on Live, the same code should also be on QA.
        <p>{await fastForwardInfo(comparison, base, head)}</p>
      </>
    ),
    unknownCheck(
      <>
        Any needed updates to Auth0{" "}
        <a href={auth0PRsUrl} target="_blank">
          tenants
        </a>{" "}
        or{" "}
        <a href={auth0StringsUrl} target="_blank">
          localization files
        </a>{" "}
        completed
      </>
    ),
  ];

  return (
    <ul>
      {determinationChecks.map((check) => (
        <li>{check}</li>
      ))}
    </ul>
  );
}

export async function getShipActions(): Promise<JSX.Element> {
  return (
    <ul>
      {shipActions.map((check) => (
        <li>{check}</li>
      ))}
    </ul>
  );
}

export async function getPostProcessingSteps(
  jiraIssuesInRangeUrl: string
): Promise<JSX.Element> {
  const postProcessingSteps: JSX.Element[] = [
    unknownCheck(
      <>
        Re-enable the{" "}
        <a href={releaseToQAWorkflowUrl} target="_blank">
          Release to QA GitHub workflow
        </a>{" "}
        if it had been disabled.
      </>
    ),
    unknownCheck(
      <>
        Perform JIRA release.{" "}
        <div class="more-information">
          <p>
            Open the{" "}
            <a href={jiraIssuesInRangeUrl} target="_blank">
              list of issues
            </a>{" "}
            in JIRA. Click <span class="ui">Tools</span> and do a Bulk Change to
            the issues, where you will add to the{" "}
            <span class="ui">Fix Version/s</span> field the new version number
            (eg 5.0.2), which will also create a Jira Release for that version
            number at the same time.
          </p>{" "}
          <p>
            Start another Bulk Change, omit any issues without Status of Closed,
            and from <span class="ui">Fix Version/s</span> remove "next".
          </p>
        </div>
      </>
    ),
    unknownCheck(
      <>
        Mark JIRA{" "}
        <a href={jiraReleasesUrl} target="_blank">
          Release
        </a>{" "}
        as released.
      </>
    ),
  ];

  return (
    <ul>
      {postProcessingSteps.map((check) => (
        <li>{check}</li>
      ))}
    </ul>
  );
}
