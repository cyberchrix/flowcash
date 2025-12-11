"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeIcon, Cog6ToothIcon, PlusIcon } from "@heroicons/react/24/outline";
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
      <span className={active ? "text-white" : "text-flowTextMuted/40 dark:text-gray-500"}>
        {icon}
      </span>
      <span
        className={
          active
            ? "font-semibold text-white"
            : "font-medium text-flowTextMuted/40 dark:text-gray-500"
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
  const isParametersActive = pathname === "/parameters";
  const { openAddExpenseModal } = useModal();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
      <div className={`grid w-full max-w-xs grid-cols-3 items-end rounded-3xl px-8 py-4 backdrop-blur-flow transition-all duration-300 ${
        isScrolled 
          ? "bg-white/98 dark:bg-[#262A35]/95 shadow-lg" 
          : "bg-white/95 dark:bg-white/2 shadow-flowNav"
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
          <button
            onClick={openAddExpenseModal}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-flow-primary text-white shadow-flowSoft -mb-1.5 hover:bg-flow-primary/90"
          >
            <PlusIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="flex justify-end">
          <NavItem
            href="/parameters"
            icon={<Cog6ToothIcon className="h-6 w-6" />}
            label="Parameters"
            active={isParametersActive}
          />
        </div>
      </div>
    </nav>
  );
}

