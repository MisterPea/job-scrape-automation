import { loadConfig } from "./config";
import { Search } from "./runSearch";
import { searchTerms } from "./searchData";
import { DB } from "./db/DB";
import { PageFetch } from "./pageFetch";
import { ResumeJobClassifier } from "./grading";
import { resumeText } from "./data/resumeText";

async function main() {
  const config = loadConfig();
  const db = new DB();
  const s = new Search(config, db);
  const pf = new PageFetch(db);
  const rjc = new ResumeJobClassifier(db);

  // // Google search - writes results to db
  await s.getResults(searchTerms);

  // Visit each site, pull the site content and write to db
  await pf.getPageData();

  // Reset tags
  // pf.resetTags()

  // Grade fit
  rjc.gradeFit();
}

function embedResume() {
  const db = new DB();
  const rjc = new ResumeJobClassifier(db);
  rjc.embedResume(resumeText.resumeChunk);
}

async function resetGrade() {
  const db = new DB();
  await db.setData(`
    UPDATE parsed_jobs
    SET is_graded='not_graded' `, []);
}

async function reRunStalledGrading() {
  const db = new DB();
  const rjc = new ResumeJobClassifier(db);
  await db.setData(`
    UPDATE parsed_jobs
    SET is_graded='not_graded'
    WHERE is_graded='in_progress'
  `, []);
  await rjc.gradeFit()

}

// reRunStalledGrading()
// resetGrade()
// main();
// embedResume()