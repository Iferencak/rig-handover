// Plan morning-digest § 1. The contract every part of § 2 builds against.
export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the log's offset (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log; views render it as —
  runs: number; // lines for this job, every status
  retries: number; // lines with status retry
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  counts: Record<RunStatus, number>; // log lines per status
  badLines: number; // lines that did not parse, counted, never thrown
};

// null when runs/<night>.jsonl does not exist (routes answer 404).
export type ReadNight = (runsDir: string, night: string) => Night | null;
