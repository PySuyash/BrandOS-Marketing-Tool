import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  claims,
  departments,
  findings,
  guidelines,
  knowledgeItems,
  submissions,
  versions,
} from '../db/schema.js';

function normalizeText(s) {
  return s.toLowerCase().replace(/[\u2013\u2014–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findExactMatchSlice(content, term) {
  const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
  const m = content.match(regex);
  if (m) return m[0];
  const idx = content.toLowerCase().indexOf(term.toLowerCase());
  if (idx !== -1) return content.slice(idx, idx + term.length);
  return null;
}

export function retrieveRelevantKnowledge(content, deptFacts, limit = 10) {
  const contentTokens = new Set(
    normalizeText(content)
      .split(/[^a-z0-9%₹$]+/)
      .filter((t) => t.length >= 2)
  );

  const scored = deptFacts.map((fact) => {
    const factTokens = normalizeText(
      `${fact.title} ${fact.content} ${fact.factType}`
    )
      .split(/[^a-z0-9%₹$]+/)
      .filter((t) => t.length >= 2);
    let overlap = 0;
    for (const tok of factTokens) {
      if (contentTokens.has(tok)) overlap += 1;
    }
    return { fact, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.fact);
}

function runDeterministicRuleChecks(content, deptGuidelines) {
  const results = [];
  let counter = 1;
  const nextCode = (prefix) =>
    `FND-${prefix}-${String(counter++).padStart(3, '0')}`;

  for (const rule of deptGuidelines) {
    if (rule.status !== 'Active') continue;

    if (rule.ruleType === 'banned_word' && rule.bannedTerm) {
      const matched = findExactMatchSlice(content, rule.bannedTerm);
      if (matched) {
        results.push({
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          findingCode: nextCode('BND'),
          category: 'banned_word',
          highlightedText: matched,
          explanation: `${rule.title}: ${rule.description}`,
          severity: rule.severity || 'Blocker',
          confidence: 100,
          evidence: `Rule ${rule.ruleCode} (${rule.title}): "${rule.bannedTerm}" is prohibited in this department.`,
          suggestion: rule.preferredTerm || '[Remove prohibited phrase]',
          unchangedNote:
            'Your surrounding sentence structure and intent remain unchanged.',
        });
      }
    }

    if (rule.ruleType === 'preferred_word' && rule.bannedTerm) {
      const matched = findExactMatchSlice(content, rule.bannedTerm);
      if (matched) {
        results.push({
          ruleId: rule.id,
          ruleCode: rule.ruleCode,
          findingCode: nextCode('PRF'),
          category: 'preferred_word',
          highlightedText: matched,
          explanation: `${rule.title}: ${rule.description}`,
          severity: rule.severity || 'Minor',
          confidence: 100,
          evidence: `Rule ${rule.ruleCode}: Prefer "${rule.preferredTerm || 'approved alternative'}" over "${matched}".`,
          suggestion: rule.preferredTerm || matched,
          unchangedNote: 'Core message and meaning remain identical.',
        });
      }
    }
  }

  const readabilityRule = deptGuidelines.find(
    (g) => g.status === 'Active' && g.ruleType === 'readability'
  );
  if (readabilityRule) {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).filter(Boolean).length;
      if (wordCount > 28) {
        const midpoint = Math.floor(wordCount / 2);
        const words = sentence.split(/\s+/);
        const suggestedSplit = `${words.slice(0, midpoint).join(' ')}. ${words.slice(midpoint).join(' ')}`;
        results.push({
          ruleId: readabilityRule.id,
          ruleCode: readabilityRule.ruleCode,
          findingCode: nextCode('RDB'),
          category: 'readability',
          highlightedText: sentence,
          explanation: `This sentence contains ${wordCount} words, exceeding the 28-word clarity threshold.`,
          severity: readabilityRule.severity || 'Minor',
          confidence: 95,
          evidence: `Rule ${readabilityRule.ruleCode} (${readabilityRule.title}): ${readabilityRule.description}`,
          suggestion: suggestedSplit,
          unchangedNote:
            'Every fact and point in the sentence is preserved across two shorter statements.',
        });
        break;
      }
    }

    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const para of paragraphs) {
      const pWords = para.split(/\s+/).filter(Boolean).length;
      if (pWords > 120) {
        results.push({
          ruleId: readabilityRule.id,
          ruleCode: readabilityRule.ruleCode,
          findingCode: nextCode('RDB'),
          category: 'readability',
          highlightedText: para.slice(0, 110) + '...',
          explanation: `Paragraph has ${pWords} words; dense blocks above 120 words reduce scannability.`,
          severity: 'Minor',
          confidence: 90,
          evidence: `Rule ${readabilityRule.ruleCode}: Break paragraphs longer than 120 words into focused sections.`,
          suggestion:
            'Split this paragraph into two focused paragraphs at a natural topic transition.',
          unchangedNote: 'All existing points remain unchanged.',
        });
        break;
      }
    }

    const cleanWords = normalizeText(content)
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const trigramCounts = new Map();
    for (let i = 0; i <= cleanWords.length - 3; i++) {
      const tri = `${cleanWords[i]} ${cleanWords[i + 1]} ${cleanWords[i + 2]}`;
      trigramCounts.set(tri, (trigramCounts.get(tri) || 0) + 1);
    }
    for (const [tri, count] of trigramCounts.entries()) {
      if (count >= 2 && !tri.includes('business days')) {
        const matched = findExactMatchSlice(content, tri);
        if (matched) {
          results.push({
            ruleId: readabilityRule.id,
            ruleCode: readabilityRule.ruleCode,
            findingCode: nextCode('REP'),
            category: 'readability',
            highlightedText: matched,
            explanation: `The phrase "${matched}" is repeated ${count} times, creating redundant phrasing.`,
            severity: 'Minor',
            confidence: 88,
            evidence: `Rule ${readabilityRule.ruleCode}: Avoid repeating identical multi-word phrases.`,
            suggestion: matched,
            unchangedNote:
              'Vary phrasing on the second occurrence while keeping the same meaning.',
          });
          break;
        }
      }
    }

    const complexWordMap = {
      utilize: 'use',
      synergistic: 'collaborative',
      aforementioned: 'this',
      heretofore: 'previously',
    };
    for (const [complex, simple] of Object.entries(complexWordMap)) {
      const matched = findExactMatchSlice(content, complex);
      if (matched) {
        results.push({
          ruleId: readabilityRule.id,
          ruleCode: readabilityRule.ruleCode,
          findingCode: nextCode('CLR'),
          category: 'readability',
          highlightedText: matched,
          explanation: `"${matched}" can be replaced with simpler, clearer language.`,
          severity: 'Minor',
          confidence: 92,
          evidence: `Rule ${readabilityRule.ruleCode}: Prefer plain language over bureaucratic wording.`,
          suggestion: simple,
          unchangedNote: 'Sentence intent remains completely intact.',
        });
      }
    }
  }

  const requiredRules = deptGuidelines.filter(
    (g) =>
      g.status === 'Active' &&
      g.ruleType === 'required_messaging' &&
      g.requiredPhrase
  );
  for (const rule of requiredRules) {
    const options = (rule.requiredPhrase || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const hasAny = options.some((opt) =>
      content.toLowerCase().includes(opt.toLowerCase())
    );
    if (!hasAny && options.length > 0) {
      results.push({
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        findingCode: nextCode('REQ'),
        category: 'required_messaging',
        highlightedText: `[Missing required phrase: ${options[0]}]`,
        explanation: `${rule.title}: ${rule.description}`,
        severity: rule.severity || 'Minor',
        confidence: 95,
        evidence: `Rule ${rule.ruleCode}: Required department messaging should reference one of: ${options.join(', ')}.`,
        suggestion: rule.ruleCode.startsWith('HR')
          ? 'Please visit the People Portal or contact your HR Partner for details.'
          : rule.ruleCode.startsWith('SLS')
          ? 'Subject to standard Enterprise SLA terms.'
          : 'Explore our full guide to learn more.',
        unchangedNote:
          'All existing paragraphs remain intact; appends a brief required notice.',
      });
    }
  }

  const accessRule = deptGuidelines.find(
    (g) => g.status === 'Active' && g.ruleType === 'accessibility'
  );
  if (accessRule) {
    const missingAltMd = content.match(/!\[\s*\]\([^)]+\)/);
    const missingAltTag = content.match(/\[(?:image|img|photo|banner)\]/i);
    const missingHtmlAlt = content.match(
      /<img(?![^>]*\balt\s*=\s*["'][^"']+["'])[^>]*>/i
    );
    const match = missingAltMd?.[0] || missingAltTag?.[0] || missingHtmlAlt?.[0];
    if (match) {
      results.push({
        ruleId: accessRule.id,
        ruleCode: accessRule.ruleCode,
        findingCode: nextCode('ACC'),
        category: 'accessibility',
        highlightedText: match,
        explanation:
          'Image reference in submitted text is missing descriptive alt text.',
        severity: accessRule.severity || 'Major',
        confidence: 100,
        evidence: `Rule ${accessRule.ruleCode}: ${accessRule.description}`,
        suggestion:
          '![Descriptive alt text explaining the visual content](image-url)',
        unchangedNote:
          'Only adds accessible descriptive text for the referenced image.',
      });
    }
  }

  return results;
}

function runDeterministicClaimChecks(content, deptFacts) {
  const sentences = content
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const detected = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const validFacts = deptFacts.filter(
    (f) => f.status === 'Approved' && f.expiryDate >= todayStr
  );

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    if (
      /(no\.?\s*1|#\s*1|number\s+one|best\s+in\s+india|leading\s+platform|most\s+trusted)/i.test(
        sentence
      )
    ) {
      const rankFact = validFacts.find((f) => f.factType === 'ranking');
      if (rankFact) {
        detected.push({
          claimText: sentence,
          category: 'ranking',
          verdict: 'SUPPORTED',
          sourceId: rankFact.id,
          sourceQuote: rankFact.content,
          confidence: 88,
          explanation: `Supported by approved fact ${rankFact.factCode}.`,
          suggestion: null,
        });
      } else {
        detected.push({
          claimText: sentence,
          category: 'ranking',
          verdict: 'UNVERIFIED',
          sourceId: null,
          sourceQuote: null,
          confidence: 92,
          explanation:
            'No approved ranking or market-leadership fact exists in this department’s knowledge base.',
          suggestion:
            sentence
              .replace(
                /(?:India'?s\s+)?(?:No\.?\s*1|#\s*1|number\s+one)\s+(?:trusted\s+)?/i,
                ''
              )
              .trim() ||
            'Discover solutions designed to support your everyday needs.',
        });
      }
      continue;
    }

    if (
      /(deliver(?:ed|y)?\s+(?:within|in)\s+\d+|business\s+days?|hours?|rollout\s+in\s+\d+|onboarding\s+takes)/i.test(
        sentence
      )
    ) {
      const deliveryFact = validFacts.find((f) => f.factType === 'delivery');
      if (deliveryFact) {
        const factNorm = normalizeText(deliveryFact.content);
        const sentNorm = normalizeText(sentence);
        const factNums =
          factNorm.match(/\d+(?:-\d+)?\s*(?:business\s+days?|hours?)/g) || [];
        const sentNums =
          sentNorm.match(/\d+(?:-\d+)?\s*(?:business\s+days?|hours?)/g) || [];
        const matchesFact =
          factNums.length > 0 &&
          sentNums.some((sn) => factNums.some((fn) => fn === sn));

        if (matchesFact) {
          detected.push({
            claimText: sentence,
            category: 'delivery',
            verdict: 'SUPPORTED',
            sourceId: deliveryFact.id,
            sourceQuote: deliveryFact.content,
            confidence: 95,
            explanation: `Matches approved logistics/onboarding timeline in ${deliveryFact.factCode}.`,
            suggestion: null,
          });
        } else {
          detected.push({
            claimText: sentence,
            category: 'delivery',
            verdict: 'CONFLICTS',
            sourceId: deliveryFact.id,
            sourceQuote: deliveryFact.content,
            confidence: 96,
            explanation: `Timeline "${sentNums.join(', ') || sentence}" contradicts ${deliveryFact.factCode}: "${deliveryFact.content}"`,
            suggestion: deliveryFact.content,
          });
        }
      } else {
        detected.push({
          claimText: sentence,
          category: 'delivery',
          verdict: 'UNVERIFIED',
          sourceId: null,
          sourceQuote: null,
          confidence: 65,
          explanation:
            'No approved delivery timeline fact was found in this department knowledge base.',
          suggestion: null,
        });
      }
      continue;
    }

    if (
      /(100%\s*uptime|99\.9%\s*uptime|\d+\s*days?\s*(?:per\s*week|of\s*paid|annual\s*leave)|on-site\s*\d+\s*days?)/i.test(
        sentence
      )
    ) {
      const policyFact = validFacts.find(
        (f) => f.factType === 'policy' || f.factType === 'employment_benefit'
      );
      if (policyFact) {
        const sentLower = sentence.toLowerCase();
        const factLower = policyFact.content.toLowerCase();
        if (
          (sentLower.includes('100% uptime') && factLower.includes('99.9%')) ||
          (sentLower.includes('1 day per week') &&
            factLower.includes('3 days per week')) ||
          (sentLower.includes('unlimited') && factLower.includes('24 days'))
        ) {
          detected.push({
            claimText: sentence,
            category: sentLower.includes('uptime')
              ? 'guarantee'
              : 'employment_benefit',
            verdict: 'CONFLICTS',
            sourceId: policyFact.id,
            sourceQuote: policyFact.content,
            confidence: 96,
            explanation: `Directly contradicts approved fact ${policyFact.factCode}: "${policyFact.content}"`,
            suggestion: policyFact.content,
          });
        } else {
          detected.push({
            claimText: sentence,
            category: 'policy',
            verdict: 'UNVERIFIED',
            sourceId: policyFact.id,
            sourceQuote: policyFact.content,
            confidence: 70,
            explanation: `Requires human verification against ${policyFact.factCode}.`,
            suggestion: null,
          });
        }
      } else {
        detected.push({
          claimText: sentence,
          category: 'policy',
          verdict: 'UNVERIFIED',
          sourceId: null,
          sourceQuote: null,
          confidence: 60,
          explanation:
            'No approved policy fact found in this department knowledge base.',
          suggestion: null,
        });
      }
      continue;
    }

    if (/(?:₹|\$|€)\s?\d+|\d+%|\d{2,},?\d*\+/.test(sentence)) {
      const matchedFact = validFacts.find((f) => {
        const nums = sentence.match(/\d[\d,.]*%?|\d+-\d+/g) || [];
        return nums.some((n) => f.content.includes(n));
      });
      if (matchedFact) {
        detected.push({
          claimText: sentence,
          category: lower.includes('%')
            ? 'percentage'
            : lower.includes('₹') || lower.includes('$')
            ? 'price'
            : 'statistic',
          verdict: 'SUPPORTED',
          sourceId: matchedFact.id,
          sourceQuote: matchedFact.content,
          confidence: 90,
          explanation: `Quantitative claim aligns with approved fact ${matchedFact.factCode}.`,
          suggestion: null,
        });
      } else {
        const relatedPricingOrMetric = validFacts.find(
          (f) => f.factType === 'pricing' || f.factType === 'metric'
        );
        detected.push({
          claimText: sentence,
          category: lower.includes('%')
            ? 'percentage'
            : lower.includes('₹') || lower.includes('$')
            ? 'price'
            : 'statistic',
          verdict: 'UNVERIFIED',
          sourceId: relatedPricingOrMetric?.id ?? null,
          sourceQuote: relatedPricingOrMetric?.content ?? null,
          confidence: 55,
          explanation:
            'Quantitative figure could not be deterministically confirmed against approved facts; flagged for reviewer verification.',
          suggestion: relatedPricingOrMetric
            ? relatedPricingOrMetric.content
            : null,
        });
      }
    }
  }

  return detected;
}

function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 10);
}

