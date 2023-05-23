/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h, renderToString } from "https://deno.land/x/jsx/mod.ts";

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// @deno-types="npm:@octokit/types@9.2.3"
import { Octokit } from "npm:@octokit/core@4.2.1";

const octokit = new Octokit({
  auth: "", // replace with GitHub personal access token
});

const base = "sf-live";
const head = "sf-qa";

function getLinkForJiraIssue(issueKey: string): string {
  return `https://jira.sil.org/browse/${issueKey}`;
}

function getLinkForPullRequest(pullRequest: string): string {
  return `https://github.com/sillsdev/web-xforge/pull/${pullRequest}`;
}

async function getJiraIssueIconUrl(key: string): Promise<string> {
  const response = await fetch(
    `https://jira.sil.org/rest/api/2/issue/${key}`,
    {
      headers: {},
    },
  );
  const json = await response.json();
  return json.fields.issuetype.iconUrl;
}

async function getCommit(commitUrl: string): Promise<any> {
  return await octokit.request(commitUrl);
}

async function getComparisonSummary(): Promise<any> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/compare/{base}...{head}",
    {
      owner: "sillsdev",
      repo: "web-xforge",
      base,
      head,
    },
  );

  const commits = (response.data.commits as object[]).reverse()
    .map(async (commit: any) => {
      const message: string = commit.commit.message;
      const parts = message.split(/((?:SF-[0-9]+)|(?:\(#[0-9]+\)))/);
      const result = [];

      for (const part of parts) {
        if (part === "") {
          continue;
        }
        if (part.match(/SF-[0-9]+/)) {
          result.push(
            <a href={getLinkForJiraIssue(part)} target="_blank">{part}</a>,
          );
        } else if (part.match(/\(#[0-9]+\)/)) {
          result.push(
            <a
              href={getLinkForPullRequest(part.match(/[0-9]+/)?.[0]!)}
              target="_blank"
            >
              {part}
            </a>,
          );
        } else {
          result.push(<span>{part}</span>);
        }
      }
      const issueKey = message.match(/SF-[0-9]+/)?.[0];
      if (issueKey) {
        result.unshift(
          <img
            src={await getJiraIssueIconUrl(issueKey)}
            alt="Jira issue icon"
          />,
        );
      }
      return <pre>{result}</pre>;
    });

  let migration = false;
  await Promise.all(response.data.commits.map(async (commit) => {
    const response = await getCommit(commit.url);
    if (
      response.data.commit.message.match(
        /migrate/i ||
          response.data.files.some((file) => file.filename.match(/migrate/i)),
      )
    ) {
      migration = true;
    }
  }));

  const success = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="48"
      viewBox="0 -960 960 960"
      width="48"
    >
      <path d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z" />
    </svg>
  );

  const warning = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="48"
      viewBox="0 -960 960 960"
      width="48"
    >
      <path d="m40-120 440-760 440 760H40Zm104-60h672L480-760 144-180Zm340.175-57q12.825 0 21.325-8.675 8.5-8.676 8.5-21.5 0-12.825-8.675-21.325-8.676-8.5-21.5-8.5-12.825 0-21.325 8.675-8.5 8.676-8.5 21.5 0 12.825 8.675 21.325 8.676 8.5 21.5 8.5ZM454-348h60v-224h-60v224Zm26-122Z" />
    </svg>
  );

  const unknown = <input type="checkbox" />;

  return page(
    <Fragment>
      <h1>Comparison between {head} and {base}</h1>
      <h2>Shipability checks</h2>
      <ul>
        <li>
          {migration ? warning : success}
          Migrations:{" "}
          {migration
            ? "Likely"
            : `None detected (no commit message or file matched /migrate/i)`}
        </li>
        <li>
          {response.data.status === "behind" ? success : warning}
          Is fast-forward: {response.data.status === "behind" ? "No" : "Yes"},
          {" "}
          {response.data.status} (ahead by{"  "}
          {response.data.ahead_by}, behind by {response.data.behind_by})
        </li>
        <li>{unknown} Build verification tests passing</li>
        <li>
          {unknown}{" "}
          No significant new issues found by testers (check test results log)
        </li>
        <li>
          {unknown}{" "}
          Jira release created & issues added to it (bulk edit is useful for
          copying issues from a QA release)
        </li>
        <li>{unknown} Issues in release have testing completed</li>
        <li>
          {unknown}{" "}
          Build counter in TeamCity updated and counter reset to 0 (if planning
          a major or minor release)
        </li>
      </ul>
      <h2>Commits ({commits.length})</h2>
      {await Promise.all(commits)}
    </Fragment>,
  );
}

function getCss(): Promise<string> {
  // load css from styles.css
  return Deno.readTextFile("styles.css");
}

async function page(content: any): Promise<any> {
  return (
    <html>
      <head>
        <title>Comparison between {head} and {base}</title>
        <style dangerouslySetInnerHTML={{ __html: await getCss() }}>
        </style>
      </head>
      <body>
        {content}
      </body>
    </html>
  );
}

serve(async (req: Request) => {
  const html = await renderToString(await getComparisonSummary());
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
});
