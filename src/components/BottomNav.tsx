"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeIcon, BanknotesIcon, ChartBarIcon, ChartPieIcon, EllipsisHorizontalIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link href={href} className="flex w-full flex-col items-center gap-1 text-center text-[11px] leading-none">
      <span className={active ? "text-flow-primary" : "text-gray-400 dark:text-gray-500"}>
        {icon}
      </span>
      <span
        className={
          active
            ? "font-semibold text-flow-primary"
            : "font-medium text-gray-400 dark:text-gray-500"
        }
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isAnalyticsActive = pathname === "/" || pathname === "/analytics";
  const isTransactionsActive = pathname === "/transactions";
  const moreRoutes = ["/overview", "/expenses", "/history", "/calendar", "/parameters"];
  const isMoreActive = moreRoutes.includes(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      // Vérifier si le contenu dépasse la hauteur de l'écran
      const body = document.body;
      const html = document.documentElement;
      const hasVerticalScrollbar = body.scrollHeight > html.clientHeight;
      setHasOverflow(hasVerticalScrollbar);
    };

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 50);
    };

    // Vérifier au chargement et au redimensionnement
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    window.addEventListener("scroll", handleScroll);
    
    // Re-vérifier après un court délai pour tenir compte du chargement dynamique
    const timeout = setTimeout(checkOverflow, 500);

    return () => {
      window.removeEventListener("resize", checkOverflow);
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <nav className="z-50 flex shrink-0 justify-center bg-[#F5F7FA] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 dark:bg-[#191A1F]">
      <div className="w-full max-w-md mx-auto px-5">
        <div className={`grid w-full grid-cols-3 items-start rounded-3xl border border-gray-200 bg-white px-2 py-4 transition-all duration-300 dark:border-transparent dark:bg-[#262A35] ${
          hasOverflow || isScrolled ? "shadow-lg" : "shadow-flowNav"
        }`}>
        <div className="flex min-w-0 justify-center">
          <NavItem
            href="/analytics"
            icon={<ChartPieIcon className="h-6 w-6" />}
            label="Analytics"
            active={isAnalyticsActive}
          />
        </div>

        <div className="flex min-w-0 justify-center">
          <NavItem
            href="/transactions"
            icon={<BanknotesIcon className="h-6 w-6" />}
            label="Transactions"
            active={isTransactionsActive}
          />
        </div>

        <div className="relative flex min-w-0 justify-center">
          <button type="button" onClick={() => setMoreOpen((open) => !open)} className="flex w-full flex-col items-center gap-1 text-center text-[11px] leading-none" aria-label="More">
            <EllipsisHorizontalIcon className={`h-6 w-6 ${isMoreActive ? "text-flow-primary" : "text-gray-400 dark:text-gray-500"}`} />
            <span className={isMoreActive ? "font-semibold text-flow-primary" : "font-medium text-gray-400 dark:text-gray-500"}>More</span>
          </button>
          {moreOpen && (
            <div className="absolute bottom-16 right-0 w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-transparent dark:bg-[#262A35]">
              {[
                ["/expenses", "Expenses", ChartBarIcon],
                ["/parameters", "Parameters", Cog6ToothIcon],
                ["/overview", "Overview", HomeIcon],
              ].map(([href, label, Icon]) => (
                <Link key={String(href)} href={String(href)} onClick={() => setMoreOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-gray-800 dark:text-gray-100">
                  <Icon className="h-4 w-4" />
                  {String(label)}
                </Link>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </nav>
  );
}

