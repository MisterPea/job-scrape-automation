
type Pagemap = {
  cse_thumbnail?: any[],
  metatags: any[],
  cse_image?: any[];
};

export interface SearchResult {
  kind: string,
  title: string,
  htmlTitle: string,
  link: string,
  displayLink: string,
  snippet: string,
  htmlSnippet: string,
  formattedUrl: string,
  htmlFormattedUrl: string,
  pagemap?: Pagemap;
}

export interface SanitizedSearchResult {
  title: string,
  link: string,
  snippet: string,
}