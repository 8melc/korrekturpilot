import { getOpenAIClient } from '../openai';
import { buildMasterAnalysisPrompt, MASTER_ANALYSIS_SYSTEM_PROMPT } from './prompts/master-analysis-prompt';
import { buildTeacherRenderPrompt, TEACHER_RENDER_SYSTEM_PROMPT } from './prompts/teacher-render-prompt';
import { buildStudentRenderPrompt, STUDENT_RENDER_SYSTEM_PROMPT } from './prompts/student-render-prompt';
import { validateAnalysis, normalizeAnalysis } from './validator';
import { JSON_SCHEMA_ENFORCEMENT } from './prompts/json-schema-enforcement';
import type { UniversalAnalysis, MasterAnalysisInput, RenderInput } from './types';
import { getGradeInfo, getPerformanceLevel } from '../grades';
import { polishLanguage } from '../language-polisher';
import { validateDistribution, getDistributionConfig, calculatePercentage } from './strength-nextsteps-distribution';

const MAX_RETRIES = 3;

/**
 * Extrahiert Klassenstufe aus className String
 * BUG1 Fix: Dynamisches gradeLevel aus className
 * @param className - Klassenname wie "10a", "11b", "Klasse 12"
 * @returns Klassenstufe (1-13) oder 10 als Fallback
 */
export function extractGradeLevelFromClassName(className: string | undefined): number {
  if (!className) return 10; // Fallback: SEK I
  
  const match = className.match(/(\d{1,2})/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 13) {
      return parsed;
    }
  }
  
  return 10; // Fallback
}

/**
 * Berechnet geschätzte Kosten basierend auf Token-Usage
 */
function calculateCost(
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  model: 'gpt-4o-mini' | 'gpt-4o'
): number {
  // Preise pro 1M Tokens (Stand 2024)
  const prices = {
    'gpt-4o-mini': {
      input: 0.15 / 1_000_000,
      output: 0.60 / 1_000_000,
    },
    'gpt-4o': {
      input: 2.50 / 1_000_000,
      output: 10.00 / 1_000_000,
    },
  };

  const modelPrices = prices[model];
  const inputCost = usage.prompt_tokens * modelPrices.input;
  const outputCost = usage.completion_tokens * modelPrices.output;
  return inputCost + outputCost;
}

/**
 * Führt die Master-Analyse durch (fachspezifisch, universales JSON)
 */
