/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { Commit, Comparison, getCommit, getComparison } from "./github.ts";
import { success, warning } from "./icons.tsx";
import { getLinkForJiraIssue, JiraIssueInfo } from "./jira.ts";

/** Description of the result of investigating a situation.  */
interface SituationQuery {
  /** Whether an action might be needed, or might not be needed. */
  actionNeeded: boolean;
  description: JSX.Element;
}

/** Indicates if a migration might be needed, and provides a description of the situation. */
async function migrationInfo(comparison: Comparison): Promise<SituationQuery> {
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
    return {
      actionNeeded: false,
      description: (
        <>
          No migrations detected. (No commit message or file matched{" "}
          <code>/migrate|migration/i</code>.)
        </>
      ),
    };
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
    return {
      actionNeeded: true,
      description: (
        <>
          {warning} {possibleMigrationCommits.length} possible migration(s)
          detected
          {commitMessagesToShow.map((commit) => (
            <pre class="check-details">{commit}</pre>
          ))}
        </>
      ),
    };
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
): Promise<SituationQuery> {
  if (comparison.status === "ahead") {
    return {
      actionNeeded: false,
      description: (
        <>
          Is fast-forward: Yes (ahead by{"  "}
          {comparison.ahead_by})
        </>
      ),
    };
  } else {
    const reverseComparison = await getComparison(head, base);
    const nonCherryPickCommits = nonCherryPickedCommits(
      comparison,
      reverseComparison
    );
    if (nonCherryPickCommits.length === 0) {
      return {
        actionNeeded: false,
        description: (
          <>
            Is fast-forward: No, {comparison.status} (ahead by{" "}
            {comparison.ahead_by}, behind by {comparison.behind_by}, but all
            diverging commits are cherry-picked across branches)
          </>
        ),
      };
    } else {
      return {
        actionNeeded: true,
        description: (
          <>
            {warning} Is fast-forward: No, {comparison.status} (ahead by{" "}
            {comparison.ahead_by}, behind by{"  "}
            {comparison.behind_by}, {nonCherryPickCommits.length} commits that
            are not cherry-picked across branches)
            <p>
              {nonCherryPickCommits.map((commit) => (
                <a href={commit.html_url} target="_blank">
                  {commit.commit.message}
                </a>
              ))}
            </p>
          </>
        ),
      };
    }
  }
}

/** Return whether or not all given issues have their testing complete. */
function considerJiraIssues(jiraIssues: JiraIssueInfo[]): SituationQuery {
  const completedStatuses = ["Resolved", "Helps", "Closed"];
  const incompleteIssues = jiraIssues.filter(
    (issue) => !completedStatuses.includes(issue.status)
  );

  if (incompleteIssues.length === 0) {
    return {
      actionNeeded: false,
      description: (
        <>
          All issues have completed testing (status is Resolved, Helps, or
          Closed).
        </>
      ),
    };
  } else {
    return {
      actionNeeded: true,
      description: (
        <>
          {warning} {incompleteIssues.length} issue(s) do not have completed
          testing status.
          <p class="more-information">
            Issues with status other than Resolved, Helps, or Closed:
            <ul class="more-information">
              {incompleteIssues.map((issue) => (
                <li>
                  <a href={getLinkForJiraIssue(issue.key)} target="_blank">
                    {issue.key}
                  </a>
                  : {issue.summary}
                </li>
              ))}
            </ul>
          </p>
        </>
      ),
    };
  }
}

function unknownCheck(
  description: JSX.Element,
  isChecked: boolean = false
): JSX.Element {
  return (
    <label>
      <input type="checkbox" {...(isChecked ? { checked: true } : {})} />{" "}
      {description}
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
const sfLiveBranchProtectionSettingsUrl =
  "https://github.com/sillsdev/web-xforge/settings/branch_protection_rules/5551052";

export async function getDeterminationChecks(
  comparison: Comparison,
  base: string,
  head: string,
  jiraIssuesInRangeUrl: string,
  jiraIssues: JiraIssueInfo[]
): Promise<JSX.Element> {
  const migration: SituationQuery = await migrationInfo(comparison);
  const fastForwardComparison: SituationQuery = await fastForwardInfo(
    comparison,
    base,
    head
  );
  const issues: SituationQuery = await considerJiraIssues(jiraIssues);
  const determinationChecks: JSX.Element[] = [
    unknownCheck(
      <>
        No blockers in full regression test{" "}
        <a href={regressionTestReportUrl} target="_blank">
          report
        </a>
        .
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
        Be ready to handle any needed migrations.
        <p class="more-information">{migration.description}</p>
      </>,
      !migration.actionNeeded
    ),
    unknownCheck(
      "Consider the commits being released, below. Does anything need attention?"
    ),
    unknownCheck(
      <>
        <a href={jiraIssuesInRangeUrl} target="_blank">
          Issues
        </a>{" "}
        in release have testing completed.{" "}
        <p class="more-information">{issues.description}</p>
      </>,
      !issues.actionNeeded
    ),
    unknownCheck(
      <>
        QA should contain hotfixes on Live, if any.
        <p class="more-information">{fastForwardComparison.description}</p>
      </>,
      !fastForwardComparison.actionNeeded
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
        completed.
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
  const shipActions: JSX.Element[] = [
    unknownCheck(
      <>
        Allow workflow to push past branch protection.
        <p class="more-information">
          Until we improve how our release workflow interacts with branch
          protection, workaround branch protection by doing the following while
          the workflow is running.
        </p>
        <p>
          <ul>
            <li class="more-information">
              Open two tabs to sf-live branch protection{" "}
              <a href={sfLiveBranchProtectionSettingsUrl} target="_blank">
                settings
              </a>
              . (<span class="ui">Settings</span> -{" "}
              <span class="ui">Branches</span> - sf-live)
            </li>
            <li class="more-information">
              In one tab, Clear{" "}
              <span class="ui">Restrict who can push to matching branches</span>
              , and click <span class="ui">Save changes</span>.
            </li>
            <li class="more-information">
              Later, after the workflow deploys, go to the other tab with the
              previous branch protection settings (which has not only{" "}
              <span class="ui">Restrict who can push to matching branches</span>{" "}
              selected, but also specifies items in an allow list), and click{" "}
              <span class="ui">Save changes</span> to restore the branch
              protection settings to what they were.
            </li>
          </ul>
        </p>
      </>
    ),
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
          <span class="ui">major</span> when the house needs a new color of
          paint.
        </p>
        <p class="more-information">
          If you want to release from a specific QA version, rather than the
          latest commit on branch sf-qa, enter a number in box{" "}
          <span class="ui">QA version from which to release</span>.
        </p>
      </>
    ),
    unknownCheck(
      <>
        Approve production deployment.
        <p class="more-information">
          Click the Release to Live run that was started. When it appears, click{" "}
          <span class="ui">Review deployments</span>. Select{" "}
          <span class="ui">production</span>. Click{" "}
          <span class="ui">Approve and deploy</span>.
        </p>
      </>
    ),
    unknownCheck("Re-enable branch protection."),
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
        Put JIRA issues into a release.{" "}
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
          <p>
            Note that release version number can be learned from the GitHub
            Release to Live workflow run by clicking job{" "}
            <span class="ui">Deploy to Live</span> -{" "}
            <span class="ui">Deploy</span>, expanding{" "}
            <span class="ui">Tag release</span>, and observing the same of the
            new tag.
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
