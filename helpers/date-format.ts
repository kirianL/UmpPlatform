/**
 * Formats an ISO date string (YYYY-MM-DD) to DD-MM-YYYY display format.
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
    }
  }
  return dateStr;
}
