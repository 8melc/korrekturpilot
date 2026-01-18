// Berechnet das aktuelle Schuljahr basierend auf dem Datum
// Schuljahr läuft von August bis Juli (z.B. 2024/25)
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  
  // Wenn wir ab August sind, startet das neue Schuljahr
  if (month >= 8) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  } else {
    // Vor August gehört es noch zum vorherigen Schuljahr
    return `${year - 1}/${year.toString().slice(-2)}`;
  }
}







