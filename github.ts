// @deno-types="npm:@octokit/types@9.2.3"
import { Octokit } from "npm:@octokit/core@4.2.1";
import { repoInfo } from "./globals.ts";

const githubToken = Deno.env.get("GITHUB_AUTH_TOKEN");

const octokit = new Octokit({ auth: githubToken });

export async function getCommit(commitUrl: string): Promise<any> {
  const response = await octokit.request(commitUrl);
  return response.data;
}

export async function getComparison() {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/compare/{base}...{head}",
    {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      base: repoInfo.base,
      head: repoInfo.head,
    }
  );
  return response.data;
}

export function getLinkForPullRequest(pullRequest: string): string {
  return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${pullRequest}`;
}
