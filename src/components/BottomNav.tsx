"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, Cog6ToothIcon, PlusIcon } from "@heroicons/react/24/outline";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 text-xs">
      <span className={active ? "text-flow-primary" : "text-flowTextMuted"}>
        {icon}
      </span>
      <span
        className={
          active
            ? "font-semibold text-flow-primary"
            : "font-medium text-flowTextMuted"
        }
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isAddExpenseActive = pathname === "/add-expense";
  const isParametersActive = pathname === "/parameters";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
      <div className="flex w-full max-w-xs items-center justify-between rounded-3xl border border-white/60 bg-white/80 px-8 py-4 shadow-flowNav backdrop-blur-flow">
        <NavItem
          href="/"
          icon={<HomeIcon className="h-6 w-6" />}
          label="Home"
          active={isHomeActive}
        />

        <Link
          href="/add-expense"
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-flowSoft ${
            isAddExpenseActive
              ? "bg-flow-primary"
              : "bg-flow-primary hover:bg-flow-primary/90"
          }`}
        >
          <PlusIcon className="h-6 w-6 text-white" />
        </Link>

        <NavItem
          href="/parameters"
          icon={<Cog6ToothIcon className="h-6 w-6" />}
          label="Parameters"
          active={isParametersActive}
        />
      </div>
    </nav>
  );
}

