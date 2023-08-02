const root = "https://jira.sil.org";
const apiRoot = `${root}/rest/api/2`;

export function getLinkForJiraIssue(issueKey: string): string {
  return `${root}/browse/${issueKey}`;
}

export type JiraIssueInfo = {
  key: string;
  summary: string;
  iconUrl: string;
  resolution: string;
};

export async function getJiraIssueInfos(
  keys: string[]
): Promise<JiraIssueInfo[]> {
  const searchUrl = `${apiRoot}/search?jql=${encodedJiraIssueSearch(
    keys
  )}&fields=summary,issuetype,resolution`;
  const response = await fetch(searchUrl);
  const json = await response.json();
  return json.issues.map((issue: any) => ({
    key: issue.key,
    summary: issue.fields.summary,
    iconUrl: issue.fields.issuetype.iconUrl,
    resolution: issue.fields.resolution?.name ?? "Unresolved",
  }));
}

export function searchLinkForIssueKeys(keys: string[]): string {
  const encodedSearch = encodedJiraIssueSearch(keys);
  return `${root}/issues/?jql=${encodedSearch}`;
}

function encodedJiraIssueSearch(keys: string[]): string {
  const search = `key in (${keys.join(",")})`;
  return encodeURIComponent(search);
}
