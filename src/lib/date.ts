// Helpers pour gérer les charges récurrentes en "jour du mois" (1-31).
// Seul le jour est significatif : le mois et l'année stockés ne sont qu'un
// détail technique (la colonne expense_date est une vraie DATE en base).

// Jour du mois (1-31) à partir d'une date "YYYY-MM-DD"
export function getDayOfMonth(dateString: string): number {
  return Number(dateString.split("-")[2]);
}

// Suffixe ordinal anglais (1st, 2nd, 3rd, 4th...)
export function ordinal(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

// Construit une date valide "YYYY-MM-DD" à partir d'un seul jour du mois.
// On choisit un mois qui contient ce jour (mois courant si possible, sinon
// janvier qui a 31 jours) afin que le jour soit toujours préservé tel quel.
export function dayToDateString(day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const daysInCurrentMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthIndex = day <= daysInCurrentMonth ? now.getMonth() : 0; // janvier = 31 jours
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Libellé d'affichage : "15th of the month"
export function formatDayOfMonth(dateString: string): string {
  return `${ordinal(getDayOfMonth(dateString))} of the month`;
}
