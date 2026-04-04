import { openaiService } from './openaiService';
import logger from '../utils/logger';
import type { IntakeField } from './intakeFlow';

export type IntakeAssistantPlanResult = {
  updates: Record<string, any>;
  next_field: IntakeField | null;
  next_question: string;
  ready_for_recommendations: boolean;
};

const INTAKE_FIELDS: IntakeField[] = [
  'user_name',
  'user_email',
  'user_location',
  'business_location',
  'nomination_subject',
  'org_type',
  'gender_programs_opt_in',
  'nomination_scope',
  'description',
  'achievement_impact',
  'achievement_innovation',
  'achievement_challenges',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTML_TAG_REGEX = /<[^>]*>/g;

function sanitize(value: any): any {
  if (typeof value === 'string') return value.replace(HTML_TAG_REGEX, '').substring(0, 1200);
  return value;
}

function buildPrompt(params: { userContext: any; message: string }): string {
  const { userContext, message } = params;

  const contextSummary = Object.entries(userContext || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .slice(0, 80)
    .map(([k, v]) => `${k}: ${String(v).substring(0, 300)}`)
    .join('\n');

  return `You are a friendly Stevie Awards assistant having a natural conversation. Talk like a helpful colleague, not a form.

Look at what you already know and what the user just said. Extract any info and ask the next question naturally.

REQUIRED info (collect these before recommendations):
- user_name
- user_email
- user_location (where the USER personally lives — city, country, or region)
- business_location (where the ORGANIZATION or COMPANY is based — may differ from user location)
  → CRITICAL: Extract BOTH if mentioned in the same message
  → Ask for user_location first, then immediately follow up with business_location
  → Natural phrasing: "And where is your company or organization based? Same country or different?"
- nomination_subject (individual|team|organization|product)
- org_type (for_profit|non_profit|government|education|startup)
- gender_programs_opt_in (true|false|"__skipped__")
- nomination_scope (regional|global|both)
- description

OPTIONAL follow-ups (ask 1-2 ONLY after description to enrich):
- achievement_impact
- achievement_innovation
- achievement_challenges

Allowed field names:
${INTAKE_FIELDS.join(', ')}

HOW TO ASK NATURALLY:
- user_name: "What's your name?" / "And you are?" / "Who should I put down for this?"
- user_email: "What's your email?" / "And your email address?"
- user_location: "Where are you based?" / "Which country or city are you in?" / "Where are you located?"
- business_location: "And where is your company or organization based?" / "Is the business in the same country?" / "Where is the organization registered or operating from?"
- nomination_subject: "Are we nominating an individual, a team, an organization, or a product?"
- org_type: "Is this a for-profit or non-profit?"
- gender_programs_opt_in: "Interested in women-focused awards too? (yes/no/skip)"
- nomination_scope: "Regional awards, international awards, or both?"
- description: "Tell me about the achievement!" / "What did they accomplish?"
- achievement_impact: "What kind of impact did this have?" / "Any measurable results?"
- achievement_innovation: "What made this innovative or unique?"
- achievement_challenges: "What obstacles did they overcome?"

TWO-LOCATION EXTRACTION EXAMPLES:
- "I'm in London but my company is based in Dubai" → user_location: "London, UK", business_location: "Dubai, UAE"
- "We're a US company, I work from India" → user_location: "India", business_location: "USA"
- "Mumbai" (no business context mentioned yet) → user_location: "Mumbai, India", business_location: null (ask next)
- "Singapore" → user_location: "Singapore", then ask business_location separately

Email validation rule:
- If user_email exists but invalid (no @ or no . after @), set next_field="user_email" and next_question EXACTLY:
this email structure is not valid please type correct email ok

Current context:
${contextSummary || 'Just starting'}

User just said:
"${message}"

Return ONLY valid JSON (no markdown, no code fences):
{
  "updates": {
    // ONLY include fields you actually extracted a value for — NEVER set a field to "" or null
    // Wrong:  "user_name": ""
    // Right:  omit user_name entirely if you don't have a value
    "user_name": "string",
    "user_email": "string",
    "user_location": "string",
    "business_location": "string",
    "nomination_subject": "individual|team|organization|product",
    "org_type": "for_profit|non_profit|government|education|startup",
    "gender_programs_opt_in": "true|false|__skipped__",
    "nomination_scope": "regional|global|both",
    "description": "string",
    "achievement_impact": "string",
    "achievement_innovation": "string",
    "achievement_challenges": "string"
  },
  "next_field": "user_name|user_email|user_location|business_location|nomination_subject|org_type|gender_programs_opt_in|nomination_scope|description|achievement_impact|achievement_innovation|achievement_challenges|null",
  "next_question": "...",
  "ready_for_recommendations": true|false
}

Rules:
- Sound human — vary phrasing, acknowledge what they said, use their name if you have it
- CRITICAL: Always extract the answer to your last question into updates
- CRITICAL: Only add a field to updates if the user actually provided that value. Omit everything else.
- Extract ALL fields you can identify from a single message (including both locations at once)
- Ask ONE question (1-2 sentences max)
- Don't ask for fields already collected
- After description, ask 1-2 optional follow-ups max (not all 3)
- When ready: "Perfect! Let me find the best categories for you."
- No markdown in next_question`;
}

export class IntakeAssistant {
  async planNext(params: { userContext: any; message: string; signal?: AbortSignal }): Promise<IntakeAssistantPlanResult> {
    const { userContext, message, signal } = params;

    const prompt = buildPrompt({ userContext, message });

    const raw = await openaiService.chatCompletion({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 500,
      signal,
    });

    let text = (raw || '').trim();
    // Strip markdown code fences if the LLM adds them despite instructions
    if (text.startsWith('```')) {
      const parts = text.split('```');
      text = (parts[1] || text).trim();
      if (text.toLowerCase().startsWith('json')) text = text.substring(4).trim();
    }

    try {
      const parsed = JSON.parse(text);
      const next_question = typeof parsed?.next_question === 'string' ? parsed.next_question.trim() : '';
      const ready_for_recommendations = !!parsed?.ready_for_recommendations;
      const next_field = parsed?.next_field ?? null;
      const updatesRaw = parsed?.updates && typeof parsed.updates === 'object' ? parsed.updates : {};

      // Filter to allowed keys + sanitize values
      const updates: Record<string, any> = {};
      for (const k of Object.keys(updatesRaw)) {
        if (INTAKE_FIELDS.includes(k as IntakeField) && updatesRaw[k] !== undefined && updatesRaw[k] !== null) {
          updates[k] = sanitize(updatesRaw[k]);
        }
      }

      // Post-extraction: email format validation
      const resolvedEmail = updates.user_email || userContext?.user_email;
      const emailInvalid = resolvedEmail && !EMAIL_REGEX.test(resolvedEmail);

      const normalizedNextField: IntakeField | null = INTAKE_FIELDS.includes(next_field) ? (next_field as IntakeField) : null;

      if (emailInvalid && next_field !== 'user_email') {
        return {
          updates,
          next_field: 'user_email',
          next_question: 'this email structure is not valid please type correct email ok',
          ready_for_recommendations: false,
        };
      }

      return {
        updates,
        next_field: normalizedNextField,
        next_question: next_question || 'What should I ask next?',
        ready_for_recommendations,
      };
    } catch (e: any) {
      logger.warn('intake_assistant_plan_parse_failed', { error: e.message, text: text.substring(0, 400) });
      return {
        updates: {},
        next_field: 'user_name',
        next_question: "What's your name for the nomination?",
        ready_for_recommendations: false,
      };
    }
  }
}

export const intakeAssistant = new IntakeAssistant();
