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

export function getLinkForPullRequest(pullRequest: string): string {
  return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${pullRequest}`;
}
