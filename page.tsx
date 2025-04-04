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
  content: JSX.Element
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
  head: string
): Promise<JSX.Element> {
  const comparison = await getComparison(base, head);

  const commitMessages = comparison.commits
    .reverse()
    .map(
      (commit) =>
        commit.commit.message +
        (commit.commit.note
          ? "\n\n--- Git Notes ---\n\n" + commit.commit.note
          : "")
    );
  const { commits, issues }: CommitsAndIssues = await getCommitsAndIssueData(
    commitMessages
  );

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

  const comparisonDescription = `Comparison between ${base} and ${head}.`;
  const title = "Scripture Forge Release Procedure";
  const jiraIssuesInRangeUrl = searchLinkForIssueKeys(issueKeys);

  return page(
    title,
    <Fragment>
      <h1>{title}</h1>
      <p>{comparisonDescription}</p>
      <h2>Determining releasability</h2>
      {await getDeterminationChecks(
        comparison,
        base,
        head,
        jiraIssuesInRangeUrl,
        issues
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
    </Fragment>
  );
}
