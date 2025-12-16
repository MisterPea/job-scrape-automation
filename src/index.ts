import { loadConfig } from "./config";
import { Search } from "./runSearch";
import { TITLE_GROUPS } from "./searchData";
import { DB } from "./db/DB";
import { JobDataRetrieval } from './runJobDataRetrieval';
import { ResumeJobClassifier } from "./runGrading";
import { resumeText } from "./data/resumeText";
import { ReasoningModel } from './reasoningModelTasking';

async function main() {
  const config = loadConfig();
  const db = new DB();
  const s = new Search(config, db);
  const jdr = new JobDataRetrieval(db);
  const rjc = new ResumeJobClassifier(db);
  const rm = new ReasoningModel(db);

  // Google search - writes results to db
  await s.getResults(TITLE_GROUPS);

  // Visit each site, pull the site content and write to db
  await jdr.retrieveJob();
  // await pf.getPageData();

  // Grade fit
  await rjc.gradeFit();
  // await rjc.checkForCandidates()

  // Look at jobs that are better than a coin flip
  rm.deepCompareJobResumeText();
}

async function embedResume() {
  const db = new DB();
  const rjc = new ResumeJobClassifier(db);
  const rm = new ReasoningModel(db);
  await rjc.embedResume(resumeText.resumeChunk);
  await rm.createResumeSummary();
}

async function resetGrade() {
  const db = new DB();
  await db.setData(`
    UPDATE parsed_jobs
    SET is_graded_whole='not_graded', is_graded_summary='not_graded' `, []);
}

async function resetDeepCompare() {
  const db = new DB();
  await db.setData(`
    UPDATE candidate_jobs
    SET deep_comparison = 'pending'`, []);
}

async function resetRunningDiscoverdJobs() {
  const db = new DB();
  await db.setData(`
    UPDATE discovered_jobs
    SET parse_status='pending'
    WHERE parse_status='not_parsed' OR parse_status='running'
    `, []);
}

async function reRunStalledGrading() {
  const db = new DB();
  const rjc = new ResumeJobClassifier(db);
  await db.setData(`
      UPDATE parsed_jobs
      SET is_graded = 'not_graded'
      WHERE is_graded = 'in_progress'
      `, []);
  await rjc.gradeFit();
}

async function eraseDiscoveredJobs() {
  const db = new DB();
  await db.setData(`
    DROP TABLE discovered_jobs`, []);
  console.log('discovered_jobs deleted');
}
async function eraseCandidateJobs() {
  const db = new DB();
  await db.setData(`
    DROP TABLE candidate_jobs`, []);
  console.log('candidate_jobs deleted');
}
async function resetFailedDiscovered() {
  const db = new DB();
  await db.setData(`
    UPDATE discovered_jobs
    SET parse_status='pending'
    WHERE parse_status='failed'`, []);
  console.log('failed jobs reset');
}

// eraseCandidateJobs()
// eraseDiscoveredJobs();
// reRunStalledGrading();
// resetGrade();
// embedResume()
// resetRunningDiscoverdJobs()
// resetDeepCompare()

/* Run the main processes - Search, Visit, Grade, Deep Compare (if needed) */
main();

/* Reset failed jobs on discovered_jobs table */
// resetFailedDiscovered();

// testFrame()