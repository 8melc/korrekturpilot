// app/api/analyze/route.ts
// KONSISTENZ-UPDATE: GPT-4o mit Seed, Validation und 3x Retry

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getCurrentUser } from "@/lib/auth";
import { createClientFromRequest } from "@/lib/supabase/server";
import { executeWithRetry, isJWTExpiredError } from "@/lib/supabase/error-handler";
import { buildMasterAnalysisPrompt, MASTER_ANALYSIS_SYSTEM_PROMPT } from "@/lib/analysis/prompts/master-analysis-prompt";
import { JSON_SCHEMA_ENFORCEMENT } from "@/lib/analysis/prompts/json-schema-enforcement";
import { validateAnalysis, normalizeAnalysis } from "@/lib/analysis/validator";
import { getGradeInfo, getPerformanceLevel } from "@/lib/grades";
import { extractGradeLevelFromClassName } from "@/lib/analysis/controller";
import type { MasterAnalysisInput, UniversalAnalysis } from "@/lib/analysis/types";
import {
  generateDeterministicSeed,
  validateAnalysisOutput,
} from "@/lib/consistency";
import { mapToKlausurAnalyse } from "@/lib/analysis/mapper";

// Konstanten für Konsistenz
const MAX_VALIDATION_RETRIES = 3;
const MODEL = "gpt-4o"; // Upgrade von gpt-4o-mini

type UserRow = { credits: number };

type CorrectionRow = {
  id: string;
  status: string | null;
  analysis: any | null;
  student_name: string | null;
};

/**
 * Berechnet geschätzte Kosten basierend auf Token-Usage
 */
function calculateCost(
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  model: "gpt-4o-mini" | "gpt-4o"
): number {
  const prices = {
    "gpt-4o-mini": {
      input: 0.15 / 1_000_000,
      output: 0.6 / 1_000_000,
    },
    "gpt-4o": {
      input: 2.5 / 1_000_000,
      output: 10.0 / 1_000_000,
    },
  };

  const modelPrices = prices[model];
  const inputCost = usage.prompt_tokens * modelPrices.input;
  const outputCost = usage.completion_tokens * modelPrices.output;
  return inputCost + outputCost;
}

/**
 * Führt die konsistente Analyse mit GPT-4o durch
 * - Deterministischer Seed
 * - temperature: 0.0, top_p: 1
 * - JSON-Validation mit 3x Retry
 */
