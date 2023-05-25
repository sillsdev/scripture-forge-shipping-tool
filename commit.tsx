/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getLinkForPullRequest } from "./github.ts";
import { getJiraIssueInfo } from "./jira.ts";
import { getLinkForJiraIssue } from "./jira.ts";

export type CommitMessageResult = {
  message: string;
  linkedPRNumbers: string[];
  linkedIssueKeys: string[];
  element: JSX.Element;
};

export async function processCommitMessage(
  message: string,
): Promise<CommitMessageResult> {
  const parts = message.split(/((?:SF-[0-9]+)|(?:\(#[0-9]+\)))/);
  const result = [];

  const linkedPRNumbers: string[] = [];
  const linkedIssueKeys: string[] = [];

  for (const part of parts) {
    if (part === "") {
      continue;
    }
    if (part.match(/SF-[0-9]+/)) {
      linkedIssueKeys.push(part);
      result.push(
        <a href={getLinkForJiraIssue(part)} target="_blank">
          {part}
        </a>,
      );
    } else if (part.match(/\(#[0-9]+\)/)) {
      const prNumber: string = part.match(/[0-9]+/)?.[0]!;
      linkedPRNumbers.push(prNumber);
      result.push(
        <>
          (<a
            href={getLinkForPullRequest(prNumber)}
            target="_blank"
          >
            {"#" + prNumber}
          </a>)
        </>,
      );
    } else {
      result.push(<>{part}</>);
    }
  }
  const issueKey = message.match(/SF-[0-9]+/)?.[0];
  let issueInfo = undefined;
  if (issueKey) {
    issueInfo = await getJiraIssueInfo(issueKey);
  }
  const element: JSX.Element = (
    <>
      {issueInfo ? <img src={issueInfo.iconUrl} alt={issueInfo.key} /> : ""}
      <span>
        {issueInfo ? `${issueInfo.summary} (${issueInfo.resolution})` : ""}
      </span>
      <pre>{result}</pre>
    </>
  );

  return {
    message,
    linkedPRNumbers,
    linkedIssueKeys,
    element,
  };
}
