/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "https://deno.land/x/jsx@v0.1.5/mod.ts";
import { getLinkForPullRequest } from "./github.ts";
import { getJiraIssueInfos, JiraIssueInfo } from "./jira.ts";
import { getLinkForJiraIssue } from "./jira.ts";

export type CommitsAndIssues = {
  commits: CommitMessageResult[];
  issues: JiraIssueInfo[];
};

export type CommitMessageResult = {
  message: string;
  linkedPRNumbers: string[];
  linkedIssueKeys: string[];
  element: JSX.Element;
};

async function getJiraIssueInfosFromCommitMessages(
  messages: string[],
): Promise<JiraIssueInfo[]> {
  const issueKeys = new Set<string>();
  for (const message of messages) {
    for (const issueKey of message.match(/SF-[0-9]+/g) ?? []) {
      issueKeys.add(issueKey);
    }
  }
  return await getJiraIssueInfos(Array.from(issueKeys));
}

export async function getCommitsAndIssueData(
  messages: string[],
): Promise<CommitsAndIssues> {
  const jiraIssueInfos = await getJiraIssueInfosFromCommitMessages(messages);

  const commitResults: CommitMessageResult[] = [];
  for (const message of messages) {
    const issueKey = message.match(/SF-[0-9]+/)?.[0];
    const jiraIssueInfo = jiraIssueInfos.find((info) => info.key === issueKey);
    const result = await getCommitData(message, jiraIssueInfo);
    commitResults.push(result);
  }
  return {
    commits: commitResults,
    issues: jiraIssueInfos,
  };
}

function getCommitData(
  message: string,
  issueInfo: JiraIssueInfo | undefined,
): CommitMessageResult {
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
