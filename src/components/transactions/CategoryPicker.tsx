"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { categoryBankLabel, categoryDisplayName } from "@/lib/transactions/categoryNames";
import { labelKeywords } from "@/lib/transactions/suggestCategory";

export type PickerCategory = {
  id: string;
  name: string;
  nameEn: string | null;
  nameFr: string | null;
  color: string;
  parentId: string | null;
};

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function categoryText(category: PickerCategory) {
  return fold([category.name, categoryDisplayName(category), categoryBankLabel(category)].filter(Boolean).join(" "));
}

function titleWord(word: string) {
  return word.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}

export function CategoryPicker({
  categories,
  title,
  label,
  currentCategoryId,
  saving,
  onClose,
  onSave,
}: {
  categories: PickerCategory[];
  title: string;
  label: string;
  currentCategoryId: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (categoryId: string, keyword: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(currentCategoryId ?? "");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [openParents, setOpenParents] = useState<Set<string>>(() => {
    const current = categories.find((category) => category.id === currentCategoryId);
    return new Set(current?.parentId ? [current.parentId] : []);
  });
  const words = useMemo(() => labelKeywords(label), [label]);
  const needle = fold(query);

  const visibleIds = useMemo(() => {
    if (!needle) return null;
    const matches = new Set(categories.filter((category) => categoryText(category).includes(needle)).map((category) => category.id));
    const ids = new Set(matches);
    for (const category of categories) {
      if (category.parentId && matches.has(category.parentId)) ids.add(category.id);
      if (category.parentId && matches.has(category.id)) ids.add(category.parentId);
    }
    return ids;
  }, [categories, needle]);

  const byParent = useMemo(() => {
    const ids = new Set(categories.map((category) => category.id));
    const grouped = new Map<string | null, PickerCategory[]>();
    for (const category of categories) {
      if (visibleIds && !visibleIds.has(category.id)) continue;
      const parentId = category.parentId && ids.has(category.parentId) ? category.parentId : null;
      const list = grouped.get(parentId) ?? [];
      list.push(category);
      grouped.set(parentId, list);
    }
    for (const list of grouped.values()) {
      list.sort((left, right) => categoryDisplayName(left).localeCompare(categoryDisplayName(right), "en"));
    }
    return grouped;
  }, [categories, visibleIds]);

  const renderBranch = (parentId: string | null, depth: number) => (
    (byParent.get(parentId) ?? []).map((category) => {
      const children = byParent.get(category.id) ?? [];
      const expanded = needle.length > 0 || openParents.has(category.id);
      const french = categoryBankLabel(category);
      const english = categoryDisplayName(category);
      return (
        <div key={category.id}>
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            {children.length > 0 ? (
              <button
                type="button"
                aria-label={expanded ? `Collapse ${english}` : `Expand ${english}`}
                onClick={() => setOpenParents((current) => {
                  const next = new Set(current);
                  if (next.has(category.id)) next.delete(category.id);
                  else next.add(category.id);
                  return next;
                })}
                className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-500"
              >
                {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-7 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => setSelectedId(category.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left ${selectedId === category.id ? "bg-flow-primary/10" : ""}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-gray-900 dark:text-white">{english}</span>
                {french && french !== english && <span className="block truncate text-[11px] text-gray-500">{french}</span>}
              </span>
            </button>
          </div>
          {expanded && renderBranch(category.id, depth + 1)}
        </div>
      );
    })
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Choose a category"
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-3xl bg-white p-4 dark:bg-[#18191E]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter in English or French"
          aria-label="Filter categories"
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {renderBranch(null, 0)}
          {(byParent.get(null) ?? []).length === 0 && <p className="px-2 text-sm text-gray-500">No categories match.</p>}
        </div>
        {words.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] uppercase text-gray-500">Remember a word from the name</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {words.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => setSelectedWord((current) => current === word ? null : word)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${selectedWord === word ? "bg-flow-primary text-white" : "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100"}`}
                >
                  {titleWord(word)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 dark:border-white/15 dark:text-gray-200">
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId || saving}
            onClick={() => onSave(selectedId, selectedWord)}
            className="flex-1 rounded-xl bg-flow-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
