// @deno-types="npm:@octokit/types@9.2.3"
import { Octokit } from "npm:@octokit/core@4.2.1";
import { repoInfo } from "./globals.ts";
import { Octokit as OctokitRest } from "npm:@octokit/rest@21.1.1";
import type { RestEndpointMethodTypes } from "npm:@octokit/rest@21.1.1";

export interface GitHubPullRequest {
  number: number;
  link: string;
}

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
      note?: string;
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
  const [response, allNotes] = await Promise.all([
    (await octokit.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        base: base,
        head: head,
      }
    )) as Promise<{ data: Comparison }>,
    getAllNotes(),
  ]);

  for (const commit of response.data.commits) {
    const note = allNotes.get(commit.sha);
    if (note != null) {
      commit.commit.note = note;
    }
  }

  return response.data;
}

export async function getAllNotes(): Promise<Map<string, string>> {
  // Notes is like a branch, where every file is named with the commit SHA it pertains to, and the contents are the note.
  // https://api.github.com/repos/sillsdev/web-xforge/git/trees/refs/notes/commits

  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{branch}",
    {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      branch: "refs/notes/commits",
    }
  );

  const notes = new Map<string, string>();
  for (const note of response.data.tree) {
    const noteResponse = await octokit.request(note.url);
    const content = atob(noteResponse.data.content);
    notes.set(note.path, content);
  }
  return notes;
}

export function getLinkForPullRequest(
  pullRequestNumber: string,
  owner: string = repoInfo.owner,
  repo: string = repoInfo.repo
): string {
  return `https://github.com/${owner}/${repo}/pull/${pullRequestNumber}`;
}

/** Inspects information regarding a particular repository. */
class GitHubInspector {
  patHelp: string;

  constructor(
    private octokit: OctokitRest,
    private repoOwner: string,
    private repoName: string
  ) {
    this.patHelp = `Does your GitHub fine-grained personal access token have read-only permission to ${this.repoOwner}/${this.repoName} for Contents and Pull Requests?`;
  }

  async recentOpenPullRequests(): Promise<GitHubPullRequest[]> {
    try {
      const openPRs = await this.openPullRequests();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentPRs = openPRs.filter(
        (pr: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]) => {
          const createdAt = new Date(pr.created_at);
          return createdAt >= oneMonthAgo;
        }
      );

      return recentPRs.map(
        (pr: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]) => ({
          number: pr.number,
          link: getLinkForPullRequest(pr.number.toString()),
        })
      );
    } catch (error) {
      console.error(`Error querying PRs. ${this.patHelp}`, error);
      throw error;
    }
  }

  async recentFileChanges(filePath: string): Promise<boolean> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const since = oneMonthAgo.toISOString();

    try {
      const response: RestEndpointMethodTypes["repos"]["listCommits"]["response"] =
        await this.octokit.rest.repos.listCommits({
          owner: this.repoOwner,
          repo: this.repoName,
          path: filePath,
          since: since,
        });

      return response.data.length > 0;
    } catch (error) {
      console.error(
        `Error checking commit history for ${filePath}. ${this.patHelp}`,
        error
      );
      throw error;
    }
  }

  private async openPullRequests(): Promise<
    RestEndpointMethodTypes["pulls"]["list"]["response"]["data"]
  > {
    const response = await this.octokit.rest.pulls.list({
      owner: this.repoOwner,
      repo: this.repoName,
      state: "open",
    });
    return response.data;
  }
}

export const auth0GitHubInspector: GitHubInspector = new GitHubInspector(
  new OctokitRest({ auth: githubToken }),
  repoInfo.owner,
  "auth0-configs"
);
