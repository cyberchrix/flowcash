"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeIcon, PlusIcon, BanknotesIcon, ChartBarIcon, ChartPieIcon, EllipsisHorizontalIcon, Cog6ToothIcon, CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useModal } from "@/contexts/ModalContext";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 text-xs">
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
  const isHomeActive = pathname === "/";
  const isBudgetActive = pathname === "/budget";
  const isAnalyticsActive = pathname === "/analytics";
  const moreRoutes = ["/transactions", "/expenses", "/history", "/calendar", "/parameters"];
  const isMoreActive = moreRoutes.includes(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const { openAddExpenseModal } = useModal();
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
      <div className="w-full max-w-md mx-auto px-5">
        <div className={`grid w-full grid-cols-5 items-end rounded-3xl px-3 py-4 backdrop-blur-flow transition-all duration-300 border border-gray-200 dark:border-transparent ${
          hasOverflow || isScrolled
            ? "bg-white/98 dark:bg-[#262A35]/95 shadow-lg" 
            : "bg-white dark:bg-white/2 shadow-flowNav"
        }`}>
        <div className="flex justify-start">
          <NavItem
            href="/"
            icon={<HomeIcon className="h-6 w-6" />}
            label="Home"
            active={isHomeActive}
          />
        </div>

        <div className="flex justify-center">
          <NavItem
            href="/budget"
            icon={<ChartBarIcon className="h-6 w-6" />}
            label="Budget"
            active={isBudgetActive}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={openAddExpenseModal}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-flow-primary text-white shadow-flowSoft -mb-1.5 hover:bg-flow-primary/90"
          >
            <PlusIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="flex justify-center">
          <NavItem
            href="/analytics"
            icon={<ChartPieIcon className="h-6 w-6" />}
            label="Analytics"
            active={isAnalyticsActive}
          />
        </div>

        <div className="relative flex justify-end">
          <button type="button" onClick={() => setMoreOpen((open) => !open)} className="flex flex-col items-center gap-1 text-xs" aria-label="More">
            <EllipsisHorizontalIcon className={`h-6 w-6 ${isMoreActive ? "text-flow-primary" : "text-gray-400 dark:text-gray-500"}`} />
            <span className={isMoreActive ? "font-semibold text-flow-primary" : "font-medium text-gray-400 dark:text-gray-500"}>More</span>
          </button>
          {moreOpen && (
            <div className="absolute bottom-16 right-0 w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-transparent dark:bg-[#262A35]">
              {[
                ["/transactions", "Transactions", BanknotesIcon],
                ["/expenses", "Expenses", ChartBarIcon],
                ["/calendar", "Calendar", CalendarDaysIcon],
                ["/history", "History", ClockIcon],
                ["/parameters", "Parameters", Cog6ToothIcon],
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

