import { getSupabaseClient } from '../config/supabase';
import logger from '../utils/logger';
import { SessionManager } from './sessionManager';
import { createHash } from 'crypto';
// import { userProfileManager } from './userProfileManager'; // Removed - not pre-populating from profile
import { recommendationEngine } from './recommendationEngine';
import { cacheManager } from './cacheManager';
import { pineconeClient } from './pineconeClient';
import { openaiService } from './openaiService';
import { contextClassifier } from './contextClassifier';
import { conversationManager } from './conversationManager';
import { fieldExtractor } from './fieldExtractor';
import { intakeAssistant } from './intakeAssistant';
import { applyAnswer, type IntakeField } from './intakeFlow';
import { qaAgent } from './qaAgent';

// ---------------------------------------------------------------------------
// Fast-path slot filling: skip LLM for simple structured fields.
// Saves ~400–800ms and reduces cost on ~70% of intake turns.
// ---------------------------------------------------------------------------

/** Fields that can be answered with simple pattern matching (no LLM needed). */
const FAST_PATH_FIELDS: ReadonlySet<IntakeField> = new Set<IntakeField>([
  'user_name', 'user_email', 'user_location', 'business_location',
  'nomination_subject', 'org_type', 'gender_programs_opt_in', 'nomination_scope',
]);

/** Ordered required fields — drives deterministic next-field advancement. */
const REQUIRED_FIELD_ORDER: IntakeField[] = [
  'user_name', 'user_email', 'user_location',
  'nomination_subject', 'org_type', 'gender_programs_opt_in', 'nomination_scope',
  'description',
];

/** Canned questions for each field (used when fast path handles the previous answer). */
const FIELD_QUESTIONS: Partial<Record<IntakeField, string>> = {
  user_name: "What's your name?",
  user_email: 'And your email address?',
  user_location: 'Where are you based? (city / country)',
  business_location: 'Where is your business located?',
  nomination_subject: 'Are we nominating an individual, a team, an organization, or a product?',
  org_type: 'Is the organization for-profit, non-profit, government, education, or a startup?',
  gender_programs_opt_in: 'Interested in women-focused awards too? (yes / no / skip)',
  nomination_scope: 'Regional awards, international/global, or both?',
  description: "Great! Now tell me about the achievement you'd like to nominate.",
};

/**
 * Try to normalize a raw user answer for a structured intake field.
 * Returns { value, accepted: true } on success, or { value: null, accepted: false } on failure.
 * Failure means we should fall back to the LLM path.
 */
