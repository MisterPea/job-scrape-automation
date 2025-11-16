import { loadConfig } from "./config";
import { Search } from "./runSearch";
// import runSearch from "./runSearch"; 
import { searchTerms } from "./searchData";

async function main() {
  const config = loadConfig();
  const s = new Search(config);
  s.getResults(searchTerms)
}

main();