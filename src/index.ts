import { loadConfig } from "./config";
import { Search } from "./runSearch";
// import runSearch from "./runSearch"; 
import { searchTerms } from "./searchData";
import { DB } from "./db/DB";
import { PageFetch } from "./pageFetch";

async function main() {
  const config = loadConfig();
  const db = new DB();
  const s = new Search(config, db);
  const pf = new PageFetch(db);

  // // Google search - writes results to db
  await s.getResults(searchTerms);

  // Visit each site, pull the site content and write to db
  const res = await pf.getPageData();

  // Reset tags
  // pf.resetTags()

}

main();