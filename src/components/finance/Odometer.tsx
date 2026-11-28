"use client";

import { useEffect, useState } from "react";

function Reel({ digit, delay }: { digit: number; delay: number }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOffset(digit);
      return;
    }
    setOffset(0);
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setOffset(digit), delay);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [digit, delay]);

  return (
    <span className="inline-block h-[1.15em] overflow-hidden leading-[1.15em]" style={{ width: "1ch" }} aria-hidden="true">
      <span className="block transition-transform duration-700 ease-out" style={{ transform: `translateY(-${offset * 1.15}em)` }}>
        {"0123456789".split("").map((item) => (
          <span key={item} className="block h-[1.15em] text-center">{item}</span>
        ))}
      </span>
    </span>
  );
}

export function Odometer({ value, className }: { value: string; className?: string }) {
  let digitIndex = 0;
  return (
    <span className={`inline-flex items-baseline tabular-nums ${className ?? ""}`} aria-label={value}>
      {value.split("").map((character, index) => {
        if (/\d/.test(character)) {
          const delay = digitIndex * 45;
          digitIndex += 1;
          return <Reel key={index} digit={Number(character)} delay={delay} />;
        }
        return <span key={index} aria-hidden="true">{character}</span>;
      })}
    </span>
  );
}
