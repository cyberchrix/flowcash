import { TransactionKind } from "./types";

export type DefaultKeyword = {
  pattern: string;
  categoryName: string;
  amountCents?: number | null;
  kind?: TransactionKind | null;
  needsReview?: boolean;
  priority?: number;
};

const FUEL_STATIONS = ["TOTAL", "SHELL", "Q8", "ESSO", "LUKOIL", "TEXACO", "AVIA", "GULF", "BP"];

function rules(
  patterns: string[],
  categoryName: string,
  extra: Omit<DefaultKeyword, "pattern" | "categoryName"> = {}
): DefaultKeyword[] {
  return patterns.map((pattern) => ({ pattern, categoryName, ...extra }));
}

export const DEFAULT_KEYWORDS: DefaultKeyword[] = [
  ...rules(
    ["LIDL", "ALDI", "LECLERC", "INTERMARCHE", "COLRUYT", "AUCHAN", "CARREFOUR", "MONOPRIX", "FRANPRIX", "PICARD", "BIOCOOP", "CORA", "CASINO", "SUPER U"],
    "Groceries"
  ),
  ...rules(
    ["MCDONALD", "MCDONALDS", "BURGER KING", "QUICK", "KFC", "SUBWAY", "PIZZA", "PIZZA HUT", "DOMINO", "DOMINOS", "RESTAURANT", "BRASSERIE", "MC DONALD", "OTACOS", "FRITERIE", "NEWREST", "EXKI", "STARBUCKS", "KEBAB", "SUSHI", "UBER EATS", "DELIVEROO", "JUST EAT", "AU BUREAU", "FLUNCH", "PITAYA", "PANOS"],
    "Restaurants"
  ),
  ...rules(
    [...FUEL_STATIONS, "CARBURANT", "ESSENCE", "DIESEL", "GASOIL", "GAZOLE", "FUEL", "SANS PLOMB", "SP95", "SP98"],
    "Fuel"
  ),
  ...FUEL_STATIONS.flatMap((pattern) => [
    { pattern, categoryName: "Tobacco", amountCents: -1130 },
    { pattern, categoryName: "Tobacco", amountCents: 1130 },
  ]),
  ...rules(["SNCF", "RATP", "NAVIGO", "UBER", "BOLT", "TAXI", "PARKING", "AUTOROUTE"], "Transport"),
  ...rules(["LOYER", "EDF", "ENGIE", "VEOLIA", "ELECTRICITE"], "Housing"),
  ...rules(["NETFLIX", "SPOTIFY", "DISNEY", "CANAL PLUS", "ORANGE", "SFR", "BOUYGUES", "YOUTUBE"], "Subscriptions"),
  ...rules(["PHARMACIE", "DOCTOLIB", "MEDECIN", "HOPITAL"], "Health"),
  ...rules(["CABINET VET", "VETERINAIRE"], "Veterinary"),
  ...rules(["MOTIF PENSION", "PENSION ALIMENTAIRE", "FAMILLE PENSIONS"], "Child support", { priority: 110 }),
  ...rules(["RESTAURANTS"], "Restaurants"),
  ...rules(["ALIMENTATION"], "Groceries"),
  ...rules(["TABAC"], "Tobacco"),
  ...rules(["ELECTRONIQUE ET INFORMATIQUE", "LIVRES CD DVD", "MOBILIER ELECTROMENAGER", "EQUIPEMENTS SPORTIFS", "VETEMENTS ET ACCESSOIRES"], "Shopping"),
  ...rules(["HEBERGEMENT", "AGENCE DE VOYAGE"], "Travel"),
  ...rules(["DIVERTISSEMENT CULTURE", "CLUB ASSOCIATION", "JEUX ET PARIS"], "Leisure"),
  ...rules(["DONS ET CADEAUX"], "Gifts"),
  ...rules(["CREDIT CONSO"], "Credit"),
  ...rules(["LOYERS"], "Housing"),
  ...rules(["PEAGES"], "Transport"),
  ...rules(["VIREMENTS RECUS", "VIREMENTS EMIS"], "Transfers", { kind: "transfer", needsReview: true }),
  ...rules(["AMAZON", "DECATHLON", "FNAC", "DARTY", "IKEA", "ZARA"], "Shopping"),
  ...rules(["VIREMENT", "VIR"], "Transfers", { kind: "transfer", needsReview: true }),
  ...rules(["RETRAIT DAB", "RETRAIT GAB"], "Cash withdrawals"),
  ...rules(["ASSURANCES AUTO", "ASSURANCE AUTO", "ASSURANCE AUTOMOBILE"], "Car insurance"),
  ...rules(["NAVI MOUSCRON"], "Convenience Store", { needsReview: true }),
  ...rules(["KINGFISHER"], "Salary", { kind: "income" }),
  ...rules(
    [
      "FRAIS BANCAIRES",
      "FRAIS PAIEMENT HORS ZONE",
      "FRAIS SUR SATD",
      "COTISATION JAZZ",
      "COTIS OPTION CONVENTION ETOILE",
      "COTIS MODULE",
    ],
    "Bank fees",
    { priority: 110 }
  ),
];
