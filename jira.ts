const root = "https://jira.sil.org";

export function getLinkForJiraIssue(issueKey: string): string {
  return `${root}/browse/${issueKey}`;
}

type JiraIssueInfo = {
  key: string;
  summary: string;
  iconUrl: string;
  resolution: string;
};

export async function getJiraIssueInfo(key: string): Promise<JiraIssueInfo> {
  const response = await fetch(`${root}/rest/api/2/issue/${key}`);
  const json = await response.json();
  return {
    key,
    summary: json.fields.summary,
    iconUrl: json.fields.issuetype.iconUrl,
    resolution: json.fields.resolution?.name ?? "Unresolved",
  };
}

export function searchLinkForIssueKeys(keys: string[]): string {
  const search = `key in (${keys.join(",")})`;
  const encodedSearch = encodeURIComponent(search);
  return `${root}/issues/?jql=${encodedSearch}`;
}
