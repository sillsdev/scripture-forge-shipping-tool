const email = Deno.env.get("TESTLODGE_USER_EMAIL");
const testLodgeToken = Deno.env.get("TESTLODGE_AUTH_TOKEN");

type TestLodgeTestRunInfo = {
  sfVersion: string;
  passed_number: number;
  skipped_number: number;
  failed_number: number;
  incomplete_number: number;
};

async function getTestLodgeRuns() {
  const url =
    "https://api.testlodge.com/v1/account/11041/projects/41748/runs.json";
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${email}:${testLodgeToken}`)}`,
    },
  });
  const json = await response.json();
  return json;
}

export async function getTestLodgeTestRunInfo(): Promise<TestLodgeTestRunInfo> {
  const runs = (await getTestLodgeRuns()).runs;
  const latestRun = runs[0];
  // as of the current time of writing, the BVTs are split across two runs
  const allRunsAtLatestVersion = runs.filter(
    (run: any) => run.name === latestRun.name
  );
  const info: TestLodgeTestRunInfo = {
    sfVersion: latestRun.name,
    passed_number: 0,
    skipped_number: 0,
    failed_number: 0,
    incomplete_number: 0,
  };
  for (const run of allRunsAtLatestVersion) {
    info.passed_number += run.passed_number;
    info.skipped_number += run.skipped_number;
    info.failed_number += run.failed_number;
    info.incomplete_number += run.incomplete_number;
  }
  return info;
}
