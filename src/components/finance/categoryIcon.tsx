import type { ComponentType } from "react";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  CreditCardIcon,
  EllipsisHorizontalIcon,
  HomeIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  TvIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

function CigaretteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path strokeLinecap="round" d="M4.5 9.25c.7-.8.7-1.7 0-2.5M7.25 9.25c.7-.8.7-1.7 0-2.5" />
      <rect x="3" y="11.25" width="15" height="4.5" rx="1" />
      <path strokeLinecap="round" d="M14 11.25v4.5" />
    </svg>
  );
}

const ICONS: [string, ComponentType<{ className?: string }>][] = [
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
  ["TOBACCO", CigaretteIcon],
  ["TABAC", CigaretteIcon],
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