export async function performMasterAnalysis(
  input: MasterAnalysisInput
): Promise<UniversalAnalysis> {
  const openai = getOpenAIClient();
  
  const prompt = buildMasterAnalysisPrompt(input);
  const strictPointsInstruction = `\n\nKRITISCH - PUNKTEVERGABE:
- PUNKTE MÜSSEN AUSSCHLIESSLICH AUS DEM ERWARTUNGSHORIZONT EXTRAHIERT WERDEN
- KEINE TEILPUNKTE ERFINDEN ODER "GROSSZÜGIG" BEWERTEN
- KEINE PUNKTE VERGEBEN, DIE NICHT IM ERWARTUNGSHORIZONT STEHEN
- JEDE PUNKTVERGABE MUSS SICH DIREKT AUS DEM ERWARTUNGSHORIZONT ABLEITEN LASSEN`;
  const systemPrompt = `${MASTER_ANALYSIS_SYSTEM_PROMPT}\n\n${JSON_SCHEMA_ENFORCEMENT}${strictPointsInstruction}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.0, // BUG4 Fix: Deterministisch für konsistente Bewertungen
        top_p: 0.1, // BUG4 Fix: Zusätzliche Deterministik
        response_format: { type: 'json_object' },
        max_tokens: 16384, // Erhöhtes Token-Limit für vollständige Analysen
      });

      // Token-Usage Tracking
      if (response.usage) {
        const cost = calculateCost(response.usage, 'gpt-4o-mini');
        console.log('[Token-Usage] Master-Analyse:', {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
          estimated_cost_usd: cost.toFixed(6),
        });
      }

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Keine Antwort von OpenAI erhalten');
      }

      // ============================================================================
      // ROBUSTE TASK-EXTRAKTION: Multi-Pass Regex mit Fallbacks
      // ============================================================================
      const parseExpectationHorizon = (text: string): string[] => {
        const tasks: string[] = [];
        
        // PASS 1: Strikte IDs (1.1, 1.2, 2.3, etc.)
        const strictMatches = text.match(/\d+\.\d+/g) || [];
        if (strictMatches.length > 0) {
          const unique = [...new Set(strictMatches)];
          console.log('[Task-Parse] Pass 1 (strikt):', unique.length, 'Aufgaben gefunden');
          return unique;
        }
        
        // PASS 2: "Aufgabe X" oder "Frage X" oder "Task X"
        const aufgabeMatches = text.match(/(?:Aufgabe|Frage|Task)\s+(\d+(?:\.\d+)?)/gi) || [];
        if (aufgabeMatches.length > 0) {
          const extracted = aufgabeMatches.map(m => {
            const numMatch = m.match(/\d+(?:\.\d+)?/);
            return numMatch ? numMatch[0] : '';
          }).filter(Boolean);
          const unique = [...new Set(extracted)];
          console.log('[Task-Parse] Pass 2 (Aufgabe/Frage):', unique.length, 'Aufgaben gefunden');
          return unique;
        }
        
        // PASS 3: Einfache Nummern am Zeilenanfang (1., 2., 1), 2)), etc.
        const lines = text.split('\n');
        const lineNumberMatches: string[] = [];
        for (const line of lines) {
          // Suche nach Nummern am Zeilenanfang: "1.", "2.", "1)", "2)", etc.
          const match = line.match(/^\s*(\d+)[\.\)]\s/);
          if (match) {
            lineNumberMatches.push(match[1]);
          }
        }
        if (lineNumberMatches.length > 0) {
          const unique = [...new Set(lineNumberMatches)];
          console.log('[Task-Parse] Pass 3 (Zeilenanfang):', unique.length, 'Aufgaben gefunden');
          return unique;
        }
        
        // NOTFALL-MODUS: Keine Aufgabenstruktur erkannt
        console.warn('[Task-Parse] ⚠️ Keine explizite Aufgabenstruktur erkannt. Nutze gesamten Text als eine Aufgabe.');
        return ['Gesamt'];
      };
      
      const uniqueAufgaben = parseExpectationHorizon(input.erwartungshorizont);
      console.log('=== OPENAI RESPONSE DEBUG (Master-Analyse) ===');
      console.log('Anzahl Aufgaben im Erwartungshorizont:', uniqueAufgaben.length);
      console.log('Aufgaben IDs im Erwartungshorizont:', uniqueAufgaben);

      let analysis: any;
      try {
        analysis = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`JSON-Parsing fehlgeschlagen: ${parseError}`);
      }
      
      console.log('Anzahl Aufgaben in OpenAI Response:', analysis.tasks?.length || 0);
      console.log('Aufgaben IDs in Response:', analysis.tasks?.map((t: any) => t.taskId) || []);
      
      if (analysis.tasks && analysis.tasks.length < uniqueAufgaben.length) {
        console.warn(`⚠️ WARNUNG: Response enthält nur ${analysis.tasks.length} Aufgaben, aber Erwartungshorizont hat ${uniqueAufgaben.length} Aufgaben!`);
        console.warn('Fehlende Aufgaben:', uniqueAufgaben.filter(id => 
          !analysis.tasks?.some((t: any) => t.taskId.includes(id))
        ));
      }

      // Validierung
      const validation = validateAnalysis(analysis);
      if (!validation.isValid) {
        console.warn(`Validierungsfehler (Versuch ${attempt + 1}):`, validation.errors);
        if (attempt < MAX_RETRIES - 1) {
          continue; // Retry
        }
        // Letzter Versuch: Normalisiere trotzdem
        analysis = normalizeAnalysis(analysis);
      }

          // WICHTIG: Normalisiere ZUERST, damit Punkte korrekt berechnet werden
          const normalized = normalizeAnalysis(analysis);
          
          // Berechne Note basierend auf KORREKTEN Punkten (aus Einzelaufgaben berechnet)
          if (!normalized.meta.grade && normalized.meta.maxPoints > 0) {
            const percentage = (normalized.meta.achievedPoints / normalized.meta.maxPoints) * 100;
            // Versuche, aus input.className eine Klassenstufe zu extrahieren, z.B. "10a" -> 10
            const gradeLevel = extractGradeLevelFromClassName(input.className);
            const gradeInfo = getGradeInfo({ prozent: percentage, gradeLevel });
            normalized.meta.grade = gradeInfo.label;
            
            // Logging für Punkteberechnung (BUG1+4 Debug)
            console.log('[Grade Calculation]', {
              achievedPoints: normalized.meta.achievedPoints,
              maxPoints: normalized.meta.maxPoints,
              percentage: percentage.toFixed(2) + '%',
              gradeLevel,
              grade: gradeInfo.label,
              className: input.className || 'N/A',
            });
            if (!normalized.meta.performanceLevel) {
              normalized.meta.performanceLevel = getPerformanceLevel(percentage);
            }
          }
          
          // Verwende normalisierte Analyse für weitere Verarbeitung
          analysis = normalized;

      // Setze Meta-Daten falls fehlen
      if (!analysis.meta.studentName && input.studentName) {
        analysis.meta.studentName = input.studentName;
      }
      if (!analysis.meta.class && input.className) {
        analysis.meta.class = input.className;
      }
      if (!analysis.meta.subject && input.subject) {
        analysis.meta.subject = input.subject;
      }
      if (!analysis.meta.date) {
        analysis.meta.date = new Date().toISOString().split('T')[0];
      }

      // normalized wurde bereits oben berechnet
      // Prüfe und korrigiere Verteilung von Stärken und Nächsten Schritten
      const percentage = calculatePercentage(analysis.meta.achievedPoints, analysis.meta.maxPoints);
      const distributionCheck = validateDistribution(analysis.strengths, analysis.nextSteps, percentage);

      if (distributionCheck.needsCorrection) {
        console.warn('Verteilung von Stärken/Nächsten Schritten entspricht nicht der Leistung:', {
          percentage,
          currentStrengths: analysis.strengths.length,
          currentNextSteps: analysis.nextSteps.length,
          expectedStrengths: `${distributionCheck.config.strengthsCount.min}-${distributionCheck.config.strengthsCount.max}`,
          expectedNextSteps: `${distributionCheck.config.nextStepsCount.min}-${distributionCheck.config.nextStepsCount.max}`,
        });

        // Versuche aus verfügbaren Daten zu ergänzen
        const enriched = enrichStrengthsAndNextSteps(analysis, distributionCheck.config);
        return enriched;
      }

      return analysis;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Master-Analyse Fehler (Versuch ${attempt + 1}):`, {
        message: lastError.message,
        stack: lastError.stack,
        name: lastError.name,
      });
      
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
    }
  }

  const finalError = lastError || new Error('Master-Analyse fehlgeschlagen nach mehreren Versuchen');
  console.error('Master-Analyse endgültig fehlgeschlagen:', {
    message: finalError.message,
    stack: finalError.stack,
  });
  throw finalError;
}

