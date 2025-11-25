import { VideoTriggersConfig } from './types';
import { RENDERING_KEYWORDS, DEMO_KEYWORD } from './constants';

export interface TriggerMatchResult {
  matched: boolean;
  videoUrl?: string;
  triggerId?: string;
  matchedKeywords?: string[];
}

export function checkForDemoTrigger(
  speech: string,
  videoTriggers: VideoTriggersConfig,
  onLog: (category: string, message: string, data?: any) => void
): TriggerMatchResult {
  const lowerSpeech = speech.toLowerCase();
  // Split into words and strip punctuation
  const tokens = lowerSpeech.split(/\s+/).map(word => word.replace(/[.,!?;:]/g, ''));

  onLog('DEMO_CHECK', `Checking last avatar speech: "${speech}"`, { tokens });

  // Step 1: Check for primary keywords (rendering/render AND demo)
  const hasRenderingKeyword = RENDERING_KEYWORDS.some(kw => tokens.includes(kw));
  const hasDemoKeyword = tokens.includes(DEMO_KEYWORD);

  if (!hasRenderingKeyword || !hasDemoKeyword) {
    onLog('DEMO_CHECK', '❌ Missing primary keywords (rendering/render + demo)');
    return { matched: false };
  }

  onLog('DEMO_CHECK', '✅ Primary keywords found, checking for company match...');

  // Step 2: Check for company-specific keywords
  for (const trigger of videoTriggers.triggers) {
    const secondaryKeywords = trigger.secondaryKeywords;

    // Skip generic demo for now (check it last)
    if (secondaryKeywords.length === 0) continue;

    // Check if any secondary keyword (company name) is present
    const hasCompanyKeyword = secondaryKeywords.some(kw =>
      tokens.includes(kw.toLowerCase())
    );

    if (hasCompanyKeyword) {
      const matchedKeywords = secondaryKeywords.filter(kw =>
        tokens.includes(kw.toLowerCase())
      );
      onLog('DEMO_TRIGGER', `🎬 Company-specific demo detected! (${trigger.id})`, {
        matchedKeywords,
        videoUrl: trigger.videoUrl,
      });
      return {
        matched: true,
        videoUrl: trigger.videoUrl,
        triggerId: trigger.id,
        matchedKeywords,
      };
    }
  }

  // Step 3: No company match → play generic demo
  const genericTrigger = videoTriggers.triggers.find(t =>
    t.secondaryKeywords.length === 0
  );

  if (genericTrigger) {
    onLog('DEMO_TRIGGER', '🎬 Generic demo triggered (no company specified)', {
      videoUrl: genericTrigger.videoUrl,
    });
    return {
      matched: true,
      videoUrl: genericTrigger.videoUrl,
      triggerId: genericTrigger.id,
    };
  }

  onLog('DEMO_CHECK', '❌ No generic demo fallback found in config');
  return { matched: false };
}