function normalizeFieldValue(field: IntakeField, raw: string): { value: any; accepted: boolean } {
  const s = raw.trim().toLowerCase();
  if (!s) return { value: null, accepted: false };

  switch (field) {
    case 'user_name':
    case 'user_location':
    case 'business_location':
      return { value: raw.trim().substring(0, 200), accepted: true };

    case 'user_email': {
      const m = raw.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
      return m ? { value: m[0].toLowerCase(), accepted: true } : { value: null, accepted: false };
    }

    case 'nomination_subject': {
      if (/\bindividual\b|\bperson\b|\bsomeone\b|\bmyself\b|\bme\b/.test(s)) return { value: 'individual', accepted: true };
      if (/\bteam\b|\bgroup\b|\bdepartment\b/.test(s)) return { value: 'team', accepted: true };
      if (/\bcompany\b|\borganiz\b|\borganis\b|\bbusiness\b|\bcorp\b|\bfirm\b/.test(s)) return { value: 'company', accepted: true };
      if (/\bproduct\b|\bsolution\b|\bservice\b|\bsoftware\b|\bapp\b|\btool\b/.test(s)) return { value: 'product', accepted: true };
      return { value: null, accepted: false };
    }

    case 'org_type': {
      if (/\bnon.?profit\b|\bngo\b|\bcharity\b|\bcharitable\b/.test(s)) return { value: 'non_profit', accepted: true };
      if (/\bgovernment\b|\bpublic.sector\b|\bmunicip\b|\bfederal\b|\bstate.agency\b/.test(s)) return { value: 'government', accepted: true };
      if (/\beducation\b|\buniversity\b|\bcollege\b|\bschool\b|\bacadem\b/.test(s)) return { value: 'education', accepted: true };
      if (/\bstartup\b|\bstart.up\b|\bearly.stage\b/.test(s)) return { value: 'startup', accepted: true };
      if (/\bfor.?profit\b|\bprivate\b|\bcorporat\b|\bcommercial\b|\bbusiness\b/.test(s)) return { value: 'for_profit', accepted: true };
      return { value: null, accepted: false };
    }

    case 'gender_programs_opt_in': {
      if (/\byes\b|\byep\b|\bsure\b|\bwomen\b|\bfemale\b|\binterested\b|\binclude\b/.test(s)) return { value: true, accepted: true };
      if (/\bno\b|\bnope\b|\bnot.interested\b|\bopt.?out\b/.test(s)) return { value: false, accepted: true };
      if (/\bskip\b|\bn\/a\b|\bdoesn.t matter\b|\bno.preference\b/.test(s)) return { value: '__skipped__', accepted: true };
      return { value: null, accepted: false };
    }

    case 'nomination_scope': {
      if (/\bboth\b|\ball\b|\bany\b/.test(s)) return { value: 'both', accepted: true };
      if (/\bglobal\b|\binternational\b|\bworldwide\b/.test(s)) return { value: 'global', accepted: true };
      if (/\bregional\b|\blocal\b|\bnational\b|\bdomestic\b/.test(s)) return { value: 'regional', accepted: true };
      return { value: null, accepted: false };
    }

    default:
      return { value: null, accepted: false };
  }
}

/**
 * Deterministically pick the next required field that hasn't been filled yet.
 * Returns null when all required fields are present (ready for recommendations).
 */
function getNextRequiredField(userContext: any, askedFields: Set<string>): IntakeField | null {
  for (const field of REQUIRED_FIELD_ORDER) {
    const filled = field === 'gender_programs_opt_in'
      ? userContext[field] !== undefined
      : !!userContext[field];
    if (!filled) return field;
  }
  return null;
}

export class UnifiedChatbotService {
  private supabase = getSupabaseClient();
  private sessionManager = new SessionManager();
  private readonly KB_CACHE_PREFIX = 'kb_search:';
  private readonly KB_CACHE_TTL = 3600;
  private readonly MAX_CONVERSATION_HISTORY = 40;

  private getKBCacheKey(message: string): string {
    const normalized = message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');

    const hash = createHash('md5').update(normalized).digest('hex');
    return `${this.KB_CACHE_PREFIX}${hash}`;
  }

  // Note: Profile pre-population removed - we ask for everything fresh in intake flow
  // Keeping these methods for potential future use
  // private async requireProfileIfAuthenticated(userId: string): Promise<void> {
  //   const profile = await userProfileManager.getProfile(userId);
  //   if (!profile) {
  //     const err: any = new Error('OnboardingRequired');
  //     err.code = 'OnboardingRequired';
  //     err.httpStatus = 409;
  //     err.details = { missing: 'profile_row' };
  //     throw err;
  //   }

  //   if (!profile.full_name || !profile.country || !profile.organization_name || !profile.email) {
  //     const err: any = new Error('OnboardingRequired');
  //     err.code = 'OnboardingRequired';
  //     err.httpStatus = 409;
  //     err.details = { missing: 'required_profile_fields' };
  //     throw err;
  //   }
  // }

  // private mapCountryToGeography(country: string): string | null {
  //   if (!country) return null;
  //   const countryLower = country.toLowerCase().trim();
  //   if (countryLower === 'usa' || countryLower === 'united states' || countryLower === 'united states of america') return 'usa';
  //   if (countryLower === 'canada') return 'canada';
  //   return 'worldwide';
  // }