/**
 * Ergänzt Stärken und Nächste Schritte basierend auf der Verteilungslogik
 * Falls die KI zu wenig generiert hat, werden Items aus verfügbaren Datenquellen ergänzt
 */
function enrichStrengthsAndNextSteps(
  analysis: UniversalAnalysis,
  config: ReturnType<typeof getDistributionConfig>
): UniversalAnalysis {
  let strengths = [...analysis.strengths];
  let nextSteps = [...analysis.nextSteps];

  // Ergänze Stärken falls zu wenig
  if (strengths.length < config.strengthsCount.min) {
    // Extrahiere aus whatIsCorrect der Aufgaben
    const additionalStrengths: string[] = [];
    analysis.tasks.forEach((task) => {
      task.whatIsCorrect.forEach((item) => {
        if (additionalStrengths.length < config.strengthsCount.max - strengths.length) {
          // Formuliere in Du-Form um
          const duForm = item
            .replace(/\bder\/die\s+schüler\/in\b/gi, 'du')
            .replace(/\bder\s+schüler\b/gi, 'du')
            .replace(/\bdie\s+schülerin\b/gi, 'du');
          if (duForm && !strengths.includes(duForm) && !additionalStrengths.includes(duForm)) {
            additionalStrengths.push(duForm);
          }
        }
      });
    });
    strengths = [...strengths, ...additionalStrengths].slice(0, config.strengthsCount.max);
  }

  // Ergänze Nächste Schritte falls zu wenig
  if (nextSteps.length < config.nextStepsCount.min) {
    // Extrahiere aus improvementTips und learningNeeds
    const additionalNextSteps: string[] = [];
    
    // Aus improvementTips
    analysis.tasks.forEach((task) => {
      task.improvementTips.forEach((tip) => {
        if (additionalNextSteps.length < config.nextStepsCount.max - nextSteps.length) {
          // Formuliere als positiven Lernschritt (nicht als Fehlerbeschreibung)
          const learningStep = tip
            .replace(/\bder\/die\s+schüler\/in\b/gi, 'du')
            .replace(/\bder\s+schüler\b/gi, 'du')
            .replace(/\bdie\s+schülerin\b/gi, 'du')
            .replace(/\bdu\s+hast\s+nicht\b/gi, 'übe')
            .replace(/\bfehlt\b/gi, 'wiederhole');
          if (learningStep && !nextSteps.includes(learningStep) && !additionalNextSteps.includes(learningStep)) {
            additionalNextSteps.push(learningStep);
          }
        }
      });
    });

    // Aus learningNeeds
    analysis.teacherConclusion.learningNeeds.forEach((need) => {
      if (additionalNextSteps.length < config.nextStepsCount.max - nextSteps.length) {
        const learningStep = `Wiederhole: ${need}`;
        if (!nextSteps.includes(learningStep) && !additionalNextSteps.includes(learningStep)) {
          additionalNextSteps.push(learningStep);
        }
      }
    });

    nextSteps = [...nextSteps, ...additionalNextSteps].slice(0, config.nextStepsCount.max);
  }

  // Stelle sicher, dass mindestens die Mindestanzahl vorhanden ist
  if (strengths.length < config.strengthsCount.min) {
    strengths.push('Du hast die Aufgabenstellung grundlegend verstanden.');
  }
  if (nextSteps.length < config.nextStepsCount.min) {
    nextSteps.push('Wiederhole die wichtigsten Fachbegriffe zu diesem Thema.');
  }

  return {
    ...analysis,
    strengths: strengths.slice(0, config.strengthsCount.max),
    nextSteps: nextSteps.slice(0, config.nextStepsCount.max),
  };
}

