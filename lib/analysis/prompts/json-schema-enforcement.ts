export const JSON_SCHEMA_ENFORCEMENT = `Alle folgenden Felder müssen IMMER vorhanden sein.
Leere Arrays sind erlaubt, fehlende nicht:

- meta.studentName
- meta.class
- meta.subject
- meta.date
- meta.maxPoints
- meta.achievedPoints
- meta.grade

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

- teacherConclusion.summary
- teacherConclusion.studentPatterns
- teacherConclusion.learningNeeds
- teacherConclusion.recommendedActions`;
