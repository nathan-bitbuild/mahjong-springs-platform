import areasJson from "../../content/areas.json";

export type AreaFaq = { q: string; a: string };

export type Area = {
  key: string;
  slug: string;
  short_title: string;
  eyebrow: string;
  kicker: string;
  cities: string[];
  h1: string;
  hero_intro: string;
  seo_title: string;
  seo_description: string;
  card_summary: string;
  lead_heading: string;
  intro_paragraphs: string[];
  drive_heading: string;
  drive_body: string;
  local_paragraphs: string[];
  faq: AreaFaq[];
};

export const AREAS = areasJson as Record<string, Area>;

export const AREA_LIST = Object.values(AREAS);

export function areaBySlug(slug: string): Area | undefined {
  return AREA_LIST.find((area) => area.slug === slug);
}

export const SERVED_CITIES = [
  "Saratoga Springs",
  "Lehi",
  "American Fork",
  "Eagle Mountain",
  "Cedar Fort",
  "Draper",
  "Bluffdale",
  "Highland",
  "Alpine",
  "Pleasant Grove",
  "Vineyard",
  "Orem",
  "Lindon",
  "Provo",
  "Springville",
  "Mapleton",
  "Spanish Fork",
  "Salem",
  "Payson",
  "Santaquin",
];