  private persistChatMessagesFireAndForget(params: {
    sessionId: string;
    userMessage: string;
    assistantMessage: string;
  }): void {
    const { sessionId, userMessage, assistantMessage } = params;

    void (async () => {
      try {
        const { error } = await this.supabase.from('chatbot_messages').insert([
          { session_id: sessionId, role: 'user', content: userMessage, sources: [] },
          { session_id: sessionId, role: 'assistant', content: assistantMessage, sources: [] },
        ]);

        if (error) logger.warn('chatbot_messages_insert_failed', { session_id: sessionId, error: error.message });
      } catch (e: any) {
        logger.warn('chatbot_messages_insert_unexpected_error', { session_id: sessionId, error: e.message });
      }
    })();
  }

  private hasMinimumForRecommendations(ctx: any): boolean {
    return !!(
      ctx.user_name &&
      ctx.user_email &&
      ctx.user_location &&
      ctx.nomination_subject &&
      ctx.org_type &&
      ctx.gender_programs_opt_in !== undefined &&
      ctx.nomination_scope &&
      ctx.description
    );
  }

  /**
   * Detect if the conversation is stuck in a loop (asking same question repeatedly).
   * Returns true if we should break the loop and provide fallback guidance.
   */
  private detectConversationLoop(conversationHistory: Array<{ role: string; content: string }>): boolean {
    if (conversationHistory.length < 6) return false;

    // Check last 3 assistant messages for similarity (same question asked multiple times)
    const recentAssistant = conversationHistory
      .filter(msg => msg.role === 'assistant')
      .slice(-3)
      .map(msg => msg.content.toLowerCase().trim());

    if (recentAssistant.length < 3) return false;

    // Simple similarity check: if all 3 messages contain the same key phrases
    const keyPhrases = ['tell me about', 'what', 'describe', 'achievement', 'nomination'];
    const matches = recentAssistant.map(msg => 
      keyPhrases.filter(phrase => msg.includes(phrase)).length
    );

    // If all 3 messages have similar structure (3+ matching key phrases), likely a loop
    const isLoop = matches.every(count => count >= 3) && 
                   recentAssistant[0].substring(0, 50) === recentAssistant[1].substring(0, 50);

    if (isLoop) {
      logger.warn('conversation_loop_detected', { 
        recent_messages: recentAssistant.map(m => m.substring(0, 100))
      });
    }

    return isLoop;
  }

