
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
  snippet?: string,
}

export type ChunkMatch = {
  jobIndex: number;
  resumeIndex: number;
  similarity: number;
};

/* LRM Deep Comparison Output */
type softwareAttributes = {
  languages: string[];
  frameworks: string[];
  tools: string[];
  platforms: string[];
};

type skillsAttributes = {
  technical: string[];
  process: string[];
  other: string[];
};

type GapsAndOverlaps = {
  software: softwareAttributes;
  skills: skillsAttributes;
};

export interface DeepCompareOutput {
  fit_score: number;
  fit_label: "strong" | "medium" | "weak";
  overlap: GapsAndOverlaps;
  gaps: GapsAndOverlaps;

}