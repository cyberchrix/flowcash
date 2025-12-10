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
      <div className="relative rounded-[28px] p-[1px] bg-[conic-gradient(from_140deg,rgba(255,45,138,0.2),rgba(138,43,255,0.6),rgba(49,108,255,0.2),rgba(255,45,138,0.2))] shadow-flowSoft">
        <section className="rounded-[26px] bg-white/90 px-6 py-5 backdrop-blur-xl">
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
              <div className="mt-1 text-xl font-semibold text-flowBlue">
                {remaining.toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                €
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

