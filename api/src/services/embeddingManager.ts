import { getSupabaseClient } from "../config/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { openaiService } from "./openaiService";
import logger from "../utils/logger";

interface UserContext {
  geography?: string;
  organization_name?: string;
  job_title?: string;
  org_type?: string;
  org_size?: string;
  nomination_subject?: string;
  description?: string;
  achievement_focus?: string[];
  tech_orientation?: string;
  operating_scope?: string;
  gender?: string; // 'male', 'female', 'other', 'prefer_not_to_say'
  achievement_impact?: string; // Impact description for intent detection
  achievement_innovation?: string; // Innovation description for intent detection
}

interface Category {
  category_id: string;
  category_name: string;
  description: string;
  program_name: string;
  applicable_org_types: string[];
  achievement_focus: string[];
}

interface SimilarityResult {
  category_id: string;
  similarity_score: number;
  category_name: string;
  description: string;
  contextual_prefix?: string;    // Fix 2: returned by SQL for reranker
  program_name: string;
  program_code: string;
  geographic_scope: string[];
  applicable_org_types: string[];
  applicable_org_sizes: string[];
  nomination_subject_type: string;
  achievement_focus: string[];
  metadata?: {
    nomination_subject_type: string;
    applicable_org_types: string[];
    applicable_org_sizes: string[];
    achievement_focus: string[];
    geographic_scope: string[];
    category_types?: string[];
    is_free: boolean;
    gender_requirement?: string;
    [key: string]: any;
  };
}

/** Expected embedding dimension for pgvector (ada-002 and 3-small both use 1536). */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Embedding Manager for generating embeddings and performing similarity search.
 * Handles both category and user query embeddings using OpenAI API.
 * Category and query must use the same model; pgvector column must be dimension 1536.
 */
export class EmbeddingManager {
  private client: SupabaseClient;
  private embeddingModel: string;

  constructor(client?: SupabaseClient) {
    this.client = client || getSupabaseClient();
    // Use 3-small for better semantic accuracy (1536 dims); must match category_embeddings table.
    this.embeddingModel =
      process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  }

  /**
   * Format category information into text for embedding.
   * Structure puts discriminative terms first (focus areas, name) for better semantic match.
   */
  formatCategoryText(category: Category): string {
    const parts: string[] = [];

    // Focus areas first (strong signal for matching user achievements)
    if (category.achievement_focus && category.achievement_focus.length > 0) {
      const focusAreas = category.achievement_focus.join(", ");
      parts.push(`Focus areas: ${focusAreas}.`);
    }

    // Category name and description
    parts.push(`${category.category_name}. ${category.description}.`);

    // Eligible organization types
    if (
      category.applicable_org_types &&
      category.applicable_org_types.length > 0
    ) {
      const orgTypes = category.applicable_org_types.join(", ");
      parts.push(`Eligible for ${orgTypes}.`);
    }

    // Program name
    parts.push(`Program: ${category.program_name}.`);

    return parts.join(" ");
  }

  /**
   * Format user query to mirror category text structure so query and documents
   * live in the same semantic space (same phrasing: "Focus areas:", "Nominating", etc.).
   * Used as fallback when HyDE (generateRichSearchQuery) is disabled or fails.
   */
  formatUserQueryText(context: UserContext): string {
    const parts: string[] = [];

    if (context.achievement_focus && context.achievement_focus.length > 0) {
      parts.push(`Focus areas: ${context.achievement_focus.join(", ")}.`);
    }

    if (context.description) {
      parts.push(context.description);
    }

    if (context.nomination_subject) {
      parts.push(`Nominating ${context.nomination_subject}.`);
    }

    if (context.org_type) {
      parts.push(`Organization type: ${context.org_type}.`);
    }

    return parts.length > 0 ? parts.join(" ") : "Award category recommendation.";
  }

