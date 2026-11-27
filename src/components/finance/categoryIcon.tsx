import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  CreditCardIcon,
  EllipsisHorizontalIcon,
  FireIcon,
  HomeIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  TvIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const ICONS: [string, typeof HomeIcon][] = [
  ["HOUSING", HomeIcon],
  ["HOME", HomeIcon],
  ["LOGEMENT", HomeIcon],
  ["MAISON", HomeIcon],
  ["CHILD", UsersIcon],
  ["ENFANT", UsersIcon],
  ["SUBSCRIPTION", TvIcon],
  ["ABONNEMENT", TvIcon],
  ["TRANSPORT", TruckIcon],
  ["GROCER", ShoppingCartIcon],
  ["COURSE", ShoppingCartIcon],
  ["ALIMENT", ShoppingCartIcon],
  ["RESTAURANT", CakeIcon],
  ["FUEL", BoltIcon],
  ["CARBURANT", BoltIcon],
  ["ESSENCE", BoltIcon],
  ["TOBACCO", FireIcon],
  ["TABAC", FireIcon],
  ["CREDIT", CreditCardIcon],
  ["TRANSFER", ArrowsRightLeftIcon],
  ["VIREMENT", ArrowsRightLeftIcon],
  ["SALARY", BanknotesIcon],
  ["SALAIRE", BanknotesIcon],
  ["CONVENIENCE", BuildingStorefrontIcon],
  ["OTHER", EllipsisHorizontalIcon],
  ["AUTRE", EllipsisHorizontalIcon],
];

function iconFor(name: string) {
  const normalized = name.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return ICONS.find(([needle]) => normalized.includes(needle))?.[1] ?? TagIcon;
}

export function CategoryIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const Icon = iconFor(name);
  return <Icon className={className} aria-hidden="true" />;
}
