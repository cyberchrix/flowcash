import { Suspense } from "react";
import { TransactionsView } from "./TransactionsView";

export const dynamic = "force-dynamic";

function TransactionsFallback() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 bg-flowBg dark:bg-transparent">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsFallback />}>
      <TransactionsView />
    </Suspense>
  );
}
