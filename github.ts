// @deno-types="npm:@octokit/types@9.2.3"
import { Octokit } from "npm:@octokit/core@4.2.1";
import { repoInfo } from "./globals.ts";

const githubToken = Deno.env.get("GITHUB_AUTH_TOKEN");

if (githubToken == null) {
  console.warn(
    "GITHUB_AUTH_TOKEN not set, GitHub functions will be more strictly rate limited."
  );
}

const octokit = new Octokit({ auth: githubToken });

export type Commit = {
  sha: string;
  commit: {
    message: string;
  };
  html_url: string;
  files: {
    filename: string;
  }[];
};

export async function getCommit(commitUrl: string): Promise<Commit> {
  const response = await octokit.request(commitUrl);
  return response.data;
}

export type Comparison = {
  status: string;
  ahead_by: number;
  behind_by: number;
  commits: {
    sha: string;
    html_url: string;
    url: string;
    commit: {
      message: string;
    };
  }[];
  files: {
    filename: string;
  };
};

export async function getComparison(
  base: string,
  head: string
): Promise<Comparison> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/compare/{base}...{head}",
    {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      base: base,
      head: head,
    }
  );
  return response.data;
}

export function getLinkForPullRequest(pullRequest: string): string {
  return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${pullRequest}`;
}