/**
 * Rendert Analyse für Lehrer (3. Person, formal)
 */
export async function renderForTeacher(analysis: UniversalAnalysis): Promise<string> {
  const openai = getOpenAIClient();
  
  const prompt = buildTeacherRenderPrompt(analysis);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: TEACHER_RENDER_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    // Token-Usage Tracking
    if (response.usage) {
      const cost = calculateCost(response.usage, 'gpt-4o-mini');
      console.log('[Token-Usage] Teacher-Render:', {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        estimated_cost_usd: cost.toFixed(6),
      });
    }

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Teacher-Render Fehler:', error);
    throw new Error('Fehler beim Rendern für Lehrer');
  }
}

/**
 * Rendert Analyse für Schüler (Du-Form, motivierend)
 * Pipeline: analysis → renderForStudent() → polishLanguage() → return polishedText
 * 
 * Gibt ein Objekt mit strengths und nextSteps Arrays zurück (polished)
 */
export async function renderForStudent(analysis: UniversalAnalysis): Promise<{
  strengths: string[];
  nextSteps: string[];
}> {
  const openai = getOpenAIClient();
  
  const prompt = buildStudentRenderPrompt(analysis);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: STUDENT_RENDER_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    // Token-Usage Tracking
    if (response.usage) {
      const cost = calculateCost(response.usage, 'gpt-4o-mini');
      console.log('[Token-Usage] Student-Render:', {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        estimated_cost_usd: cost.toFixed(6),
      });
    }

    const responseText = response.choices[0]?.message?.content || '';
    
    if (!responseText) {
      throw new Error('Keine Antwort von OpenAI erhalten');
    }

    // Parse JSON-Response
    let parsed: { strengths?: string[]; nextSteps?: string[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`JSON-Parsing fehlgeschlagen: ${parseError}`);
    }

    const rawStrengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    const rawNextSteps = Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [];

    // Language-Polishing: Korrigiere Grammatik, Rechtschreibung, Konjugation für jedes Array-Element
    try {
      const [polishedStrengths, polishedNextSteps] = await Promise.all([
        Promise.all(rawStrengths.map((text) => polishLanguage(text))),
        Promise.all(rawNextSteps.map((text) => polishLanguage(text))),
      ]);

      return {
        strengths: polishedStrengths,
        nextSteps: polishedNextSteps,
      };
    } catch (polishingError) {
      console.warn('Language-Polishing fehlgeschlagen, verwende ungepolte Texte:', polishingError);
      return {
        strengths: rawStrengths,
        nextSteps: rawNextSteps,
      }; // Fallback: Ungepolte Texte
    }
  } catch (error) {
    console.error('Student-Render Fehler:', error);
    throw new Error('Fehler beim Rendern für Schüler');
  }
}

/**
 * Hauptfunktion: Analysiert und rendert
 * 
 * @deprecated Diese Funktion wird möglicherweise nicht mehr verwendet.
 * Für Schüler-DOCX wird direkt renderAndPolishStudentDocSections() verwendet.
 * Für Lehrer-Ansicht wird renderForTeacher() verwendet.
 */
export async function analyzeAndRender(input: MasterAnalysisInput & { target: 'teacher' | 'student' }) {
  // Schritt 1: Master-Analyse
  const analysis = await performMasterAnalysis(input);
  
  // Schritt 2: Render basierend auf Target
  if (input.target === 'teacher') {
    const renderedText = await renderForTeacher(analysis);
    return {
      analysis,
      renderedText,
    };
  } else {
    // Für Schüler: renderForStudent gibt jetzt { strengths, nextSteps } zurück
    const studentData = await renderForStudent(analysis);
    return {
      analysis,
      renderedText: JSON.stringify(studentData), // Fallback für Kompatibilität
      studentData, // Neue Struktur
    };
  }
}