async function performConsistentAnalysis(
  input: MasterAnalysisInput,
  seed: number,
): Promise<UniversalAnalysis> {
  const openai = getOpenAIClient();

  const prompt = buildMasterAnalysisPrompt(input);
  const strictPointsInstruction = `\n\nKRITISCH - PUNKTEVERGABE:
- Bewerte die SCHÜLERANTWORTEN anhand des Erwartungshorizonts
- Vergleiche jede Schülerantwort mit der Musterlösung und vergib Punkte für korrekte Inhalte
- Die MAXIMALPUNKTZAHL pro Aufgabe ergibt sich aus dem Erwartungshorizont
- Vergib Teilpunkte, wenn die Antwort teilweise korrekt ist
- Vergib 0 Punkte NUR wenn die Antwort komplett fehlt oder komplett falsch ist
- Wenn ein Schüler etwas Richtiges geschrieben hat, MUSS er dafür Punkte bekommen`;

  const systemPrompt = `${MASTER_ANALYSIS_SYSTEM_PROMPT}\n\n${JSON_SCHEMA_ENFORCEMENT}${strictPointsInstruction}`;

  let lastError: Error | null = null;
  let lastValidationErrors: string[] = [];

  for (let attempt = 0; attempt < MAX_VALIDATION_RETRIES; attempt++) {
    try {
      console.log(`[Konsistenz] Analyse-Versuch ${attempt + 1}/${MAX_VALIDATION_RETRIES}`, {
        model: MODEL,
        seed,
      });

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.0, // Maximal deterministisch
        top_p: 1, // Standard (bei temp 0 irrelevant, aber explizit)
        seed: seed, // Deterministischer Seed
        response_format: { type: "json_object" },
        max_tokens: 16384,
      });

      // Token-Usage Tracking
      if (response.usage) {
        const cost = calculateCost(response.usage, MODEL);
        console.log(`[Token-Usage] Konsistente Analyse (${MODEL}):`, {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
          estimated_cost_usd: cost.toFixed(6),
          seed,
          attempt: attempt + 1,
        });
      }

      // System Fingerprint loggen (für Reproduzierbarkeit)
      if (response.system_fingerprint) {
        console.log(`[Konsistenz] System Fingerprint: ${response.system_fingerprint}`);
      }

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Keine Antwort von OpenAI erhalten");
      }

      // JSON parsen
      let analysis: any;
      try {
        analysis = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`JSON-Parsing fehlgeschlagen: ${parseError}`);
      }

      // Strukturelle Validierung (Schema)
      const schemaValidation = validateAnalysis(analysis);
      if (!schemaValidation.isValid) {
        console.warn(
          `[Konsistenz] Schema-Validierung fehlgeschlagen (Versuch ${attempt + 1}):`,
          schemaValidation.errors
        );
        lastValidationErrors = schemaValidation.errors;

        if (attempt < MAX_VALIDATION_RETRIES - 1) {
          continue; // Retry
        }
        // Letzter Versuch: Normalisiere trotzdem
      }

      // Konsistenz-Validierung (Punkte, Evidence)
      const consistencyValidation = validateAnalysisOutput(analysis);
      if (!consistencyValidation.valid) {
        console.warn(
          `[Konsistenz] Konsistenz-Validierung fehlgeschlagen (Versuch ${attempt + 1}):`,
          consistencyValidation.errors
        );
        lastValidationErrors = [
          ...lastValidationErrors,
          ...consistencyValidation.errors,
        ];

        if (attempt < MAX_VALIDATION_RETRIES - 1) {
          continue; // Retry
        }
        // Letzter Versuch: Logge Fehler aber fahre fort
        console.error(
          "[Konsistenz] Alle Retries fehlgeschlagen. Validation Errors:",
          lastValidationErrors
        );
      }

      // Debug: Zeige Punkte pro Aufgabe vor Normalisierung
      console.log("[Konsistenz] GPT-4o Rohpunkte:", {
        metaAchieved: analysis.meta?.achievedPoints,
        metaMax: analysis.meta?.maxPoints,
        taskPoints: analysis.tasks?.map((t: any) => `${t.taskId}: ${t.points}`) || [],
      });

      // Normalisieren (korrigiert Punkte aus Einzelaufgaben)
      const normalized = normalizeAnalysis(analysis);

      // Note berechnen basierend auf korrekten Punkten
      if (!normalized.meta.grade && normalized.meta.maxPoints > 0) {
        const percentage =
          (normalized.meta.achievedPoints / normalized.meta.maxPoints) * 100;
        const gradeLevel = extractGradeLevelFromClassName(input.className);
        const gradeInfo = getGradeInfo({ prozent: percentage, gradeLevel });
        normalized.meta.grade = gradeInfo.label;

        console.log("[Konsistenz] Note berechnet:", {
          achievedPoints: normalized.meta.achievedPoints,
          maxPoints: normalized.meta.maxPoints,
          percentage: percentage.toFixed(2) + "%",
          gradeLevel,
          grade: gradeInfo.label,
        });

        if (!normalized.meta.performanceLevel) {
          normalized.meta.performanceLevel = getPerformanceLevel(percentage);
        }
      }

      // Meta-Daten setzen falls fehlend
      if (!normalized.meta.studentName && input.studentName) {
        normalized.meta.studentName = input.studentName;
      }
      if (!normalized.meta.class && input.className) {
        normalized.meta.class = input.className;
      }
      if (!normalized.meta.subject && input.subject) {
        normalized.meta.subject = input.subject;
      }
      if (!normalized.meta.date) {
        normalized.meta.date = new Date().toISOString().split("T")[0];
      }

      console.log(`[Konsistenz] Analyse erfolgreich nach ${attempt + 1} Versuch(en)`);
      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Konsistenz] Fehler (Versuch ${attempt + 1}):`, {
        message: lastError.message,
        name: lastError.name,
      });

      if (attempt < MAX_VALIDATION_RETRIES - 1) {
        // Exponential backoff
        const waitTime = 1000 * (attempt + 1);
        console.log(`[Konsistenz] Warte ${waitTime}ms vor Retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  // Alle Retries fehlgeschlagen
  const finalError = new Error(
    `Analyse fehlgeschlagen nach ${MAX_VALIDATION_RETRIES} Versuchen. ` +
      `Letzte Validation-Fehler: ${lastValidationErrors.join("; ")}. ` +
      `Letzter Error: ${lastError?.message || "Unbekannt"}`
  );
  console.error("[Konsistenz]", finalError.message);
  throw finalError;
}

