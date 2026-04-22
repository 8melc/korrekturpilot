export const JSON_SCHEMA_ENFORCEMENT = `Alle folgenden Felder müssen IMMER vorhanden sein.
Leere Arrays sind erlaubt, fehlende Felder nicht:

- tasks[*].taskId
- tasks[*].taskTitle
- tasks[*].points (MUSS im Format "X/Y" sein, z.B. "3/5", "0/4", "8/10")
- tasks[*].whatIsCorrect
- tasks[*].whatIsWrong
- tasks[*].improvementTips
- tasks[*].teacherCorrections
- tasks[*].studentFriendlyTips
- tasks[*].studentAnswerSummary

- strengths
- nextSteps

Meta-Felder (maxPoints, achievedPoints, grade, studentName, class, subject, date)
und teacherConclusion werden vom Server ergänzt — NICHT vom Modell liefern.`;
