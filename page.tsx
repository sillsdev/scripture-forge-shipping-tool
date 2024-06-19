/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getLinkForJiraIssue, searchLinkForIssueKeys } from "./jira.ts";
import { getComparison } from "./github.ts";
import { getCommitsAndIssueData } from "./commit.tsx";
import { getAllChecks } from "./checks.tsx";

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

  const commitMessages = comparison.commits.reverse().map((commit) =>
    commit.commit.message
  );
  const { commits, issues } = await getCommitsAndIssueData(commitMessages);

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

  const title = `Comparison between ${base} and ${head}`;

  return page(
    title,
    <Fragment>
      <h1>{title}</h1>
      <h2>Shipability checks</h2>
      {await getAllChecks(comparison, base, head)}
      <h2>Issues ({issueKeys.length})</h2>
      <p>
        <a href={searchLinkForIssueKeys(issueKeys)} target="_blank">
          Open issues in Jira
        </a>
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
