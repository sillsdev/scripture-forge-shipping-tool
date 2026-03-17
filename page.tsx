/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getLinkForJiraIssue, searchLinkForIssueKeys } from "./jira.ts";
import { getComparison } from "./github.ts";
import { CommitsAndIssues, getCommitsAndIssueData } from "./commit.tsx";
import {
  getDeterminationChecks,
  getPostProcessingSteps,
  getShipActions,
} from "./checks.tsx";

function getCss(): Promise<string> {
  // load css from styles.css
  return Deno.readTextFile("styles.css");
}

export async function page(
  title: string,
  content: JSX.Element,
): Promise<JSX.Element> {
  return (
    <html>
      <head>
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: await getCss() }}></style>
      </head>
      <body>{content}</body>
    </html>
  );
}

export async function getPage(
  base: string,
  head: string,
): Promise<JSX.Element> {
  const comparison = await getComparison(base, head);

  const commitMessages = comparison.commits
    .reverse()
    .map(
      (commit) =>
        commit.commit.message +
        (commit.commit.note
          ? "\n\n--- Git Notes ---\n\n" + commit.commit.note
          : ""),
    );
  const { commits, issues }: CommitsAndIssues =
    await getCommitsAndIssueData(commitMessages);

  const issueStatuses: { [key: string]: string } = {};
  for (const issue of issues) {
    issueStatuses[issue.key] = issue.resolution;
  }

  const issueKeys = issues.map((issue) => issue.key);

  const issuesByResolution: { [key: string]: string[] } = {};
  for (const issue of issues) {
    const resolution = issue.resolution ?? "Unresolved";
    if (issuesByResolution[resolution] === undefined) {
      issuesByResolution[resolution] = [];
    }
    issuesByResolution[resolution].push(issue.key);
  }

  const title = "Scripture Forge Release Procedure";
  const jiraIssuesInRangeUrl = searchLinkForIssueKeys(issueKeys);

  return page(
    title,
    <Fragment>
      <h1>{title}</h1>
      <p>
        Comparison between <span class="boundary-commit">{base}</span> and{" "}
        <span class="boundary-commit">{head}</span>.
      </p>
      <p>
        You can change comparison to compare from a Beginning commit to and
        Ending commit. For example, you might select a Beginning commit that is
        the last commit that was published, and an Ending commit that what you
        are considering publishing.
      </p>
      <p>
        <form onsubmit="window.location.assign('/compare/' + encodeURIComponent(this.base.value) + '/' + encodeURIComponent(this.head.value)); return false;">
          <label for="base">Beginning</label>
          <input
            id="base"
            name="base"
            value={base}
            required
            pattern="[-\\w.]+"
          />
          &nbsp;🡲&nbsp;
          <label for="head">Ending</label>
          <input
            id="head"
            name="head"
            value={head}
            required
            pattern="[-\\w.]+"
          />
          <button type="submit">Compare</button>
          <button
            type="button"
            onclick="this.form.base.value='sf-live'; this.form.head.value='sf-qa';"
          >
            Default
          </button>
        </form>
      </p>
      <h2>Determining releasability</h2>
      {await getDeterminationChecks(
        comparison,
        base,
        head,
        jiraIssuesInRangeUrl,
        issues,
      )}
      <h2>Ship</h2>
      {await getShipActions()}
      <h2>Post-processing</h2>
      {await getPostProcessingSteps(jiraIssuesInRangeUrl)}
      <h2>Issues ({issueKeys.length})</h2>
      <p>
        View{" "}
        <a href={jiraIssuesInRangeUrl} target="_blank">
          issues
        </a>{" "}
        in Jira.
        <ul>
          {issueKeys.map((issueKey) => (
            <li>
              <a href={getLinkForJiraIssue(issueKey)} target="_blank">
                {issueKey}
              </a>{" "}
              {issueStatuses[issueKey]}
            </li>
          ))}
        </ul>
        <h3>Issue status summary</h3>
        <ul>
          {Object.entries(issuesByResolution).map(([resolution, issueKeys]) => (
            <li>
              <a href={searchLinkForIssueKeys(issueKeys)} target="_blank">
                {resolution}: {issueKeys.length}
              </a>
            </li>
          ))}
        </ul>
      </p>
      <h2>Commits ({commits.length})</h2>
      {commits.map((c) => c.element)}
    </Fragment>,
  );
}
