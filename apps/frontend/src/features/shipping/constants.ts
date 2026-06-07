export type Country = { code: string; name: string; region: string };

export const ALL_COUNTRIES: Country[] = [
  // Asia
  { code: "MV", name: "Maldives", region: "Asia" },
  { code: "SG", name: "Singapore", region: "Asia" },
  { code: "MY", name: "Malaysia", region: "Asia" },
  { code: "TH", name: "Thailand", region: "Asia" },
  { code: "IN", name: "India", region: "Asia" },
  { code: "LK", name: "Sri Lanka", region: "Asia" },
  { code: "PH", name: "Philippines", region: "Asia" },
  { code: "ID", name: "Indonesia", region: "Asia" },
  { code: "VN", name: "Vietnam", region: "Asia" },
  { code: "JP", name: "Japan", region: "Asia" },
  { code: "KR", name: "South Korea", region: "Asia" },
  { code: "CN", name: "China", region: "Asia" },
  // Middle East
  { code: "AE", name: "UAE", region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East" },
  { code: "QA", name: "Qatar", region: "Middle East" },
  { code: "KW", name: "Kuwait", region: "Middle East" },
  { code: "BH", name: "Bahrain", region: "Middle East" },
  // Europe
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "SE", name: "Sweden", region: "Europe" },
  { code: "NO", name: "Norway", region: "Europe" },
  // Americas
  { code: "US", name: "United States", region: "Americas" },
  { code: "CA", name: "Canada", region: "Americas" },
  { code: "MX", name: "Mexico", region: "Americas" },
  { code: "BR", name: "Brazil", region: "Americas" },
  { code: "AR", name: "Argentina", region: "Americas" },
  // Oceania
  { code: "AU", name: "Australia", region: "Oceania" },
  { code: "NZ", name: "New Zealand", region: "Oceania" },
  { code: "FJ", name: "Fiji", region: "Oceania" },
];

export const REGIONS = ["Asia", "Middle East", "Europe", "Americas", "Oceania"];
