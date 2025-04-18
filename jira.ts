const root = "https://jira.sil.org";
const apiRoot = `${root}/rest/api/2`;

const jiraPersonalAccessToken = Deno.env.get("JIRA_ACCESS_TOKEN");

if (jiraPersonalAccessToken == null) {
  console.warn("JIRA_ACCESS_TOKEN not set, Jira functions will not work");
}

export function getLinkForJiraIssue(issueKey: string): string {
  return `${root}/browse/${issueKey}`;
}

export type JiraIssueInfo = {
  key: string;
  summary: string;
  iconUrl: string;
  resolution: string;
  status: string;
};

export async function getJiraIssueInfos(
  keys: string[]
): Promise<JiraIssueInfo[]> {
  if (keys.length === 0) {
    // Jira API doesn't like empty searches
    return Promise.resolve([]);
  }
  const searchUrl = `${apiRoot}/search?jql=${encodedJiraIssueSearch(
    keys
  )}&fields=summary,issuetype,resolution,status`;
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${jiraPersonalAccessToken}` },
  });
  const json = await response.json();
  return json.issues.map((issue: any) => ({
    key: issue.key,
    summary: issue.fields.summary,
    iconUrl: issue.fields.issuetype.iconUrl,
    resolution: issue.fields.resolution?.name ?? "Unresolved",
    status: issue.fields.status.name,
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
