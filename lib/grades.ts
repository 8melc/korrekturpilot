export interface GradeInfo {
  label: string;
  badgeClass: string;
}

export interface GradeInfoInput {
  prozent: number;
  gradeLevel: number;
}

/**
 * Generiert Badge-Klasse aus Notenlabel
 * "1+" → "grade-1-plus"
 * "2-" → "grade-2-minus"
 * "3" → "grade-3"
 */
function generateBadgeClass(label: string): string {
  if (label.includes('+')) {
    return `grade-${label.replace('+', '')}-plus`;
  }
  if (label.includes('−') || label.includes('-')) {
    return `grade-${label.replace('−', '').replace('-', '')}-minus`;
  }
  return `grade-${label}`;
}

/**
 * Notenschlüssel SEK I (gradeLevel ≤ 10)
 */
function getGradeInfoSEKI(prozent: number): string {
  if (prozent >= 98) return "1+";
  if (prozent >= 95) return "1";
  if (prozent >= 92) return "1−";
  
  if (prozent >= 88) return "2+";
  if (prozent >= 80) return "2";
  if (prozent >= 74) return "2−";
  
  if (prozent >= 68) return "3+";
  if (prozent >= 62) return "3";
  if (prozent >= 59) return "3−";
  
  if (prozent >= 53) return "4+";
  if (prozent >= 46) return "4";
  if (prozent >= 39) return "4−";
  
  if (prozent >= 33) return "5+";
  if (prozent >= 29) return "5−";  // BUG2 Fix: 29-32% = 5-
  if (prozent >= 26) return "5";
  if (prozent >= 19) return "5−";
  
  return "6";
}

/**
 * Notenschlüssel SEK II (gradeLevel ≥ 11)
 */
function getGradeInfoSEKII(prozent: number): string {
  if (prozent >= 97) return "1+";
  if (prozent >= 91) return "1";
  if (prozent >= 85) return "1−";
  
  if (prozent >= 78) return "2+";
  if (prozent >= 70) return "2";
  if (prozent >= 65) return "2−";
  
  if (prozent >= 60) return "3+";
  if (prozent >= 55) return "3";
  if (prozent >= 50) return "3−";
  
  if (prozent >= 45) return "4+";
  if (prozent >= 40) return "4";
  if (prozent >= 33) return "4−";
  
  if (prozent >= 26) return "5+";
  if (prozent >= 20) return "5";
  if (prozent >= 15) return "5−";
  
  return "6";
}

export function getGradeInfo(input: GradeInfoInput): GradeInfo {
  const { prozent, gradeLevel } = input;
  
  // Bestimme Notenschlüssel basierend auf Jahrgang
  const label = gradeLevel <= 10 
    ? getGradeInfoSEKI(prozent)
    : getGradeInfoSEKII(prozent);
  
  const badgeClass = generateBadgeClass(label);
  
  return { label, badgeClass };
}

export function getGradeWithPlusMinus(percentage: number) {
  if (percentage >= 95) return "1+";
  if (percentage >= 90) return "1";
  if (percentage >= 85) return "1−";

  if (percentage >= 80) return "2+";
  if (percentage >= 75) return "2";
  if (percentage >= 70) return "2−";

  if (percentage >= 65) return "3+";
  if (percentage >= 60) return "3";
  if (percentage >= 55) return "3−";

  if (percentage >= 50) return "4+";
  if (percentage >= 45) return "4";
  if (percentage >= 40) return "4−";

  if (percentage >= 30) return "5";
  return "6";
}

/**
 * Optional: zusätzliche Lernstandskategorie für KI-Fazit
 */
export function getPerformanceLevel(percentage: number) {
  if (percentage >= 90) return "sehr sicher";
  if (percentage >= 75) return "weitgehend sicher";
  if (percentage >= 60) return "teilweise sicher";
  if (percentage >= 45) return "unsicher";
  return "stark förderbedürftig";
}

/**
 * Gibt die CSS-Klasse für die Notenfarbe zurück
 */
export function gradeColor(grade: string): string {
  if (grade.startsWith("1")) return "text-green-600";
  if (grade.startsWith("2")) return "text-emerald-600";
  if (grade.startsWith("3")) return "text-yellow-600";
  if (grade.startsWith("4")) return "text-orange-600";
  if (grade.startsWith("5")) return "text-red-600";
  return "text-red-800";
}
