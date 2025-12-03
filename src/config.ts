import "dotenv/config";
import { Language, SearchCountry } from "./types";

export type AppConfig = {
  searchApiKey: string;
  siteSearchIdCx: string;
  timePeriod: string;
  sortBy: string;
  language: Language;
  searchCountry: SearchCountry;
  blockList: string[];
};

export function loadConfig(): AppConfig {
  if (!process.env.SEARCH_API_KEY) throw new Error("SEARCH_API_KEY is required");
  if (!process.env.SITE_SEARCH_ID_CX) throw new Error("SITE_SEARCH_ID_CX is required");

  const blockList = [
    'facebook.com/groups',
    'careers.cognizant.com'
  ];

  return {
    searchApiKey: process.env.SEARCH_API_KEY,
    siteSearchIdCx: process.env.SITE_SEARCH_ID_CX,
    timePeriod: 'd1',
    sortBy: 'date',
    language: 'lang_en',
    searchCountry: 'us',
    blockList,
  };
}