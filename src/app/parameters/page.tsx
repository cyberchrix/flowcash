"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { getUserSettings, updateUserSettings } from "@/lib/supabase/settings";
import { getCategories, createCategory, deleteCategory, updateCategory } from "@/lib/supabase/categories";
import { TrashIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ColorPicker } from "@/components/ColorPicker";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export default function ParametersPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [salaryNet, setSalaryNet] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(currencies[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366F1");
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

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
          const currency = currencies.find(c => c.code === settings.currency) || currencies[0];
          setSelectedCurrency(currency);
        }

        // Charger les catégories
        const categoriesData = await getCategories(user.id);
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
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

      await updateUserSettings(user.id, {
        salary_net: parsedSalary,
        currency: selectedCurrency.code,
      });

      setSuccess(true);
      showSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(false), 3000);
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
      const newCategory = await createCategory({
        user_id: user.id,
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });

      setCategories([...categories, {
        id: newCategory.id,
        name: newCategory.name,
        color: newCategory.color,
      }]);
      setNewCategoryName("");
      setNewCategoryColor("#6366F1");
      showSuccess(`Category "${newCategoryName.trim()}" created successfully`);
    } catch (err) {
      console.error("Error creating category:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error creating category";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleEditCategory = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
  };

  const handleSaveCategoryEdit = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    setError(null);

    try {
      await updateCategory(categoryId, { name: editingCategoryName.trim() });
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, name: editingCategoryName.trim() } : cat
      ));
      setEditingCategoryId(null);
      setEditingCategoryName("");
      showSuccess(`Category renamed to "${editingCategoryName.trim()}" successfully`);
    } catch (err) {
      console.error("Error updating category:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Error updating category";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setError(null);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? Associated expenses will not be deleted.`)) {
      return;
    }

    setDeletingCategoryId(categoryId);
    setError(null);

    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(cat => cat.id !== categoryId));
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 bg-flowBg dark:bg-transparent">
      <Header />

      <main className="flex-1 space-y-6 pt-20 pb-28">
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
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              ✅ Settings saved successfully
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
                Monthly net salary
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Net amount after taxes
              </p>
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
            Manage your expense categories
          </p>

          {/* Liste des catégories */}
          <div className="space-y-3 mb-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-white/2 border border-gray-200 dark:border-transparent"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  {editingCategoryId === category.id ? (
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveCategoryEdit(category.id);
                        } else if (e.key === "Escape") {
                          handleCancelCategoryEdit();
                        }
                      }}
                      className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:border-flow-primary focus:outline-none focus:ring-2 focus:ring-flow-primary/20"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingCategoryId === category.id ? (
                    <>
                      <button
                        onClick={() => handleSaveCategoryEdit(category.id)}
                        className="p-1.5 text-green-600 dark:text-white hover:bg-green-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Save"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelCategoryEdit}
                        className="p-1.5 text-gray-500 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditCategory(category.id, category.name)}
                        disabled={deletingCategoryId === category.id || editingCategoryId !== null}
                        className="p-1.5 text-blue-500 dark:text-white hover:bg-blue-50 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        disabled={deletingCategoryId === category.id || editingCategoryId !== null}
                        className="p-1.5 text-red-500 dark:text-white hover:bg-red-50 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Formulaire d'ajout de catégorie */}
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New category
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Credit, Food, Transport"
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
              Add category
            </button>
          </form>
        </div>

      </main>

      <BottomNav />
    </div>
    </>
  );
}

