import { loadConfig } from "./config";
import { Search } from "./runSearch";
import { searchTerms } from "./searchData";
import { DB } from "./db/DB";
import { PageFetch } from "./pageFetch";
import { ResumeJobClassifier } from "./llm";

async function main() {
  const config = loadConfig();
  const db = new DB();
  const s = new Search(config, db);
  const pf = new PageFetch(db);
  const rjc = new ResumeJobClassifier(db)

  // // Google search - writes results to db
  // await s.getResults(searchTerms);

  // Visit each site, pull the site content and write to db
  // await pf.getPageData();

  // Reset tags
  // pf.resetTags()

  // Grade fit
  rjc.gradeFit()
}

main();