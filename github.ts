// @deno-types="npm:@octokit/types@9.2.3"
import { Octokit } from "npm:@octokit/core@4.2.1";
import { repoInfo } from "./globals.ts";

const githubToken = Deno.env.get("GITHUB_AUTH_TOKEN");

const octokit = new Octokit({ auth: githubToken });

export type Commit = {
  sha: string;
  commit: {
    message: string;
  };
  files: { filename: string }[];
};

export async function getCommit(commitUrl: string): Promise<{ data: Commit }> {
  const response = await octokit.request(commitUrl);
  return response.data;
}

export async function getComparison(base: string, head: string) {
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
