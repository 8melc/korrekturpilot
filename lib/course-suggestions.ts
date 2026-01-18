// Abkürzungen und Synonyme für Fächer
const SUBJECT_ALIASES: Record<string, string[]> = {
  'Mathematik': ['Mathe', 'Math', 'M', 'Ma'],
  'Deutsch': ['D', 'Deu'],
  'Englisch': ['E', 'Eng', 'English'],
  'Französisch': ['F', 'Franz', 'Franzö'],
  'Spanisch': ['S', 'Span'],
  'Latein': ['L', 'Lat'],
  'Chemie': ['C', 'Ch', 'Chem'],
  'Physik': ['Ph', 'Phys'],
  'Biologie': ['Bio', 'B', 'Biol'],
  'Geschichte': ['G', 'Gesch'],
  'Geographie': ['Geo', 'Erdkunde', 'Erd', 'Geografie'],
  'Politik': ['PoWi', 'Sozialkunde', 'SoWi'],
  'Wirtschaft': ['WiWi', 'VWL', 'BWL'],
  'Philosophie': ['Phil'],
  'Kunst': ['Ku'],
  'Musik': ['Mu'],
  'Sport': ['Sp'],
  'Informatik': ['Info', 'IT']
}

// Häufige Oberstufen-Formate
const OBERSTUFEN_PATTERNS = {
  gk: ['gk', 'GK', 'Grundkurs', 'Gk'],
  lk: ['lk', 'LK', 'Leistungskurs', 'Lk'],
  semester: ['Q1', 'Q2', 'Q3', 'Q4', 'E1', 'E2']
}

export function getSubjectSuggestions(input: string, allOptions: string[]): string[] {
  if (!input.trim()) return []
  
  const lowerInput = input.toLowerCase().trim()
  const suggestions: string[] = []

  // 1. Prüfe Abkürzungen und Synonyme
  for (const [subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === lowerInput) ||
        subject.toLowerCase().startsWith(lowerInput)) {
      if (!suggestions.includes(subject) && allOptions.includes(subject)) {
        suggestions.push(subject)
      }
    }
  }

  // 2. Fuzzy-Matching
  for (const option of allOptions) {
    const lowerOption = option.toLowerCase()
    if (lowerOption === lowerInput) continue // already handled
    
    if (lowerOption.startsWith(lowerInput) && !suggestions.includes(option)) {
      suggestions.push(option)
    } else if (lowerOption.includes(lowerInput) && !suggestions.includes(option)) {
      suggestions.push(option)
    }
  }

  return suggestions.slice(0, 5)
}

export function getGradeSuggestions(input: string, allOptions: string[]): string[] {
  if (!input.trim()) return []
  
  const suggestions: string[] = []
  const lowerInput = input.toLowerCase().trim()

  // Semester zu Jahrgang zuordnen
  const semesterToGrade: Record<string, string[]> = {
    'q1': ['11'], 'q2': ['11'], 'q3': ['12'], 'q4': ['12'], 
    'e1': ['13'], 'e2': ['13']
  }

  if (semesterToGrade[lowerInput as keyof typeof semesterToGrade]) {
    const grades = semesterToGrade[lowerInput as keyof typeof semesterToGrade]
    for (const grade of grades) {
      if (allOptions.includes(grade)) suggestions.push(grade)
    }
  }

  // Normale Jahrgangs-Vorschläge
  for (const option of allOptions) {
    if (option.startsWith(input) && !suggestions.includes(option)) {
      suggestions.push(option)
    }
  }

  return suggestions.slice(0, 5)
}

export function getClassSuggestions(input: string, allOptions: string[]): string[] {
  if (!input.trim()) return []
  
  const suggestions: string[] = []
  const lowerInput = input.toLowerCase().trim()

  // GK/LK Unterstützung
  if (lowerInput.includes('gk') || lowerInput.includes('grundkurs')) {
    allOptions.forEach(option => !suggestions.includes(option) && suggestions.push(option))
  } else if (lowerInput.includes('lk') || lowerInput.includes('leistungskurs')) {
    allOptions.forEach(option => !suggestions.includes(option) && suggestions.push(option))
  }

  // Normale Klassen-Vorschläge
  for (const option of allOptions) {
    if (option.toLowerCase().startsWith(lowerInput) && !suggestions.includes(option)) {
      suggestions.push(option)
    }
  }

  return suggestions.slice(0, 5)
}

export function enrichOptionsWithOberstufe(options: string[], type: 'subject' | 'grade' | 'class'): string[] {
  const enriched = [...options]
  
  if (type === 'grade') {
    enriched.push('Q1', 'Q2', 'Q3', 'Q4', 'E1', 'E2')
  } else if (type === 'class') {
    enriched.push('GK', 'LK', 'Grundkurs', 'Leistungskurs')
  }
  
  return enriched
}