export async function POST(request: NextRequest) {
  // 1. User prüfen
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nicht eingeloggt. Bitte melde dich an." },
      { status: 401 }
    );
  }

  const supabase = createClientFromRequest(request);

  // 2. Body EINMAL lesen
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body (kein gültiges JSON)." },
      { status: 400 }
    );
  }

  const {
    klausurText,
    erwartungshorizont,
    subject,
    studentName,
    className,
    correctionId,
  } = body ?? {};

  // 3. RESULT FREEZING – nie doppelt analysieren
  let correctionData: CorrectionRow | null = null;

  if (typeof correctionId === "string" && correctionId.trim().length > 0) {
    const { data: existingCorrection, error: checkError } =
      await executeWithRetry<CorrectionRow | null>(async (client) => {
        const sb = client ?? supabase;
        return await sb
          .from("corrections")
          .select("id,status,analysis,student_name")
          .eq("id", correctionId)
          .eq("user_id", user.id)
          .maybeSingle();
      }, supabase);

    if (!checkError && existingCorrection) {
      correctionData = existingCorrection;
      const status = existingCorrection.status ?? "";
      const isReady =
        status === "Bereit" || status === "completed" || status === "Completed";

      if (isReady && existingCorrection.analysis) {
        console.log(
          "[Konsistenz] Result Freezing: Verwende gespeichertes Ergebnis für",
          correctionId
        );
        return NextResponse.json({
          ...existingCorrection.analysis,
          reused: true,
          creditUsed: false,
        });
      }
    } else if (checkError) {
      console.warn(
        "[Konsistenz] Fehler beim Prüfen vorhandener Ergebnisse:",
        checkError
      );
    }
  }

  // 4. Credits prüfen – ABER noch NICHT abziehen
  const { data: userData, error: userError } = await executeWithRetry<UserRow | null>(
    async (client) => {
    const sb = client ?? supabase;
      return await sb.from("users").select("credits").eq("id", user.id).single();
    },
    supabase
  );

  if (userError || !userData) {
    if (isJWTExpiredError(userError)) {
      return NextResponse.json(
        { error: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Fehler beim Laden der Credits." },
      { status: 500 }
    );
  }

  if (userData.credits < 1) {
    return NextResponse.json(
      {
        error: "Nicht genug Credits",
        credits: userData.credits,
        message:
          "Du hast keine Credits mehr. Bitte kaufe ein Paket mit 25 Klausuren für 7,90 €.",
      },
      { status: 402 }
    );
  }

  try {
    // 5. Eingaben validieren
    if (!klausurText) {
      return NextResponse.json(
        {
          error:
            "Klausur-Text fehlt. Die PDF-Extraktion war möglicherweise nicht erfolgreich.",
          details: "Bitte prüfe, ob die PDF-Datei lesbar ist und Text enthält.",
        },
        { status: 400 }
      );
    }
    if (typeof klausurText !== "string" || klausurText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "Klausur-Text ist leer. Die PDF-Extraktion hat keinen Text gefunden.",
          details:
            "Bitte prüfe, ob die PDF-Datei Text enthält oder ob es sich um ein gescanntes Bild handelt.",
        },
        { status: 400 }
      );
    }
    if (!erwartungshorizont) {
      return NextResponse.json(
        {
          error:
            "Erwartungshorizont fehlt. Bitte lade zuerst den Erwartungshorizont hoch.",
          details:
            "Der Erwartungshorizont ist erforderlich, um die Klausur zu bewerten.",
        },
        { status: 400 }
      );
    }
    if (
      typeof erwartungshorizont !== "string" ||
      erwartungshorizont.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Erwartungshorizont ist leer. Bitte lade einen gültigen Erwartungshorizont hoch.",
          details: "Der Erwartungshorizont muss Text enthalten.",
        },
        { status: 400 }
      );
    }
    if (klausurText.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Klausur-Text ist zu kurz. Die PDF-Extraktion hat möglicherweise nicht funktioniert.",
          details: "Bitte prüfe, ob die PDF-Datei korrekt ist.",
        },
        { status: 400 }
      );
    }
    if (erwartungshorizont.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Erwartungshorizont ist zu kurz. Bitte lade einen vollständigen Erwartungshorizont hoch.",
          details: "Der Erwartungshorizont muss ausreichend Inhalt enthalten.",
        },
        { status: 400 }
      );
    }

    // 6. Deterministischen Seed generieren
    const effectiveStudentName =
      studentName || correctionData?.student_name || "unknown";
    const effectiveCorrectionId = correctionId || `temp_${Date.now()}`;

    const deterministicSeed = generateDeterministicSeed(
      effectiveCorrectionId,
      effectiveStudentName
    );

    console.log("[Konsistenz] Starte Analyse...", {
      klausurTextLength: klausurText.length,
      erwartungshorizontLength: erwartungshorizont.length,
      model: MODEL,
      seed: deterministicSeed,
      studentName: effectiveStudentName,
      correctionId: effectiveCorrectionId,
    });

    // 8. Analyse durchführen (mit Validation und Retry)
        const input: MasterAnalysisInput = {
          klausurText,
          erwartungshorizont,
          subject,
      studentName: effectiveStudentName,
          className,
    };

    const analysis = await performConsistentAnalysis(
      input,
      deterministicSeed,
    );

    // 9. Logging
    const aufgabenAnzahl = analysis.tasks?.length ?? 0;
    const erreichtePunkte = analysis.meta?.achievedPoints ?? 0;
    const maxPunkte = analysis.meta?.maxPoints ?? 0;

    console.log("[Konsistenz] Analyse erfolgreich abgeschlossen:", {
      aufgabenAnzahl,
      erreichtePunkte,
      maxPunkte,
      note: analysis.meta?.grade,
      seed: deterministicSeed,
    });

    // 10. Credits NUR JETZT, nach Erfolg, einmalig abziehen
    let creditDeducted = false;
    const { error: creditError } = await executeWithRetry(async (client) => {
      const sb = client ?? supabase;
      return await sb.rpc("add_credits", {
        user_id: user.id,
        amount: -1,
      });
    }, supabase);

    if (creditError) {
      if (isJWTExpiredError(creditError)) {
        console.warn(
          "[Konsistenz] Session expired after analysis, but analysis was successful"
        );
      } else {
        console.error("[Konsistenz] Fehler beim Verbrauchen des Credits:", creditError);
      }
    } else {
      creditDeducted = true;
    }

    // 11. Aktuelle Credits holen
    const { data: updatedUser, error: updatedError } =
      await executeWithRetry<UserRow | null>(async (client) => {
      const sb = client ?? supabase;
      return await sb
        .from("users")
        .select("credits")
        .eq("id", user.id)
        .single();
    }, supabase);

    const remainingCredits =
      !updatedError && updatedUser ? updatedUser.credits : userData.credits;

    // Mappe UniversalAnalysis → KlausurAnalyse für die UI-Kompatibilität
    const klausurAnalyse = mapToKlausurAnalyse(analysis);

    return NextResponse.json({
      ...klausurAnalyse,
      credits: remainingCredits,
      creditUsed: creditDeducted,
      _consistency: {
        model: MODEL,
        seed: deterministicSeed,
        actualTaskCount: aufgabenAnzahl,
      },
    });
  } catch (error: any) {
    // 12. Bei Fehlern KEIN Credit-Abzug, klarer Fehler-Response
    console.error("[Konsistenz] Analyze error:", error);
    console.error("[Konsistenz] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    const isRateLimitError =
      (error as any)?.status === 429 ||
      (error as any)?.code === "rate_limit_exceeded" ||
      (error as any)?.message?.toLowerCase?.().includes("rate limit");

    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze";

    const userFriendlyMessage = isRateLimitError
      ? "OpenAI ist gerade überlastet. Bitte versuche es in ein paar Minuten erneut."
      : errorMessage;

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
        creditUsed: false,
      },
      { status: isRateLimitError ? 429 : 500 }
    );
  }
}