  async *chat(params: { sessionId: string; message: string; userId?: string; signal?: AbortSignal }): AsyncGenerator<any, void, unknown> {
    const { sessionId, message, userId, signal } = params;

    logger.info('unified_chat_request', { session_id: sessionId, message_length: message.length });

    try {
      let session = await this.sessionManager.getSession(sessionId);

      if (!session) {
        const effectiveUserId = userId || null;
        const expiresAt = new Date(Date.now() + 3600000);

        // Start with empty context - we'll ask for everything in the intake flow
        const initialContext: any = {};

        const { data, error } = await this.supabase
          .from('user_sessions')
          .insert({
            id: sessionId,
            user_id: effectiveUserId,
            session_data: { user_context: initialContext, conversation_history: [], pending_field: null, asked_fields: [] },
            conversation_state: 'collecting_org_type',
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) throw new Error(`Failed to create session: ${error.message}`);
        if (!data) throw new Error('Failed to create session: No data returned');
        session = data as any;
      }

      if (!session) throw new Error('Session creation failed unexpectedly');

      let userContext = session.session_data.user_context;
      const conversationHistory = session.session_data.conversation_history || [];
      let pendingField = (session.session_data as any).pending_field as IntakeField | null | undefined;
      let askedFields = new Set<string>((session.session_data as any).asked_fields || []);

      logger.info('step_1_classifying_context');
      const context = await contextClassifier.classifyContext({
        message,
        conversationHistory,
        currentContext: undefined,
        userContext,
        signal,
      });

      yield { type: 'intent', intent: context.context, confidence: context.confidence };

      if (context.context === 'qa') {
        const extractedFields = await fieldExtractor.extractFields({ message, userContext, conversationHistory, signal });
        if (extractedFields && Object.keys(extractedFields).length > 0) userContext = { ...userContext, ...extractedFields };

        // Use LangChain agent with tool calling
        // The LLM will decide whether to use KB search or web crawler
        logger.info('qa_using_langchain_agent', { message: message.substring(0, 100) });

        let assistantResponse = '';
        
        try {
          // QA agent with function calling decides which tool to use
          const agentResult = await qaAgent.query(message, conversationHistory);
          assistantResponse = agentResult;
          
          logger.info('qa_agent_success', {
            response_length: assistantResponse.length,
          });

          yield { type: 'chunk', content: assistantResponse };
        } catch (error: any) {
          logger.error('qa_agent_error', { error: error.message });
          
          // Fallback to simple KB search if agent fails
          const kbArticles = await this.searchKB(message, signal);
          
          for await (const chunk of conversationManager.generateResponseStream({
            message,
            context,
            conversationHistory,
            userContext,
            kbArticles,
            signal,
          })) {
            assistantResponse += chunk;
            yield { type: 'chunk', content: chunk };
          }
        }

        const fullHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
          ...conversationHistory,
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: assistantResponse || '(No response)' },
        ];
        const updatedHistory =
          fullHistory.length > this.MAX_CONVERSATION_HISTORY ? fullHistory.slice(-this.MAX_CONVERSATION_HISTORY) : fullHistory;

        await this.sessionManager.updateSession(
          sessionId,
          { user_context: userContext, conversation_history: updatedHistory, pending_field: pendingField ?? null, asked_fields: Array.from(askedFields) },
          session.conversation_state as any
        );

        this.persistChatMessagesFireAndForget({ sessionId, userMessage: message, assistantMessage: assistantResponse || '(No response)' });
        
        logger.info('unified_chat_complete', { 
          used_langchain_agent: true
        });
        return;
      }

      // Recommendation mode:
      // - Store raw user answer into pendingField (what we asked last)
      // - In the SAME LLM call, extract any additional fields from the user's message via updates,
      //   decide next missing field, and ask next question.

      // Check for conversation loop before proceeding
      if (this.detectConversationLoop(conversationHistory)) {
        const loopBreakMessage = 
          "I notice we might be going in circles. Let me try a different approach. " +
          "Could you describe your achievement in simpler, more general terms? " +
          "For example, instead of technical jargon, focus on what problem you solved and the impact it had. " +
          "Or, if you prefer, I can show you how to browse all available award categories manually.";
        
        yield { type: 'chunk', content: loopBreakMessage };
        
        const fullHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
          ...conversationHistory,
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: loopBreakMessage },
        ];
        const updatedHistory =
          fullHistory.length > this.MAX_CONVERSATION_HISTORY ? fullHistory.slice(-this.MAX_CONVERSATION_HISTORY) : fullHistory;

        await this.sessionManager.updateSession(
          sessionId,
          { user_context: userContext, conversation_history: updatedHistory, pending_field: null, asked_fields: Array.from(askedFields) },
          session.conversation_state as any
        );

