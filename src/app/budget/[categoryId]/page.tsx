import { Suspense } from "react";
import { CategoryBudgetView } from "./CategoryBudgetView";

export const dynamic = "force-dynamic";

export default function CategoryBudgetPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-md items-center justify-center text-gray-500">Loading...</div>}>
      <CategoryBudgetView />
    </Suspense>
  );
}