  /**
   * Use LLM to generate a rich search query from user context (more synonyms, context, award-relevant terms).
   * Improves semantic match when category embeddings are generic. Set RICH_QUERY_EXPANSION=true to enable.
   */
  async generateRichSearchQuery(context: UserContext): Promise<string> {
    const template = this.formatUserQueryText(context);
    const systemPrompt = `You are a search query expander for an award recommendation system. Given the user's nomination context, output a single paragraph (4-6 sentences) that will be semantically matched against award category descriptions.

The category descriptions were embedded with a specific structure: each starts with a discriminative contextual prefix that explains what UNIQUELY qualifies an achievement for that category and what does NOT qualify. Your paragraph must mirror that style so the query lands in the same semantic space.

Rules:
- Start with "Focus areas: " and expand their focus areas with related synonyms (Innovation → breakthrough, pioneering, novel approach, first-of-its-kind).
- Describe the achievement using the same concrete, discriminative framing the category prefixes use:
  * What type of achievement this is (social program, technology product, business growth, etc.)
  * Who benefits and how (community impact, customers, industry, employees)
  * What differentiates it from adjacent categories (external-facing vs internal, individual vs organizational, product vs service)
- For SOCIAL IMPACT / HUMANITARIAN work: emphasize humanitarian initiative, community uplift, social responsibility, public benefit, measurable social change
- For TECHNOLOGY: emphasize specific tech domain, innovation over prior solutions, business value delivered
- Always include award-eligibility language: excellence, recognition, leadership, measurable impact, achievement.
- End with "Nominating [subject]. Organization type: [type]." if known.
- Output ONLY the paragraph — no markdown, no labels, no preamble.`;

    const userPrompt = `Expand this nomination context into a rich search paragraph:\n\n${template}`;

    try {
      const out = await openaiService.chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "gpt-4o-mini",
        maxTokens: 400,
        temperature: 0.3,
      });
      const trimmed = (out || "").trim();
      if (trimmed.length > 50) {
        logger.info("rich_search_query_generated", { length: trimmed.length });
        return trimmed;
      }
    } catch (error: any) {
      logger.warn("rich_query_expansion_failed", { error: error.message });
    }
    return this.formatUserQueryText(context);
  }

  /**
   * Generate embedding for text using OpenAI API.
   * Handles the OpenAI API call directly in Node.js.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    logger.info("generating_embedding", {
      text_length: text.length,
      model: this.embeddingModel,
    });

    try {
      const embedding = await openaiService.generateEmbedding(
        text,
        this.embeddingModel
      );

      if (embedding.length !== EMBEDDING_DIMENSION) {
        logger.warn("embedding_dimension_mismatch", {
          expected: EMBEDDING_DIMENSION,
          actual: embedding.length,
          model: this.embeddingModel,
        });
      }
      logger.info("embedding_generated", {
        dimension: embedding.length,
        model: this.embeddingModel,
      });

      return embedding;
    } catch (error: any) {
      logger.error("embedding_generation_error", {
        error: error.message,
      });
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embedding for user query based on UserContext.
   * When RICH_QUERY_EXPANSION=true, uses LLM to expand context into a richer paragraph for better semantic match.
   * Otherwise uses template-based query with synonym expansion.
   */
  async generateUserEmbedding(context: UserContext): Promise<{ embedding: number[]; expandedQuery: string }> {
    // HyDE is always on. Set DISABLE_RICH_EXPANSION=true only to bypass for debugging.
    const disabled = process.env.DISABLE_RICH_EXPANSION === "true";
    const expandedQuery = disabled
      ? this.formatUserQueryText(context)
      : await this.generateRichSearchQuery(context);

    logger.info("generated_search_query", {
      text: expandedQuery.substring(0, 300),
      hyde: !disabled,
    });
    const embedding = await this.generateEmbedding(expandedQuery);
    return { embedding, expandedQuery };
  }

  /**
   * Fix 5: Multi-HyDE — Generate 3 angle-specific queries, pipelined for low latency.
   *
   *   A (balanced):    LLM HyDE — full context (existing prompt)
   *   B (achievement): LLM HyDE — what was built/created/innovated
   *   C (template):    FREE — structured template, no LLM call
   *
   * Pipelining: Each LLM result is embedded AS SOON as it resolves (not waiting for all 3).
   * Template embedding starts immediately (no LLM dependency).
   *
   * Net latency: ~max(LLM_A, LLM_B) + ~max(embed) ≈ 400-500ms total
   * (vs serial: LLM + embed + LLM + embed + LLM + embed ≈ 1500ms)
   */
  async generateMultiHyDE(context: UserContext): Promise<{
    embeddings: number[][];
    expandedQuery: string;
  }> {
    const template = this.formatUserQueryText(context);
    const disabled = process.env.DISABLE_RICH_EXPANSION === "true";

    const achievementPrompt = `You are expanding a nomination context for award category matching. Focus ONLY on the ACHIEVEMENT angle.
Describe: what was built, created, launched, or innovated. What specific deliverable was completed? What technical or creative approach made it stand out?
Do NOT mention impact or results. Focus purely on the work itself.
Output a single paragraph (3-4 sentences). No markdown.

Context:\n${template}`;

    try {
      // Pipeline: start template embedding immediately (free — no LLM wait)
      const templateEmbPromise = this.generateEmbedding(template);

      // Pipeline: start both LLM calls, embed each as soon as it resolves
      const balancedEmbPromise = (async () => {
        const query = disabled ? template : await this.generateRichSearchQuery(context);
        return { query, embedding: await this.generateEmbedding(query) };
      })();

      const achievementEmbPromise = (async () => {
        const query = await openaiService.chatCompletion({
          messages: [{ role: "user", content: achievementPrompt }],
          model: "gpt-4o-mini",
          maxTokens: 200,
          temperature: 0.3,
        }).then(r => (r || "").trim()).catch(() => template);
        return this.generateEmbedding(query.length > 50 ? query : template);
      })();

      // Await all 3 — they've been running concurrently the whole time
      const [templateEmb, balanced, achievementEmb] = await Promise.all([
        templateEmbPromise,
        balancedEmbPromise,
        achievementEmbPromise,
      ]);

      logger.info("multi_hyde_generated", {
        balanced_len: balanced.query.length,
        angles: 3,
      });

      return {
        embeddings: [balanced.embedding, achievementEmb, templateEmb],
        expandedQuery: balanced.query,
      };
    } catch (error: any) {
      logger.warn("multi_hyde_failed_falling_back", { error: error.message });
      const query = disabled ? template : await this.generateRichSearchQuery(context);
      const embedding = await this.generateEmbedding(query);
      return { embeddings: [embedding], expandedQuery: query };
    }
  }

  /**
   * Detect category types (intent) from user context using OpenAI.
   * Analyzes the full context to determine PRIMARY intent, not just keywords.
   * Returns array of category types to filter by, or undefined for no filtering.
   */
  async detectCategoryTypes(context: UserContext): Promise<string[] | undefined> {
    const description = context.description || '';

    // Stage 1: keyword classifier — instant, no LLM, handles ~80% of cases correctly.
    // Only fall through to LLM when keywords return nothing AND description is rich enough.
    const keywordResult = this.detectCategoryTypesKeyword(context);
    if (keywordResult && keywordResult.length > 0) {
      logger.info('intent_detected_keyword', {
        detected_types: keywordResult,
        description_sample: description.substring(0, 80),
      });
      return keywordResult;
    }

    // Stage 2: LLM fallback — only when description is long enough and keywords found nothing.
    // Opt-out via USE_LLM_INTENT_DETECTION=false.
    if (description.length < 30 || process.env.USE_LLM_INTENT_DETECTION === 'false') {
      return undefined;
    }

    try {
      const achievementImpact = context.achievement_impact || '';
      const achievementInnovation = context.achievement_innovation || '';

      const prompt = `Classify this achievement into 1-2 award category types. Focus on WHAT was achieved, not the method.

Description: ${description}
${achievementImpact ? `Impact: ${achievementImpact}` : ''}
${achievementInnovation ? `Innovation: ${achievementInnovation}` : ''}

Types:
- healthcare_medical: medical, health, disease, hospital, pharmaceutical, wellness
- women_empowerment: women helping women, female leadership, gender equality
- technology: software, AI, digital products, IT innovation
- social_impact: CSR, community service, humanitarian, charity, sustainability
- business_general: company growth, leadership, management, operations
- marketing_media: advertising, PR, content campaigns, communications
- product_service: product launch, service excellence, customer experience

Rules:
1. "Content creator who helped blind people" → healthcare_medical + social_impact (NOT marketing_media)
2. Max 2 types. Return ONLY a JSON array: ["type1", "type2"]`;

      const responseText = await openaiService.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 60,
      });

      let types: string[] = [];
      let cleaned = (responseText || '').trim()
        .replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned || '[]');
      if (Array.isArray(parsed)) types = parsed;

      if (types.length > 0) {
        logger.info('intent_detected_llm', {
          detected_types: types,
          description_sample: description.substring(0, 80),
        });
        return types;
      }
    } catch (error: any) {
      logger.warn('intent_detection_llm_failed', { error: error.message });
    }

    return undefined;
  }

  /**
   * Fallback keyword-based intent detection.
   * Used when LLM-based detection fails or description is too short.
   */
  private detectCategoryTypesKeyword(context: UserContext): string[] | undefined {
    const description = (context.description || '').toLowerCase();
    const achievementFocus = (context.achievement_focus || []).map(f => f.toLowerCase());
    const achievementImpact = (context.achievement_impact || '').toLowerCase();
    const allText = [description, achievementFocus.join(' '), achievementImpact].join(' ');
    
    const detectedTypes: Set<string> = new Set();
    
    // Healthcare/Medical keywords (HIGH PRIORITY)
    const healthcareKeywords = ['health', 'medical', 'hospital', 'doctor', 'nurse', 'patient', 'surgery', 'treatment', 'disease', 'wellness', 'pharmaceutical', 'clinic', 'healthcare', 'blind', 'cataract', 'therapy', 'cure', 'diagnosis'];
    const hasHealthcare = healthcareKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(allText));
    if (hasHealthcare) {
      detectedTypes.add('healthcare_medical');
    }
    
    // Social impact keywords (HIGH PRIORITY)
    const socialKeywords = ['social impact', 'community', 'humanitarian', 'charity', 'non-profit', 'nonprofit', 'volunteer', 'csr', 'sustainability', 'environment', 'education access', 'poverty', 'helping people', 'making a difference'];
    const hasSocial = socialKeywords.some(kw => allText.includes(kw));
    if (hasSocial) {
      detectedTypes.add('social_impact');
    }
    
    // Women empowerment keywords (NOT healthcare for women)
    const womenEmpowermentKeywords = ['women helping women', 'female leadership', 'women empowerment', 'women rights', 'gender equality', 'women in business'];
    if (womenEmpowermentKeywords.some(kw => allText.includes(kw))) {
      detectedTypes.add('women_empowerment');
    }
    
    // If healthcare or social impact detected, SKIP technology/marketing detection
    // (they used tech/media as a TOOL, not the achievement itself)
    if (hasHealthcare || hasSocial) {
      const types = Array.from(detectedTypes);
      logger.info('intent_detected_primary', {
        detected_types: types,
        note: 'Skipped secondary types (tech/marketing) due to primary healthcare/social focus',
      });
      return types;
    }
    
    // Only check these if NO healthcare/social impact detected
    
    // Technology keywords
    const techKeywords = ['software development', 'technology product', 'ai product', 'artificial intelligence platform', 'machine learning system', 'digital product', 'app development', 'platform development', 'saas product', 'cloud service', 'data analytics product', 'cybersecurity solution', 'blockchain'];
    if (techKeywords.some(kw => allText.includes(kw))) {
      detectedTypes.add('technology');
    }
    
    // Marketing/Media keywords
    const marketingKeywords = ['marketing campaign', 'advertising campaign', 'pr campaign', 'public relations campaign', 'content marketing', 'social media marketing', 'video marketing', 'media campaign', 'communications campaign', 'brand campaign'];
    if (marketingKeywords.some(kw => allText.includes(kw))) {
      detectedTypes.add('marketing_media');
    }
    
    // Product/Service keywords
    const productKeywords = ['product launch', 'new product', 'service excellence', 'customer experience program', 'customer service innovation'];
    if (productKeywords.some(kw => allText.includes(kw))) {
      detectedTypes.add('product_service');
    }
    
    const types = Array.from(detectedTypes);
    
    if (types.length > 0) {
      logger.info('intent_detected', {
        detected_types: types,
        description_sample: description.substring(0, 100),
      });
      return types;
    }
    
    // No specific intent detected - search all categories
    logger.info('no_specific_intent_detected', {
      note: 'Searching across all category types',
    });
    return undefined;
  }

  /**
   * Perform similarity search using pgvector.
   * Filters by geography and gender only — semantic matching handles the rest.
   */
  async performSimilaritySearch(
    userEmbedding: number[],
    eligibleProgramCodes?: string[],
    limit: number = 10,
    userAchievementFocus?: string[],
    userGender?: string
  ): Promise<SimilarityResult[]> {
    logger.info("performing_similarity_search", {
      eligible_programs: eligibleProgramCodes?.join(", ") || "all",
      user_achievement_focus: userAchievementFocus?.join(", ") || "all",
      user_gender: userGender || "any",
      limit,
      embedding_dimension: userEmbedding.length,
    });

    try {
      // Fix 3: Enable iterative_scan to prevent silent result drops under filtered HNSW
      try {
        await this.client.rpc("set_hnsw_iterative_scan").throwOnError();
      } catch (err: any) {
        logger.warn("hnsw_iterative_scan_unavailable", { error: err.message });
      }

      const { data, error } = await this.client.rpc(
        "search_similar_categories",
        {
          query_embedding: userEmbedding,
          eligible_program_codes: eligibleProgramCodes || null,
          user_nomination_subject: null,
          match_limit: limit,
          user_org_type: null,
          user_achievement_focus: userAchievementFocus || null,
          user_gender: userGender ?? null, // null = no gender restriction (includes all categories)
        },
      );

      if (error) {
        logger.error("similarity_search_error", {
          error: error.message,
          code: error.code,
        });
        throw new Error(
          `Failed to perform similarity search: ${error.message}`,
        );
      }

      logger.info("similarity_search_complete", {
        results_count: data?.length || 0,
      });

      // Log detailed similarity scores for analysis
      if (data && data.length > 0) {
        logger.info("similarity_results_detail", {
          top_results: data.slice(0, 5).map((r: any) => ({
            category: r.category_name,
            score: Math.round(r.similarity_score * 1000) / 1000,
            focus: r.achievement_focus,
            program: r.program_name,
          })),
        });
      }

      return (data || []) as SimilarityResult[];
    } catch (error: any) {
      logger.error("similarity_search_exception", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate a specific, discriminative contextual prefix for a category using LLM.
   * Unlike the template-based prefix that was identical across categories in the same program,
   * this describes what uniquely qualifies (and disqualifies) an achievement for THIS category.
   * Stored in the contextual_prefix column, which the SQL scoring function boosts against.
   */
  async generateContextualPrefix(category: Category): Promise<string> {
    const categoryText = this.formatCategoryText(category);
    const systemPrompt = `You are helping build a semantic search index for Stevie Awards categories.
Your task: write a 2-3 sentence contextual description for ONE award category that makes it uniquely identifiable and distinguishable from similar categories in the same program.

Rules:
- Describe SPECIFICALLY what type of achievement qualifies (be concrete, not generic)
- Include one sentence on what does NOT qualify or what differentiates this from adjacent categories
- Mention the most important eligibility differentiator (internal vs external, product vs service, individual vs team, etc.)
- Do NOT repeat the category name verbatim — rephrase with synonyms
- Output ONLY the 2-3 sentences, no labels, no markdown`;

    const userPrompt = `Category data:\n${categoryText}\n\nWrite the discriminative contextual description:`;

    try {
      const prefix = await openaiService.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 150,
      });
      const trimmed = (prefix || '').trim();
      if (trimmed.length > 20) {
        logger.info('contextual_prefix_generated', {
          category_name: category.category_name,
          prefix_length: trimmed.length,
        });
        return trimmed;
      }
    } catch (error: any) {
      logger.warn('contextual_prefix_generation_failed', {
        category_name: category.category_name,
        error: error.message,
      });
    }
    // Fallback: structured template (better than nothing)
    return `This is a ${category.program_name} award recognizing ${category.category_name.toLowerCase()}. Eligible for ${(category.applicable_org_types || []).join(' and ')} organizations focused on ${(category.achievement_focus || []).join(', ')}.`;
  }

  /**
   * Precompute and store embedding for a category.
   * Used during data ingestion.
   */
  async precomputeCategoryEmbedding(category: Category): Promise<void> {
    logger.info("precomputing_category_embedding", {
      category_id: category.category_id,
      category_name: category.category_name,
    });

    try {
      // Generate LLM contextual prefix (specific, discriminative — not template-based)
      const contextualPrefix = await this.generateContextualPrefix(category);

      // Format structured category text
      const structuredText = this.formatCategoryText(category);

      // Full embedding text: contextual prefix situates the chunk, structured text provides signal
      const categoryText = `${contextualPrefix}\n\n${structuredText}`;

      // Generate embedding of combined text
      const embedding = await this.generateEmbedding(categoryText);

      // Store in database — contextual_prefix column now populated for SQL keyword boost
      const { error } = await this.client.from("category_embeddings").upsert({
        category_id: category.category_id,
        embedding: embedding,
        embedding_text: categoryText,
        contextual_prefix: contextualPrefix,
      });

      if (error) {
        logger.error("store_embedding_error", {
          error: error.message,
          category_id: category.category_id,
        });
        throw new Error(`Failed to store embedding: ${error.message}`);
      }

      logger.info("category_embedding_stored", {
        category_id: category.category_id,
      });
    } catch (error: any) {
      logger.error("precompute_embedding_exception", {
        error: error.message,
        category_id: category.category_id,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingManager = new EmbeddingManager();
