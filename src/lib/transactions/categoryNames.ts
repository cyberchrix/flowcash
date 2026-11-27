export type NamedCategory = {
  name: string;
  nameEn?: string | null;
  name_en?: string | null;
  nameFr?: string | null;
  name_fr?: string | null;
};

const TRANSLATIONS: [string, string][] = [
  ["Abonnements et téléphonie", "Subscriptions"],
  ["Multimedia à domicile (TV, internet, téléphonie…)", "Home media"],
  ["Téléphonie (fixe et mobile)", "Phone"],
  ["Agence de voyage", "Travel agency"],
  ["Alimentation", "Groceries"],
  ["Animaux domestiques", "Pets"],
  ["Assurances (Auto/Moto)", "Car insurance"],
  ["Auto / Moto - Autres", "Other car"],
  ["Auto et Moto", "Car"],
  ["Autres dépenses", "Other expenses"],
  ["Bien-être et soins (coiffeur, parfums…)", "Personal care"],
  ["Cadeaux et solidarité", "Gifts"],
  ["Carburant", "Fuel"],
  ["Club / association (sport, hobby, art…)", "Clubs"],
  ["Complémentaires santé", "Health insurance"],
  ["Crédit conso", "Consumer credit"],
  ["Dépenses d'épargne", "Savings"],
  ["Dépenses Jeux et paris", "Gambling"],
  ["Divertissement - culture (ciné, théâtre, concerts…)", "Culture"],
  ["Dons et Cadeaux", "Donations"],
  ["Education et Famille", "Family"],
  ["Electronique et informatique", "Electronics"],
  ["Emprunts (hors immobilier)", "Loans"],
  ["Entretien - Réparation", "Maintenance"],
  ["Epargne financière (retraite, prévoyance, PEA, assurance-vie…)", "Investments"],
  ["Equipements sportifs et artistiques", "Sports gear"],
  ["Etudes (formation, fournitures, cantines…)", "Education"],
  ["Financement", "Car financing"],
  ["Frais bancaires et de gestion (dont agios)", "Bank fees"],
  ["Frais Professionnels", "Work expenses"],
  ["Hébergement (hôtels, camping…)", "Lodging"],
  ["Impôts et Taxes", "Taxes"],
  ["Livres, CD/DVD, bijoux, jouets…", "Media and gifts"],
  ["Logement", "Housing"],
  ["Loisirs", "Leisure"],
  ["Loyers, Charges", "Rent"],
  ["Médecins et frais médicaux", "Doctors"],
  ["Mobilier, électroménager, décoration…", "Home goods"],
  ["Mouvements internes créditeurs", "Internal transfers"],
  ["Parking", "Parking"],
  ["Péages", "Tolls"],
  ["Pensions", "Support payments"],
  ["Pharmacie et laboratoire", "Pharmacy"],
  ["Remboursement impôts", "Tax refund"],
  ["Remboursements", "Refunds"],
  ["Remboursements frais professionnels", "Expense reimbursements"],
  ["Restaurants, bars, discothèques…", "Restaurants"],
  ["Retraits", "Cash withdrawals"],
  ["Revenus du travail", "Salary"],
  ["Salaire fixe", "Salary"],
  ["Santé", "Health"],
  ["Services financiers / professionnels", "Financial services"],
  ["Tabac", "Tobacco"],
  ["Taxis", "Taxis"],
  ["Vêtements et accessoires", "Clothes"],
  ["Vie quotidienne", "Everyday life"],
  ["Vie Quotidienne - Autres", "Other everyday"],
  ["Virements émis", "Outgoing transfers"],
  ["Virements reçus", "Incoming transfers"],
  ["Virements reçus de comptes à comptes", "Account transfers"],
  ["Voyages et Transports", "Travel"],
];

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

const ENGLISH_BY_FRENCH = new Map(TRANSLATIONS.map(([french, english]) => [fold(french), english]));

export function categoryEnglishName(frenchName: string) {
  return ENGLISH_BY_FRENCH.get(fold(frenchName)) ?? null;
}

export function categoryDisplayName(category: NamedCategory) {
  const custom = (category.nameEn ?? category.name_en)?.trim();
  if (custom) return custom;
  return categoryEnglishName(category.name) ?? category.name;
}

export function categoryBankLabel(category: NamedCategory) {
  const stored = (category.nameFr ?? category.name_fr)?.trim();
  if (stored) return stored;
  if (categoryEnglishName(category.name)) return category.name;
  return "";
}
