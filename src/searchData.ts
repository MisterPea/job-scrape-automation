export type TitleGroup = {
  id: string;
  baseTitle: string;     // used in q=
  variants: string[];    // used in as_oq
};

export const TITLE_GROUPS: TitleGroup[] = [
  {
    id: "react_frontend",
    baseTitle: "React Developer",
    variants: [
      "React.js",
      "Next.js",
      "Frontend Engineer",
      "Frontend Developer",
      "Front-End Developer",
      "Front End Developer",
      "JavaScript Engineer",
      "TypeScript Engineer",
    ],
  },
  {
    id: "general_frontend",
    baseTitle: "Frontend Engineer",
    variants: [
      "Frontend Developer",
      "Web Engineer",
      "Web Developer",
      "Web Designer",
      "JavaScript Engineer",
      "TypeScript Engineer",
    ],
  },
  {
    id: "ui_ux_engineer",
    baseTitle: "UI Developer",
    variants: [
      "UX Engineer",
      "Frontend Engineer",
      "Front-End Developer",
      "Frontend Developer",
    ],
  },
];
