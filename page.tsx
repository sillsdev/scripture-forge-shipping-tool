/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { success, warning } from "./icons.tsx";
import { getTestLodgeTestRunInfo } from "./testlodge.ts";
import { getLinkForJiraIssue, searchLinkForIssueKeys } from "./jira.ts";
import { getComparison } from "./github.ts";
import { processCommitMessage } from "./commit.tsx";
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

  const commitsData = await Promise.all(
    (comparison.commits as object[])
      .reverse()
      .map((commit: any) => processCommitMessage(commit.commit.message)),
  );

  const issueKeys = commitsData.map((commit) => commit.linkedIssueKeys).flat();

  const testLodgeInfo = await getTestLodgeTestRunInfo();
  const testLodgeRunSuccess = testLodgeInfo.failed_number === 0 &&
    testLodgeInfo.skipped_number === 0 &&
    testLodgeInfo.incomplete_number === 0;

  const title = `Comparison between ${base} and ${head}`;

  return page(
    title,
    <Fragment>
      <h1>{title}</h1>
      <h2>Shipability checks</h2>
      {await getAllChecks(comparison)}
      <h2>Test summary</h2>
      <p>
        Description: {testLodgeInfo.sfVersion}
        <br />
        Passed: {testLodgeInfo.passed_number}
        <br />
        Skipped: {testLodgeInfo.skipped_number}
        <br />
        Failed: {testLodgeInfo.failed_number}
        <br />
        Incomplete: {testLodgeInfo.incomplete_number}
        <br />
        Success: {testLodgeRunSuccess ? success : warning}
      </p>
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
              </a>
            </li>
          ))}
        </ul>
      </p>
      <h2>Commits ({commitsData.length})</h2>
      {commitsData.map((c) => c.element)}
    </Fragment>,
  );
}
