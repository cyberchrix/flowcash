"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings";
import { getCategories, createCategory, deleteCategory, updateCategory } from "@/lib/supabase/categories";
import { TrashIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ColorPicker } from "@/components/ColorPicker";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  isPushSupported,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { categoryBankLabel, categoryDisplayName } from "@/lib/transactions/categoryNames";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

type CategoryItem = { id: string; name: string; nameEn: string | null; nameFr: string | null; color: string; parentId: string | null };

function categoryForest(categories: CategoryItem[]) {
  const ids = new Set(categories.map((category) => category.id));
  const byParent = new Map<string | null, CategoryItem[]>();
  for (const category of categories) {
    const parentId = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = byParent.get(parentId) ?? [];
    list.push(category);
    byParent.set(parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((left, right) => categoryDisplayName(left).localeCompare(categoryDisplayName(right), "en"));
  }
  return byParent;
}

export default function ParametersPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [salaryNet, setSalaryNet] = useState("");
  const [taxWithholdingRate, setTaxWithholdingRate] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366F1");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingEnglish, setEditingEnglish] = useState("");
  const [editingFrench, setEditingFrench] = useState("");
  const [newCategoryFrench, setNewCategoryFrench] = useState("");
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);

  // Charger les paramètres actuels et les catégories
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Charger les paramètres
        const settings = await getUserSettings(user.id);
        if (settings) {
          setSalaryNet(settings.salary_net.toString());
          setTaxWithholdingRate(settings.tax_withholding_rate?.toString() || "");
          const currency = currencies.find(c => c.code === settings.currency) || currencies[0];
          setSelectedCurrency(currency);
        }

        // Charger les catégories
        const categoriesData = await getCategories(user.id);
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          nameEn: cat.name_en ?? null,
          nameFr: cat.name_fr ?? null,
          color: cat.color,
          parentId: cat.parent_id ?? null,
        })));
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Error loading settings");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Rediriger vers /auth si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Détecter le support et l'état des notifications push
  useEffect(() => {
    const checkPush = async () => {
      if (!isPushSupported()) return;
      setNotifSupported(true);
      setNotifDenied(Notification.permission === "denied");
      try {
        const sub = await getPushSubscription();
        setNotifEnabled(!!sub);
      } catch {
        setNotifEnabled(false);
      }
    };
    checkPush();
  }, []);

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    setError(null);
    try {
      if (notifEnabled) {
        await unsubscribeFromPush();
        setNotifEnabled(false);
        showSuccess("Notifications disabled");
      } else {
        await subscribeToPush();
        setNotifEnabled(true);
        setNotifDenied(false);
        showSuccess("Notifications enabled");
      }
    } catch (err) {
      console.error("Error toggling notifications:", err);
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setNotifDenied(true);
      }
      const message =
        err instanceof Error ? err.message : "Error updating notifications";
      setError(message);
      showError(message);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!user) {
        setError("You must be logged in");
        setSaving(false);
        return;
      }

      const parsedSalary = parseFloat(salaryNet);
      if (isNaN(parsedSalary) || parsedSalary < 0) {
        setError("Please enter a valid amount");
        setSaving(false);
        return;
      }

      const parsedTaxRate = taxWithholdingRate.trim() 
        ? parseFloat(taxWithholdingRate) 
        : null;
      
      if (taxWithholdingRate.trim() && (isNaN(parsedTaxRate!) || parsedTaxRate! < 0 || parsedTaxRate! > 100)) {
        setError("Tax withholding rate must be between 0 and 100");
        setSaving(false);
        return;
      }

      await updateUserSettings(user.id, {
        salary_net: parsedSalary,
        tax_withholding_rate: parsedTaxRate,
        currency: selectedCurrency.code,
      });

      showSuccess("Settings saved successfully");
    } catch (err) {
      console.error("Error updating settings:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error saving. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;

    setError(null);

    try {
      const parentId = newCategoryParentId || null;
      const english = newCategoryName.trim();
      const french = newCategoryFrench.trim();
      const newCategory = await createCategory({
        user_id: user.id,
        name: french || english,
        color: newCategoryColor,
        name_en: english,
        ...(french ? { name_fr: french } : {}),
        ...(parentId ? { parent_id: parentId } : {}),
      });

      setCategories([...categories, {
        id: newCategory.id,
        name: newCategory.name,
        nameEn: newCategory.name_en ?? english,
        nameFr: newCategory.name_fr ?? (french || null),
        color: newCategory.color,
        parentId: newCategory.parent_id ?? parentId,
      }]);
      setCollapsedCategoryIds((current) => {
        if (!parentId || !current.has(parentId)) return current;
        const next = new Set(current);
        next.delete(parentId);
        return next;
      });
      setNewCategoryName("");
      setNewCategoryFrench("");
      setNewCategoryParentId("");
      setNewCategoryColor("#6366F1");
      showSuccess(`Category "${newCategoryName.trim()}" created successfully`);
    } catch (err) {
      console.error("Error creating category:", err);
      const errorMessage = err instanceof Error && /name_en|name_fr|column|schema cache/i.test(err.message)
        ? "Run supabase/migrations/add_category_translations.sql in the Supabase SQL editor, then reload."
        : err instanceof Error
        ? err.message
        : "Error creating category";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setEditingEnglish(categoryDisplayName(category));
    setEditingFrench(categoryBankLabel(category));
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    const english = editingEnglish.trim();
    const french = editingFrench.trim();
    if (!english) {
      setError("The English name cannot be empty");
      return;
    }

    setError(null);

    try {
      await updateCategory(categoryId, { name_en: english, name_fr: french || null });
      setCategories(categories.map(cat =>
        cat.id === categoryId ? { ...cat, nameEn: english, nameFr: french || null } : cat
      ));
      setEditingCategoryId(null);
      setEditingEnglish("");
      setEditingFrench("");
      showSuccess(`Category saved as "${english}"`);
    } catch (err) {
      console.error("Error updating category:", err);
      const errorMessage = err instanceof Error && /name_en|name_fr|column|schema cache/i.test(err.message)
        ? "Run supabase/migrations/add_category_translations.sql in the Supabase SQL editor, then reload."
        : err instanceof Error
        ? err.message
        : "Error updating category";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingEnglish("");
    setEditingFrench("");
    setError(null);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const childCount = categories.filter((category) => category.parentId === categoryId).length;
    const message = childCount > 0
      ? `Delete "${categoryName}" and its ${childCount} subcategories? Expenses will not be deleted.`
      : `Are you sure you want to delete the category "${categoryName}"? Associated expenses will not be deleted.`;
    if (!confirm(message)) {
      return;
    }

    setDeletingCategoryId(categoryId);
    setError(null);

    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId && cat.parentId !== categoryId));
      showSuccess(`Category "${categoryName}" deleted successfully`);
    } catch (err) {
      console.error("Error deleting category:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error deleting category";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Couleurs prédéfinies pour les catégories
  const predefinedColors = [
    "#FF2D8A", // Pink (Housing)
    "#8A2BFF", // Purple (Children)
    "#316CFF", // Blue (Subscriptions)
    "#FFC04A", // Yellow (Transport)
    "#A1A1A1", // Gray (Other)
    "#6366F1", // Indigo (Crédit)
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#06B6D4", // Cyan
  ];

  const forest = categoryForest(categories);
  const roots = forest.get(null) ?? [];

  const renderCategoryBranch = (category: CategoryItem): React.ReactNode => {
    const children = forest.get(category.id) ?? [];
    const expanded = !collapsedCategoryIds.has(category.id);
    return (
      <div key={category.id}>
        {renderCategoryRow(category, children.length > 0, expanded)}
        {expanded && children.length > 0 && (
          <div className="ml-5 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-white/10">
            {children.map((child) => renderCategoryBranch(child))}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryRow = (category: CategoryItem, hasChildren: boolean, expanded: boolean) => (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-transparent dark:bg-white/2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setCollapsedCategoryIds((current) => {
              const next = new Set(current);
              if (next.has(category.id)) next.delete(category.id);
              else next.add(category.id);
              return next;
            })}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${categoryDisplayName(category)}` : `Expand ${categoryDisplayName(category)}`}
          >
            {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5" aria-hidden="true" />
        )}
        <div className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        {editingCategoryId === category.id ? (
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              type="text"
              value={editingEnglish}
              onChange={(e) => setEditingEnglish(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCategoryEdit(category.id);
                else if (e.key === "Escape") handleCancelCategoryEdit();
              }}
              aria-label="English name"
              placeholder="English"
              className="min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
            <input
              type="text"
              value={editingFrench}
              onChange={(e) => setEditingFrench(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCategoryEdit(category.id);
                else if (e.key === "Escape") handleCancelCategoryEdit();
              }}
              aria-label="French bank label"
              placeholder="French bank label"
              className="min-w-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </span>
        ) : (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{categoryDisplayName(category)}</span>
            {categoryBankLabel(category) && categoryBankLabel(category) !== categoryDisplayName(category) && (
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{categoryBankLabel(category)}</span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editingCategoryId === category.id ? (
          <>
            <button
              onClick={() => handleSaveCategoryEdit(category.id)}
              className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:text-white dark:hover:bg-white/10"
              title="Save"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelCategoryEdit}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 dark:text-white dark:hover:bg-white/10"
              title="Cancel"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleEditCategory(category)}
              disabled={deletingCategoryId === category.id || editingCategoryId !== null}
              className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id, categoryDisplayName(category))}
              disabled={deletingCategoryId === category.id || editingCategoryId !== null}
              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg dark:bg-transparent">
        <div className="text-flowTextMuted dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection en cours
  }

  return (
    <>
      <div id="page-top-anchor" className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-5 bg-flowBg dark:bg-transparent">
      <Header />

      <main className="min-h-0 flex-1 space-y-6 overflow-y-auto pt-20 pb-4">
        <div
          className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
          style={{
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h1 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
            Settings
          </h1>
          <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
            Manage your financial settings
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Theme Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-3">
                Appearance
              </label>
              <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {theme === "dark" ? "Dark Mode" : "Light Mode"}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                      {theme === "dark" ? "Dark theme enabled" : "Light theme enabled"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-flow-primary focus:ring-offset-2 ${
                    theme === "dark" ? "bg-flow-primary" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={theme === "dark"}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Salaire net */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monthly net salary (before withholding tax)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={salaryNet}
                  onChange={(e) => setSalaryNet(e.target.value)}
                  placeholder="0.00"
                  required
                  className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
                />
                <select
                  value={selectedCurrency.code}
                  onChange={(e) => {
                    const currency = currencies.find((c) => c.code === e.target.value);
                    if (currency) setSelectedCurrency(currency);
                  }}
                  className="flex-shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prélèvement à la source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Withholding tax rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxWithholdingRate}
                onChange={(e) => setTaxWithholdingRate(e.target.value)}
                placeholder="e.g. 10.5"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional: Percentage deducted at source (e.g., 10.5 for 10.5%). Net Income will be calculated automatically.
              </p>
              {salaryNet && taxWithholdingRate && (
                <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Calculated Net Income:</strong>{" "}
                    {(
                      parseFloat(salaryNet) * (1 - parseFloat(taxWithholdingRate) / 100)
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {selectedCurrency.symbol}
                  </p>
                </div>
              )}
            </div>

            {/* Bouton de sauvegarde */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-flow-primary px-4 py-3 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>
        </div>

        {/* Section Notifications */}
        <div
          className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
          style={{
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
            Notifications
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
            Get a reminder the day before a charge is due
          </p>

          {!notifSupported ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your browser doesn&apos;t support notifications. On iPhone, add
              Availo to your home screen first, then enable them from the
              installed app.
            </p>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent">
              <div className="text-sm pr-4">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Charge reminders
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                  {notifDenied
                    ? "Blocked. Allow notifications in your browser settings."
                    : notifEnabled
                    ? "Enabled on this device"
                    : "Disabled"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                disabled={notifLoading || notifDenied}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-flow-primary focus:ring-offset-2 disabled:opacity-50 ${
                  notifEnabled ? "bg-flow-primary" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={notifEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Section Catégories */}
        <div
          className="rounded-[28px] bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent px-6 py-5"
          style={{
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2 className="text-xs font-semibold text-gray-900 dark:text-white/50 uppercase mb-2">
            Categories
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-400 mb-6">
            Categories and their subcategories
          </p>

          <div className="mb-6 space-y-2">
            {roots.map((category) => renderCategoryBranch(category))}
          </div>

          {/* Formulaire d'ajout de catégorie */}
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Place under
              </label>
              <select
                value={newCategoryParentId}
                onChange={(event) => setNewCategoryParentId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Top level</option>
                {roots.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryDisplayName(category)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Food, Transport"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank label
              </label>
              <input
                type="text"
                value={newCategoryFrench}
                onChange={(e) => setNewCategoryFrench(e.target.value)}
                placeholder="French name from the bank"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={newCategoryColor}
                  onChange={(color) => setNewCategoryColor(color)}
                />
                <div className="flex flex-wrap gap-2 flex-1">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newCategoryColor === color
                          ? "border-gray-900 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="w-full rounded-lg bg-flow-primary px-4 py-2 text-sm font-medium text-white hover:bg-flow-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              {newCategoryParentId ? "Add subcategory" : "Add category"}
            </button>
          </form>
        </div>

      </main>

      <BottomNav />
    </div>
    </>
  );
}

