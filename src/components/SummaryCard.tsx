import { motion } from "framer-motion";

interface SummaryCardProps {
  salaryNet: number;
  totalExpenses: number;
  remaining: number;
}

export function SummaryCard({
  salaryNet,
  totalExpenses,
  remaining,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <section
        className="rounded-[28px] bg-white border border-gray-200 px-6 py-5"
        style={{
          fontFamily:
            'Inter Variable, ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", Segoe UI Symbol, "Noto Color Emoji"',
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <h2 className="text-sm font-semibold text-flow-primary mb-4">
          Summary
        </h2>

        <div className="text-sm font-medium text-flowTextMuted">
          Net Income
        </div>

          <div className="mt-1 text-3xl font-semibold text-flow-primary">
            {salaryNet.toLocaleString("fr-FR")} €
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-flowTextMuted">
                Total Expenses
              </div>
              <div className="mt-1 text-xl font-semibold text-flowPink">
                {totalExpenses.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-flowTextMuted">
                Disposable Income
              </div>
              <div
                className={`mt-1 text-xl font-semibold ${
                  remaining >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {remaining.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </div>
            </div>
          </div>
        </section>
    </motion.div>
  );
}

