import type { ComponentType } from "react";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingLibraryIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  EllipsisHorizontalIcon,
  HomeIcon,
  ShoppingCartIcon,
  TagIcon,
  TruckIcon,
  TvIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <ellipse cx="7" cy="8" rx="1.6" ry="2.1" />
      <ellipse cx="12" cy="6.2" rx="1.6" ry="2.1" />
      <ellipse cx="17" cy="8" rx="1.6" ry="2.1" />
      <ellipse cx="5.2" cy="12.2" rx="1.5" ry="1.9" />
      <path strokeLinecap="round" d="M8.2 14.2c.6 2.8 2 4.3 3.8 4.3s3.2-1.5 3.8-4.3c-1.2-.8-2.4-1.1-3.8-1.1s-2.6.3-3.8 1.1Z" />
    </svg>
  );
}

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
  ["INSURANCE", ShieldCheckIcon],
  ["ASSURANCE", ShieldCheckIcon],
  ["VETERIN", PawIcon],
  ["BANK FEE", ReceiptPercentIcon],
  ["WITHDRAWAL", BuildingLibraryIcon],
  ["RETRAIT", BuildingLibraryIcon],
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
