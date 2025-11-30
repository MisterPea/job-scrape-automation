export type TitleGroup = {
  id: string;
  baseTitle: string;     // used in q=
  variants: string[];    // used in as_oq
};

export const TITLE_GROUPS: TitleGroup[] = [
  {
    id: "react_frontend",
    baseTitle: "React Engineer",
    variants: [
      "React Developer",
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
      "JavaScript Engineer",
      "TypeScript Engineer",
    ],
  },
  {
    id: "ui_ux_engineer",
    baseTitle: "UI Engineer",
    variants: [
      "UX Engineer",
      "Frontend Engineer",
      "Front-End Developer",
      "Frontend Developer",
    ],
  },
];


// Not used endpoints:
// *.com/*/jobs*
// *.com/*/careers*