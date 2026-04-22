import OpenAI from 'openai';
import { ANALYSIS_TEMPLATE } from './analysis-template';
import { generateLanguageInstructions, TEACHER_CONFIG, generateAdaptiveDetailLevel } from './analysis-language-config';
import { performMasterAnalysis } from './analysis/controller';
import type { UniversalAnalysis, MasterAnalysisInput } from './analysis/types';

let cachedClient: OpenAI | null = null;

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

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // Debug-Informationen für besseres Troubleshooting
    const envKeys = Object.keys(process.env).filter(key => key.includes('OPENAI'));
    console.error('[OpenAI Client] API Key nicht gefunden. Verfügbare ENV-Variablen mit "OPENAI":', envKeys);
    console.error('[OpenAI Client] NODE_ENV:', process.env.NODE_ENV);
    console.error('[OpenAI Client] CWD:', process.cwd());
    
    throw new Error(
      'OpenAI API Key nicht konfiguriert. ' +
      'Bitte stelle sicher, dass OPENAI_API_KEY in .env.local gesetzt ist und der Development Server neu gestartet wurde.'
    );
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: apiKey,
    });
  }

  return cachedClient;
}

export interface KlausurAnalyse {
  gesamtpunkte: number;
  erreichtePunkte: number;
  prozent: number;
  aufgaben: Array<{
    aufgabe: string;
    maxPunkte: number;
    erreichtePunkte: number;
    kommentar: string;
    korrekturen: string[];
  }>;
  zusammenfassung: string;
  _audit?: Record<string, unknown>;
  _consistency?: Record<string, unknown>;
  _manualOverride?: {
    edited: boolean;
    editedAt: string;
    version?: number;
  };
  reused?: boolean;
  creditUsed?: boolean;
}