export async function runReviewForSubmission(submissionId, versionId) {
  const [sub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!sub) {
    throw new Error('Submission not found.');
  }

  const [dept] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, sub.departmentId))
    .limit(1);

  if (!dept) {
    throw new Error('Department not found for submission.');
  }

  const targetVersionRow = versionId
    ? (
        await db
          .select()
          .from(versions)
          .where(eq(versions.id, versionId))
          .limit(1)
      )[0]
    : (
        await db
          .select()
          .from(versions)
          .where(
            and(
              eq(versions.submissionId, sub.id),
              eq(versions.versionNumber, sub.currentVersion)
            )
          )
          .limit(1)
      )[0];

  if (!targetVersionRow) {
    throw new Error('Submission version not found.');
  }

  const deptGuidelines = await db
    .select()
    .from(guidelines)
    .where(eq(guidelines.departmentId, sub.departmentId));

  const deptFacts = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.departmentId, sub.departmentId));

  const content = targetVersionRow.content;
  const fixedFindings = runDeterministicRuleChecks(content, deptGuidelines);
  const retrievedFacts = retrieveRelevantKnowledge(content, deptFacts, 12);
  const todayStr = new Date().toISOString().slice(0, 10);

  let aiFindings = [];
  let candidateClaims = [];
  let aiModeUsed = 'deterministic_fallback';
  let aiUnavailableReason;

  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const activeToneRules = deptGuidelines.filter(
        (g) => g.status === 'Active' && g.ruleType === 'tone'
      );
      const activeFacts = retrievedFacts.filter((f) => f.status === 'Approved');

      const systemPrompt = `You are BrandOS, a strict department-scoped brand governance auditor for the ${dept.name} department.
CORE PRINCIPLE: NO PROOF, NO FLAG. Never invent a ruleCode or factCode. Every tone finding MUST cite an exact ruleCode from the provided department guidelines and quote an exact substring from the submitted content. Every SUPPORTED or CONFLICTS claim MUST cite an exact factCode from the provided department facts and include a verbatim substring sourceQuote from that fact's content. If no supporting or contradicting fact exists, output verdict "UNVERIFIED" with empty factCode and sourceQuote. Do NOT automatically rewrite the whole submission; suggestions must be minimal edits preserving the writer's intent.`;

      const userPrompt = JSON.stringify({
        department: dept.name,
        toneProfile: dept.toneProfile,
        contentType: sub.contentType,
        channel: sub.channel,
        submittedContent: content,
        departmentToneGuidelines: activeToneRules.map((r) => ({
          ruleCode: r.ruleCode,
          title: r.title,
          description: r.description,
          severity: r.severity,
        })),
        departmentApprovedFacts: activeFacts.map((f) => ({
          factCode: f.factCode,
          title: f.title,
          content: f.content,
          factType: f.factType,
          owner: f.owner,
          expiryDate: f.expiryDate,
        })),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              toneFindings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ruleCode: { type: Type.STRING },
                    highlightedText: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                    suggestion: { type: Type.STRING },
                    unchangedNote: { type: Type.STRING },
                  },
                },
              },
              claims: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    claimText: { type: Type.STRING },
                    category: { type: Type.STRING },
                    verdict: { type: Type.STRING },
                    factCode: { type: Type.STRING },
                    sourceQuote: { type: Type.STRING },
                    confidence: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const ruleByCode = new Map(deptGuidelines.map((g) => [g.ruleCode, g]));
      const factByCode = new Map(deptFacts.map((f) => [f.factCode, f]));

      let toneIdx = 1;
      for (const tf of parsed.toneFindings || []) {
        if (!tf.ruleCode || !tf.highlightedText) continue;
        const dbRule = ruleByCode.get(tf.ruleCode);
        if (!dbRule || dbRule.departmentId !== sub.departmentId) continue;
        if (!content.toLowerCase().includes(tf.highlightedText.toLowerCase())) {
          continue;
        }

        aiFindings.push({
          ruleId: dbRule.id,
          ruleCode: dbRule.ruleCode,
          findingCode: `FND-TON-${String(toneIdx++).padStart(3, '0')}`,
          category: 'tone',
          highlightedText: tf.highlightedText,
          explanation: tf.explanation || dbRule.description,
          severity: ['Blocker', 'Major', 'Minor'].includes(tf.severity || '')
            ? tf.severity
            : dbRule.severity,
          confidence: Math.min(100, Math.max(40, Number(tf.confidence) || 85)),
          evidence: `Rule ${dbRule.ruleCode} (${dbRule.title}): ${dbRule.description}`,
          suggestion: tf.suggestion || tf.highlightedText,
          unchangedNote:
            tf.unchangedNote || 'Writer’s core intent remains intact.',
        });
      }

      for (const c of parsed.claims || []) {
        if (!c.claimText) continue;
        let verdict = 'UNVERIFIED';
        if (c.verdict === 'SUPPORTED' || c.verdict === 'CONFLICTS') {
          verdict = c.verdict;
        }

        let sourceId = null;
        let validatedQuote = null;
        let explanation =
          c.explanation || 'Evaluated against department knowledge base.';

        if (verdict === 'SUPPORTED' || verdict === 'CONFLICTS') {
          const matchedFact = c.factCode ? factByCode.get(c.factCode) : undefined;
          const quoteNorm = normalizeText(c.sourceQuote || '');
          const factNorm = matchedFact ? normalizeText(matchedFact.content) : '';

          const quoteMatchesSource =
            Boolean(matchedFact) &&
            quoteNorm.length >= 8 &&
            factNorm.includes(quoteNorm);

          if (
            !matchedFact ||
            matchedFact.departmentId !== sub.departmentId ||
            !quoteMatchesSource
          ) {
            verdict = 'UNVERIFIED';
            sourceId = null;
            validatedQuote = null;
            explanation =
              'Citation validation downgraded this claim to UNVERIFIED because no matching approved source quotation was confirmed in the department knowledge base.';
          } else if (
            matchedFact.expiryDate < todayStr ||
            matchedFact.status !== 'Approved'
          ) {
            verdict = 'UNVERIFIED';
            sourceId = matchedFact.id;
            validatedQuote = matchedFact.content;
            explanation = `Referenced fact ${matchedFact.factCode} expired on ${matchedFact.expiryDate}; downgraded to UNVERIFIED for human review.`;
          } else {
            sourceId = matchedFact.id;
            validatedQuote = matchedFact.content;
          }
        }

        candidateClaims.push({
          claimText: c.claimText,
          category: c.category || 'product_feature',
          verdict,
          sourceId,
          sourceQuote: validatedQuote,
          confidence:
            verdict === 'UNVERIFIED'
              ? Math.min(70, Number(c.confidence) || 50)
              : Math.min(100, Number(c.confidence) || 90),
          explanation,
          suggestion: c.suggestion || null,
        });
      }

      const detClaims = runDeterministicClaimChecks(content, deptFacts);
      for (const dc of detClaims) {
        const exists = candidateClaims.some(
          (ac) =>
            normalizeText(ac.claimText).includes(
              normalizeText(dc.claimText).slice(0, 20)
            ) ||
            normalizeText(dc.claimText).includes(
              normalizeText(ac.claimText).slice(0, 20)
            )
        );
        if (!exists) {
          candidateClaims.push(dc);
        }
      }

      aiModeUsed = 'gemini';
    } catch (err) {
      console.warn(
        'Gemini review fallback activated:',
        err instanceof Error ? err.message : err
      );
      aiModeUsed = 'deterministic_fallback';
      aiUnavailableReason =
        'Gemini API returned an error or quota limit; deterministic review mode was used.';
      candidateClaims = runDeterministicClaimChecks(content, deptFacts);
    }
  } else {
    aiModeUsed = 'deterministic_fallback';
    aiUnavailableReason =
      'GEMINI_API_KEY is not configured; deterministic demo-review mode was used with department rules and approved facts.';
    candidateClaims = runDeterministicClaimChecks(content, deptFacts);
  }

  if (aiModeUsed === 'deterministic_fallback') {
    const toneRule = deptGuidelines.find(
      (g) => g.status === 'Active' && g.ruleType === 'tone'
    );
    if (toneRule) {
      if (sub.departmentId && dept.slug === 'marketing') {
        if (/!{2,}|act fast|urgent|last chance/i.test(content)) {
          const match =
            content
              .match(/[^.!?]*(?:!{2,}|act fast|urgent|last chance)[^.!?]*/i)?.[0]
              ?.trim() || content.slice(0, 60);
          aiFindings.push({
            ruleId: toneRule.id,
            ruleCode: toneRule.ruleCode,
            findingCode: 'FND-TON-001',
            category: 'tone',
            highlightedText: match,
            explanation:
              'Urgent or multi-exclamation phrasing feels pushy and conflicts with Marketing’s clear, persuasive-without-hype tone.',
            severity: 'Major',
            confidence: 84,
            evidence: `Rule ${toneRule.ruleCode}: ${toneRule.description}`,
            suggestion: match.replace(/!+/g, '.'),
            unchangedNote:
              'Your call-to-action remains clear without high-pressure punctuation.',
          });
        }
      } else if (dept.slug === 'hr') {
        if (/must immediately|no exceptions|guys|mandatory/i.test(content)) {
          const match =
            content
              .match(/[^.!?]*(?:must immediately|no exceptions|guys|mandatory)[^.!?]*/i)?.[0]
              ?.trim() || content.slice(0, 60);
          aiFindings.push({
            ruleId: toneRule.id,
            ruleCode: toneRule.ruleCode,
            findingCode: 'FND-TON-001',
            category: 'tone',
            highlightedText: match,
            explanation:
              'Tone sounds overly directive or informal rather than respectful, empathetic, and inclusive.',
            severity: 'Major',
            confidence: 86,
            evidence: `Rule ${toneRule.ruleCode}: ${toneRule.description}`,
            suggestion:
              'Hello everyone — please review this update and reach out to your HR Partner with any questions.',
            unchangedNote:
              'Policy details remain clear while softening the delivery tone.',
          });
        }
      } else if (dept.slug === 'sales') {
        if (/cheapest|nobody else|100%|risk-free/i.test(content)) {
          const match =
            content
              .match(/[^.!?]*(?:cheapest|nobody else|100%|risk-free)[^.!?]*/i)?.[0]
              ?.trim() || content.slice(0, 60);
          aiFindings.push({
            ruleId: toneRule.id,
            ruleCode: toneRule.ruleCode,
            findingCode: 'FND-TON-001',
            category: 'tone',
            highlightedText: match,
            explanation:
              'Absolute sales assurances conflict with Sales’ honest, evidence-based tone profile.',
            severity: 'Major',
            confidence: 85,
            evidence: `Rule ${toneRule.ruleCode}: ${toneRule.description}`,
            suggestion: match
              .replace(/100%/gi, '99.9% SLA')
              .replace(/risk-free/gi, 'onboarding-supported'),
            unchangedNote: 'Customer value focus remains preserved.',
          });
        }
      }
    }
  }

  const allFindings = [...fixedFindings, ...aiFindings];

  await db.delete(findings).where(eq(findings.versionId, targetVersionRow.id));
  await db.delete(claims).where(eq(claims.versionId, targetVersionRow.id));

  if (allFindings.length > 0) {
    await db.insert(findings).values(
      allFindings.map((f) => ({
        submissionId: sub.id,
        versionId: targetVersionRow.id,
        ruleId: f.ruleId,
        ruleCode: f.ruleCode,
        findingCode: f.findingCode,
        category: f.category,
        highlightedText: f.highlightedText,
        explanation: f.explanation,
        severity: f.severity,
        confidence: f.confidence,
        evidence: f.evidence,
        suggestion: f.suggestion,
        unchangedNote: f.unchangedNote,
        status: 'Open',
      }))
    );
  }

  if (candidateClaims.length > 0) {
    await db.insert(claims).values(
      candidateClaims.map((c) => ({
        submissionId: sub.id,
        versionId: targetVersionRow.id,
        claimText: c.claimText,
        category: c.category,
        verdict: c.verdict,
        sourceId: c.sourceId,
        sourceQuote: c.sourceQuote,
        confidence: c.confidence,
        explanation: c.explanation,
        suggestion: c.suggestion,
        reviewerStatus: 'Pending Review',
      }))
    );
  }

  const nextStatus = sub.status === 'Draft' ? 'Under Review' : sub.status;
  await db
    .update(submissions)
    .set({
      aiModeUsed,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, sub.id));

  return {
    aiModeUsed,
    aiUnavailableReason,
    findingsCount: allFindings.length,
    claimsCount: candidateClaims.length,
  };
}
