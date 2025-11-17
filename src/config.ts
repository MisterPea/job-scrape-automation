import "dotenv/config";

export type AppConfig = {
  searchApiKey: string;
  searchIdCx: string;
  timePeriod: string;
  sortBy: string;
};

export function loadConfig(): AppConfig {
  if (!process.env.SEARCH_API_KEY) throw new Error("SEARCH_API_KEY is required");
  if (!process.env.SEARCH_ID_CX) throw new Error("SEARCH_ID_CX is required");

  return {
    searchApiKey: process.env.SEARCH_API_KEY,
    searchIdCx: process.env.SEARCH_ID_CX,
    timePeriod: 'd1',
    sortBy:'date',
  };
}