export async function analyzeKlausur(
  klausurText: string,
  erwartungshorizont: string
): Promise<KlausurAnalyse> {
  const openai = getOpenAIClient();

  // Sprach-Konfiguration für Lehrer-Ansicht
  const languageConfig = TEACHER_CONFIG;
  const languageInstructions = generateLanguageInstructions(languageConfig);

  const prompt = `Du bist ein erfahrener Lehrer, der Klausuren korrigiert.

${languageInstructions}

ADAPTIVER DETAILGRAD (verbindlich - wende diese Regeln basierend auf den erreichten Punkten pro Aufgabe an):
- Wenn weniger als 40% der Punkte erreicht wurden:
  * Sehr ausführliche Analyse erforderlich
  * Mindestens 3–6 Fehlerpunkte in 'korrekturen' oder im Abschnitt 'HIER GAB ES ABZÜGE'
  * Mindestens 3–5 Verbesserungstipps im Abschnitt 'VERBESSERUNGSTIPP'
  * Detaillierte Erklärungen zu Missverständnissen
  * Ausführliche Begründung der Punktevergabe
  * Konkrete Beispiele für Fehler und Verbesserungen

- Wenn zwischen 40% und 70% der Punkte erreicht wurden:
  * Mittlere Tiefe der Analyse
  * 2–4 Fehlerpunkte in 'korrekturen' oder im Abschnitt 'HIER GAB ES ABZÜGE'
  * 2–4 Verbesserungstipps im Abschnitt 'VERBESSERUNGSTIPP'
  * Ausgewogene Darstellung von Stärken und Schwächen
  * Klare Begründung der Punktevergabe

- Wenn über 70% der Punkte erreicht wurden:
  * Kurze, präzise Analyse
  * 1–2 Fehlerpunkte in 'korrekturen' oder im Abschnitt 'HIER GAB ES ABZÜGE'
  * 1–2 Verbesserungstipps im Abschnitt 'VERBESSERUNGSTIPP'
  * Fokus auf Feinschliff und Optimierung
  * Betonung der Stärken mit gezielten Verbesserungsvorschlägen

Diese Regeln müssen für JEDE Aufgabe individuell angewendet werden, basierend auf den erreichten Punkten dieser Aufgabe.

ERWARTUNGSHORIZONT:
${erwartungshorizont}

Klausur-Text:
${klausurText}

${ANALYSIS_TEMPLATE.trim() !== '' ? `\n=== VORLAGE FÜR DIE ANALYSE ===
Diese Vorlage zeigt dir, wie eine perfekte Klausurbewertung aussehen soll:

${ANALYSIS_TEMPLATE}

WICHTIG: Orientiere dich an dieser Vorlage für:
- Struktur: Verwende die gleiche Art der Aufgabenanalyse (DAS WAR RICHTIG, HIER GAB ES ABZÜGE, VERBESSERUNGSTIPP)
- Detaillierungsgrad: Passe den Detailgrad an die erreichte Punktzahl an (siehe ADAPTIVER DETAILGRAD oben)
- Stil: Formuliere Kommentare und Korrekturen im gleichen präzisen, konstruktiven Stil
- Zusammenfassung: Schreibe eine PÄDAGOGISCHE GESAMTBEWERTUNG (8-12 Sätze), KEINE Aufgabe-für-Aufgabe-Auflistung. Beschreibe übergreifende Muster: Gesamteindruck, zentrale Stärken, Entwicklungsbereiche, nächste Schritte.

\n` : ''}
**KRITISCH - VOLLSTÄNDIGKEIT DER ANALYSE:**
1. Identifiziere ALLE Aufgaben im Erwartungshorizont (z.B. 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4)
2. Analysiere JEDE dieser Aufgaben - auch wenn der Schüler keine Antwort gegeben hat (dann: 0 Punkte, entsprechende Analyse)
3. Stelle sicher, dass deine Response GENAU SO VIELE Aufgaben enthält wie im Erwartungshorizont definiert
4. Wenn eine Aufgabe im Erwartungshorizont fehlt, ist deine Analyse UNVOLLSTÄNDIG und UNBRAUCHBAR

⚠️ KRITISCH WICHTIG FÜR STRUKTURFORMEL-AUFGABEN:

Diese Klausur kann HANDGEZEICHNETE chemische Strukturformeln enthalten.

BEWERTUNGSPRINZIP für Strukturformeln:
- Ist die KETTENLÄNGE korrekt? (Anzahl C-Atome)
- Ist die OH-Gruppe am richtigen Ort?
- Ist die GRUNDSTRUKTUR erkennbar?
- Gib TEILPUNKTE auch bei unleserlichen aber erkennbaren Strukturen
- NUR 0 Punkte wenn GAR KEINE Struktur vorhanden oder komplett falsch

BEISPIEL:
Aufgabe: "Zeichnen Sie die Strukturformel von Ethanol"
Erwartung: CH3-CH2-OH
- Schüler zeichnet: Unleserliche Linien mit "OH" → 2/4 Punkte (Struktur erkennbar)
- Schüler zeichnet: Klare Struktur mit 2 C und OH → 4/4 Punkte
- Schüler zeichnet: GAR NICHTS → 0/4 Punkte

Für JEDE Aufgabe die eine Zeichnung verlangt:
- Beschreibe detailliert was du in der Schülerantwort SIEHST
- Vergleiche mit Erwartung
- Bewerte großzügig bei unleserlichen aber erkennbaren Strukturen

Bitte analysiere die Klausur anhand des Erwartungshorizonts und gib eine detaillierte Bewertung im folgenden JSON-Format zurück:
{
  "gesamtpunkte": <maximale Gesamtpunktzahl>,
  "erreichtePunkte": <erreichte Punktzahl>,
  "prozent": <Prozentzahl>,
  "aufgaben": [
    {
      "aufgabe": "<Aufgabenbezeichnung>",
      "maxPunkte": <maximale Punkte>,
      "erreichtePunkte": <erreichte Punkte>,
      "kommentar": "<Detaillierter Kommentar zur Aufgabe - strukturiere wie in der Vorlage: DAS WAR RICHTIG (positive Aspekte in 3. Person), HIER GAB ES ABZÜGE (negative Aspekte in 3. Person), VERBESSERUNGSTIPP (konkrete Tipps in 3. Person). ALLE Texte müssen vollständige Sätze in 3. Person enthalten, keine 1-Wort-Stichpunkte.>",
      "korrekturen": ["<Vollständiger Satz als Korrekturhinweis 1 in 3. Person - formuliere präzise wie in der Vorlage>", "<Vollständiger Satz als Korrekturhinweis 2 in 3. Person>"]
    }
  ],
      "zusammenfassung": "<PÄDAGOGISCHE GESAMTBEWERTUNG in 8-12 Sätzen (3. Person). KEINE Aufgabe-für-Aufgabe-Auflistung. Stattdessen: Übergreifende Muster beschreiben. Struktur: 1) Allgemeines Leistungsniveau (2-3 Sätze), 2) Zentrale Stärken (2-4 Beobachtungen), 3) Entwicklungsbereiche (3-5 konkrete Hinweise), 4) Nächste Schritte (1-2 Sätze). Formuliere in sachlicher Lehrkraft-Perspektive (Die Schülerin/der Schüler..., Die Leistung zeigt...). Professionell, ermutigend, aber ehrlich.>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein präziser und fairer Lehrer. Antworte ausschließlich im angeforderten JSON-Format.

VERBINDLICHE REGELN (MÜSSEN IMMER EINGEHALTEN WERDEN):
1. SPRACHE: IMMER 3. Person für Lehrer-Ansicht. NIEMALS Du-Form oder direkte Anrede.
2. ADAPTIVER DETAILGRAD: Passe die Anzahl der Fehlerpunkte und Verbesserungstipps an die erreichte Punktzahl an (siehe ADAPTIVER DETAILGRAD im Prompt).
3. VOLLSTÄNDIGKEIT: Alle Felder müssen vollständige Sätze enthalten, keine leeren Felder, keine 1-Wort-Stichpunkte.
4. TON: Neutral, sachlich, formal, fachlich präzise. Keine Umgangssprache.
5. **KRITISCH - ALLE AUFGABEN ANALYSIEREN: Analysiere JEDE EINZELNE Aufgabe aus dem Erwartungshorizont. KEINE Aufgabe darf fehlen!**

WICHTIG - SPRACHQUALITÄT:
- Formuliere ALLE Rückmeldungen in perfektem, grammatikalisch korrektem Deutsch
- Verwende vollständige, gut strukturierte Sätze
- Schreibe in der 3. Person (z.B. 'Die Schülerin hat erkannt...', 'Die Antwort zeigt...')
- Vermeide Umgangssprache und unvollständige Sätze
- Achte auf korrekte Kommasetzung und Satzbau
- Formuliere präzise und sachlich, wie in einer professionellen Lehrerkorrektur
- Dies gilt für ALLE Felder: 'kommentar' (mit DAS WAR RICHTIG, HIER GAB ES ABZÜGE, VERBESSERUNGSTIPP), 'korrekturen', und 'zusammenfassung'

Orientiere dich an der bereitgestellten Vorlage für Stil, Detaillierungsgrad und Struktur der Analyse.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 16384, // Erhöhtes Token-Limit für vollständige Analysen
    });

    // Token-Usage Tracking
    if (response.usage) {
      const cost = calculateCost(response.usage, 'gpt-4o-mini');
      console.log('[Token-Usage] analyzeKlausur (alt):', {
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
    
    const uniqueAufgaben = parseExpectationHorizon(erwartungshorizont);
    console.log('=== OPENAI RESPONSE DEBUG (alte Funktion) ===');
    console.log('Anzahl Aufgaben im Erwartungshorizont:', uniqueAufgaben.length);
    console.log('Aufgaben IDs im Erwartungshorizont:', uniqueAufgaben);

    const analysis = JSON.parse(responseText) as KlausurAnalyse;
    
    console.log('Anzahl Aufgaben in OpenAI Response:', analysis.aufgaben?.length || 0);
    console.log('Aufgaben IDs in Response:', analysis.aufgaben?.map(a => a.aufgabe) || []);
    
    if (analysis.aufgaben && analysis.aufgaben.length < uniqueAufgaben.length) {
      console.warn(`⚠️ WARNUNG: Response enthält nur ${analysis.aufgaben.length} Aufgaben, aber Erwartungshorizont hat ${uniqueAufgaben.length} Aufgaben!`);
      console.warn('Fehlende Aufgaben:', uniqueAufgaben.filter(id => 
        !analysis.aufgaben?.some(a => a.aufgabe.includes(id))
      ));
    }
    
    return analysis;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw new Error('Fehler bei der Analyse der Klausur');
  }
}

/**
 * Neue universelle Analyse-Funktion (fachspezifisch, universales JSON)
 * Diese Funktion nutzt die neue Backend-Architektur
 * Ersetzt die alte analyzeKlausur-Funktion für neue Implementierungen
 */
export async function analyzeKlausurUniversal(
  input: MasterAnalysisInput
): Promise<UniversalAnalysis> {
  return performMasterAnalysis(input);
}