        this.persistChatMessagesFireAndForget({ sessionId, userMessage: message, assistantMessage: loopBreakMessage });
        logger.info('conversation_loop_broken');
        return;
      }

      // -----------------------------------------------------------------------
      // Fast path: skip LLM for simple structured fields (saves ~70% of LLM
      // calls during intake, ~400–800ms per turn).
      // Conditions: pendingField is a fast-path field + message is short enough.
      // Falls through to LLM path on normalization failure.
      // -----------------------------------------------------------------------
      if (pendingField && FAST_PATH_FIELDS.has(pendingField) && message.length < 400) {
        const normalized = normalizeFieldValue(pendingField, message);
        if (normalized.accepted) {
          userContext = { ...userContext, [pendingField]: normalized.value };
          askedFields.add(pendingField);

          logger.info('fast_path_applied', {
            field: pendingField,
            value_preview: String(normalized.value).substring(0, 40),
          });

          const nextField = getNextRequiredField(userContext, askedFields);
          const assistantText = nextField
            ? (FIELD_QUESTIONS[nextField] ?? `Please provide your ${nextField}.`)
            : 'Perfect! Let me find the best categories for you.';

          yield { type: 'chunk', content: assistantText };

          const fullHistoryFP: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...conversationHistory,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: assistantText },
          ];
          const updatedHistoryFP =
            fullHistoryFP.length > this.MAX_CONVERSATION_HISTORY
              ? fullHistoryFP.slice(-this.MAX_CONVERSATION_HISTORY)
              : fullHistoryFP;

          pendingField = nextField;
          if (nextField) askedFields.add(nextField);

          await this.sessionManager.updateSession(
            sessionId,
            {
              user_context: userContext,
              conversation_history: updatedHistoryFP,
              pending_field: pendingField ?? null,
              asked_fields: Array.from(askedFields),
            },
            session.conversation_state as any
          );

          this.persistChatMessagesFireAndForget({ sessionId, userMessage: message, assistantMessage: assistantText });

          // If all required fields are filled, trigger recommendations
          if (!nextField && this.hasMinimumForRecommendations(userContext)) {
            yield { type: 'status', message: 'Generating personalized category recommendations...' };

            const gender = (userContext as any).gender_programs_opt_in === false
              ? 'opt_out'
              : (userContext as any).gender_programs_opt_in === true
                ? 'female'
                : null;

            const contextForRecommendations = {
              ...userContext,
              user_location: userContext.user_location || userContext.geography,
              business_location: userContext.business_location || userContext.user_location || userContext.geography,
              gender,
              org_type: userContext.org_type || 'for_profit',
              org_size: userContext.org_size || 'small',
              achievement_focus: (userContext as any).achievement_focus || ['Innovation'],
            };

            const recommendations = await recommendationEngine.generateRecommendations(contextForRecommendations as any, {
              limit: 15,
              includeExplanations: true,
            });

            yield { type: 'recommendations', data: recommendations, count: recommendations.length };
          }

          logger.info('fast_path_complete', { next_field: nextField });
          return;
        }
        // Normalization failed → fall through to LLM path
        logger.info('fast_path_fallback_to_llm', { field: pendingField, message_preview: message.substring(0, 50) });
      }

      // -----------------------------------------------------------------------
      // LLM path: apply raw answer then let intakeAssistant plan next step.
      // -----------------------------------------------------------------------
      if (pendingField) {
        const applied = applyAnswer({ pendingField, message, userContext });
        if (applied.accepted) {
          userContext = applied.updatedContext;
          logger.info('applied_pending_field_answer', {
            field: pendingField,
            value_preview: String((userContext as any)[pendingField]).substring(0, 50),
            accepted: true
          });
        } else {
          logger.warn('pending_field_answer_rejected', {
            field: pendingField,
            error: applied.error
          });
        }
      } else {
        logger.info('no_pending_field_to_apply', { message_preview: message.substring(0, 50) });
      }

      const plan = await intakeAssistant.planNext({
        userContext,
        message,
        askedFields,
        signal
      } as any);

      // Log what the LLM extracted
      logger.info('intake_assistant_plan_result', {
        updates_count: Object.keys(plan.updates || {}).length,
        updates: plan.updates,
        next_field: plan.next_field,
        ready: plan.ready_for_recommendations
      });

      // Merge extracted updates (LLM) into userContext.
      if (plan.updates && Object.keys(plan.updates).length > 0) {
        userContext = { ...userContext, ...plan.updates };
      }

      // Count how many optional follow-ups have been collected
      const optionalFollowUps = ['achievement_impact', 'achievement_innovation', 'achievement_challenges'];
      const collectedOptionals = optionalFollowUps.filter(field => (userContext as any)[field]).length;

      // Safeguard: don't let the model jump past basic identity fields if they're still missing.
      const missingBasics: IntakeField[] = [];
      if (!userContext.user_name && !askedFields.has('user_name')) missingBasics.push('user_name');
      if (!userContext.user_email && !askedFields.has('user_email')) missingBasics.push('user_email');
      if (!userContext.user_location && !askedFields.has('user_location')) missingBasics.push('user_location');
      if (!userContext.nomination_subject && !askedFields.has('nomination_subject')) missingBasics.push('nomination_subject');
      if (!userContext.org_type && !askedFields.has('org_type')) missingBasics.push('org_type');
      if (userContext.gender_programs_opt_in === undefined && !askedFields.has('gender_programs_opt_in')) missingBasics.push('gender_programs_opt_in');
      if (!userContext.nomination_scope && !askedFields.has('nomination_scope')) missingBasics.push('nomination_scope');
      if (!userContext.description && !askedFields.has('description')) missingBasics.push('description');

      let assistantText = plan.next_question;
      let effectiveNextField: IntakeField | null = plan.next_field;
      let forceReady = false;

      // Force ready state if we have all required fields + 2 optional follow-ups
      if (missingBasics.length === 0 && collectedOptionals >= 2) {
        effectiveNextField = null;
        assistantText = "Perfect! Let me find the best categories for you.";
        forceReady = true;
        logger.info('intake_forced_ready_state', {
          collected_optionals: collectedOptionals,
          model_next_field: plan.next_field
        });
      } else if (missingBasics.length > 0 && plan.ready_for_recommendations !== true) {
        const forced = missingBasics[0];
        if (effectiveNextField !== forced) {
          effectiveNextField = forced;
          if (forced === 'user_name') assistantText = "What's your name?";
          else if (forced === 'user_email') assistantText = 'And your email?';
          else if (forced === 'user_location') assistantText = 'Where are you based?';
          else if (forced === 'nomination_subject') {
            assistantText = 'Are we nominating an individual, team, organization, or product?';
          }
          else if (forced === 'org_type') {
            assistantText = 'For-profit or non-profit?';
          }
          else if (forced === 'gender_programs_opt_in') {
            assistantText = 'Interested in women-focused awards too? (yes/no/skip)';
          }
          else if (forced === 'nomination_scope') {
            assistantText = 'Regional awards, international, or both?';
          }
          else if (forced === 'description') {
            assistantText = 'Tell me about the achievement!';
          }

          logger.info('intake_safeguard_forced_basic_field', {
            forced_field: forced,
            model_next_field: plan.next_field,
            update_keys: Object.keys(plan.updates || {}),
          });
        }
      }

      yield { type: 'chunk', content: assistantText };

      const fullHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...conversationHistory,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: assistantText },
      ];
      const updatedHistory =
        fullHistory.length > this.MAX_CONVERSATION_HISTORY ? fullHistory.slice(-this.MAX_CONVERSATION_HISTORY) : fullHistory;

      pendingField = plan.ready_for_recommendations ? null : effectiveNextField;

      // Track that we've asked this field
      if (effectiveNextField) {
        askedFields.add(effectiveNextField);
      }

      logger.info('updating_session_with_context', {
        session_id: sessionId,
        user_context_keys: Object.keys(userContext),
        user_name: userContext.user_name ? 'SET' : 'NOT_SET',
        user_email: userContext.user_email ? 'SET' : 'NOT_SET',
        pending_field: pendingField,
        asked_fields_count: askedFields.size
      });

      await this.sessionManager.updateSession(
        sessionId,
        { 
          user_context: userContext, 
          conversation_history: updatedHistory, 
          pending_field: pendingField ?? null,
          asked_fields: Array.from(askedFields)
        },
        session.conversation_state as any
      );

      this.persistChatMessagesFireAndForget({ sessionId, userMessage: message, assistantMessage: assistantText });

      if ((plan.ready_for_recommendations || forceReady) && this.hasMinimumForRecommendations(userContext)) {
        yield { type: 'status', message: 'Generating personalized category recommendations...' };

        // Map gender_programs_opt_in to gender parameter for database filtering
        const gender = (userContext as any).gender_programs_opt_in === false
          ? 'opt_out'
          : (userContext as any).gender_programs_opt_in === true
            ? 'female'
            : null;

        const contextForRecommendations = {
          ...userContext,
          user_location: userContext.user_location || userContext.geography,
          business_location: userContext.business_location || userContext.user_location || userContext.geography,
          gender,
          org_type: userContext.org_type || 'for_profit',
          org_size: userContext.org_size || 'small',
          achievement_focus: (userContext as any).achievement_focus || ['Innovation'],
        };

        const recommendations = await recommendationEngine.generateRecommendations(contextForRecommendations as any, {
          limit: 15,
          includeExplanations: true,
        });

        // Check if RAG returned no results or very low quality results
        if (recommendations.length === 0 || (recommendations.length > 0 && recommendations[0].similarity_score < 0.3)) {
          logger.warn('rag_retrieval_failed_or_low_quality', {
            count: recommendations.length,
            top_score: recommendations[0]?.similarity_score || 0,
            description: userContext.description?.substring(0, 100)
          });

          // Provide helpful fallback guidance
          const fallbackMessage = recommendations.length === 0
            ? "I'm having trouble finding exact category matches for your specific achievement. This might be because your nomination is highly specialized or uses technical terminology. Here are some options:\n\n" +
              "1. Try describing your achievement in more general terms (e.g., instead of 'IoT agricultural sensor calibration', try 'innovative technology solution for agriculture')\n\n" +
              "2. Browse all available categories manually at [categories page]\n\n" +
              "3. Contact our support team who can help identify the best categories for specialized achievements\n\n" +
              "Would you like to try rephrasing your achievement, or would you prefer to browse categories manually?"
            : "I found some potential matches, but they may not be perfect fits. The top matches have lower confidence scores, which suggests your achievement might be highly specialized. Here are your options:\n\n" +
              "1. Review the categories below (they may still be relevant)\n\n" +
              "2. Try rephrasing your achievement description\n\n" +
              "3. Browse all categories manually\n\n" +
              "Would you like to see these results, or try a different approach?";

          yield { type: 'chunk', content: fallbackMessage };
          
          // Still return recommendations if we have any, but with the warning
          if (recommendations.length > 0) {
            yield { type: 'recommendations', data: recommendations, count: recommendations.length, low_confidence: true };
          }
        } else {
          yield { type: 'recommendations', data: recommendations, count: recommendations.length };
        }
      }

      logger.info('unified_chat_complete', {
        intake_pending_field: pendingField,
        intake_ready: plan.ready_for_recommendations,
        intake_next_field: effectiveNextField,
        update_keys: Object.keys(plan.updates || {}),
        basics_present: {
          user_name: !!userContext.user_name,
          user_email: !!userContext.user_email,
          nomination_subject: !!userContext.nomination_subject,
          org_type: !!userContext.org_type,
          gender_programs_opt_in: userContext.gender_programs_opt_in !== undefined,
          nomination_scope: !!userContext.nomination_scope,
          description: !!userContext.description,
        },
      });
    } catch (error: any) {
      if (error?.code === 'OnboardingRequired') throw error;
      if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') throw error;
      logger.error('unified_chat_error', { error: error.message, stack: error.stack });
      throw new Error(`Failed to process chat: ${error.message}`);
    }
  }

  private async searchKB(message: string, signal?: AbortSignal): Promise<any[]> {
    const cacheKey = this.getKBCacheKey(message);

    try {
      const cachedResults = await cacheManager.get<any[]>(cacheKey);
      if (cachedResults) return cachedResults;

      const embedding = await openaiService.generateEmbedding(message, 'text-embedding-ada-002', { signal });
      const pineconeResults = await pineconeClient.query(embedding, 10, { content_type: 'kb_article' });

      const results = pineconeResults.map((r) => ({
        id: r.metadata.document_id,
        title: r.metadata.title || 'Untitled',
        content: r.metadata.chunk_text || '',
        program: r.metadata.program || 'general',
        similarity: r.score,
      }));

      await cacheManager.set(cacheKey, results, this.KB_CACHE_TTL);
      return results;
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') throw error;
      logger.error('kb_search_error', { error: error.message });
      return [];
    }
  }
}

export const unifiedChatbotService = new UnifiedChatbotService();
