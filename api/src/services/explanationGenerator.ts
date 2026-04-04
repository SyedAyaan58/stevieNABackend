import { openaiService } from './openaiService';
import logger from '../utils/logger';

/**
 * Explanation Generator Service
 * 
 * Generates match explanations for category recommendations using OpenAI.
 */

const SYSTEM_PROMPT = `You are a Stevie Awards expert who helps nominators understand exactly why a category is the right fit for their achievement.

For each category, write 2-3 reasons that feel personally tailored — reference the actual achievement, not generic filler. Make them feel confident this is worth entering.

Rules:
- Reference specific details from their achievement (what they did, who it helped, what changed)
- Connect the category's PURPOSE to what they actually accomplished
- One reason may highlight a competitive angle (e.g. "Few teams in your region have tackled this publicly")
- Each reason: 1 sentence, direct, no hollow phrases like "aligns with" or "demonstrates commitment"
- No markdown, no bullet formatting in the reasons themselves — just plain sentences`;

export class ExplanationGenerator {
  /**
   * Generate match explanations for categories
   */
  async generateExplanations(params: {
    userContext: any;
    categories: Array<{
      category_id: string;
      category_name: string;
      description: string;
      program_name: string;
    }>;
  }): Promise<{
    explanations: Array<{
      category_id: string;
      match_reasons: string[];
    }>;
  }> {
    const { userContext, categories } = params;

    logger.info('generating_explanations', {
      category_count: categories.length,
    });

    try {
      const userPrompt = this.buildUserPrompt(userContext, categories);

      const response = await openaiService.chatCompletion({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 2000, // Increased for more categories
      });

      const explanations = this.parseResponse(response, categories);

      logger.info('explanations_generated', {
        count: explanations.length,
      });

      return { explanations };
    } catch (error: any) {
      logger.error('explanation_generation_error', { error: error.message });
      
      // Return empty explanations on error (non-critical)
      return { explanations: [] };
    }
  }

  /**
   * Build user prompt with context and categories
   */
  private buildUserPrompt(
    userContext: any,
    categories: Array<{
      category_id: string;
      category_name: string;
      description: string;
      program_name: string;
    }>
  ): string {
    const parts: string[] = [];

    // User context
    parts.push('Nomination context:');
    if (userContext.user_name) parts.push(`- Nominator: ${userContext.user_name}`);
    if (userContext.nomination_subject) parts.push(`- Nominating: ${userContext.nomination_subject}`);
    if (userContext.description) parts.push(`- Achievement: ${userContext.description.substring(0, 500)}`);
    if (userContext.achievement_impact) parts.push(`- Impact: ${userContext.achievement_impact.substring(0, 300)}`);
    if (userContext.achievement_innovation) parts.push(`- Innovation: ${userContext.achievement_innovation.substring(0, 300)}`);
    if (userContext.org_type) parts.push(`- Organization type: ${userContext.org_type}`);
    if (userContext.user_location) parts.push(`- Location: ${userContext.user_location}`);
    if (userContext.achievement_focus && userContext.achievement_focus.length > 0) {
      parts.push(`- Focus areas: ${userContext.achievement_focus.join(', ')}`);
    }

    parts.push('');
    parts.push('Categories to Explain:');
    parts.push('');

    // Categories
    for (const category of categories) {
      parts.push(`Category ID: ${category.category_id}`);
      parts.push(`Name: ${category.category_name}`);
      parts.push(`Program: ${category.program_name}`);
      parts.push(`Description: ${category.description.substring(0, 250)}`);
      parts.push('');
    }

    parts.push('For each category, write 2-3 tailored reasons referencing the actual achievement above.');
    parts.push('');
    parts.push('Format your response as JSON:');
    parts.push('{');
    parts.push('  "explanations": [');
    parts.push('    {');
    parts.push('      "category_id": "cat_123",');
    parts.push('      "match_reasons": [');
    parts.push('        "Reason 1",');
    parts.push('        "Reason 2",');
    parts.push('        "Reason 3"');
    parts.push('      ]');
    parts.push('    }');
    parts.push('  ]');
    parts.push('}');

    return parts.join('\n');
  }

  /**
   * Parse OpenAI response with better error handling for truncated JSON
   */
  private parseResponse(
    raw: string,
    categories: Array<{ category_id: string }>
  ): Array<{ category_id: string; match_reasons: string[] }> {
    let text = raw.trim();

    // Strip markdown fences
    if (text.startsWith('```')) {
      const parts = text.split('```');
      text = parts[1] || text;
      if (text.toLowerCase().startsWith('json')) {
        text = text.substring(4);
      }
      text = text.trim();
    }

    try {
      const result = JSON.parse(text);

      if (result.explanations && Array.isArray(result.explanations)) {
        return result.explanations
          .filter((exp: any) => exp.category_id && Array.isArray(exp.match_reasons))
          .map((exp: any) => ({
            category_id: exp.category_id,
            match_reasons: exp.match_reasons.filter((r: any) => typeof r === 'string'),
          }));
      }

      return [];
    } catch (error: any) {
      logger.error('explanation_parse_error', {
        error: error.message,
        response: text.substring(0, 500),
        response_length: text.length,
      });

      // Try to salvage partial JSON by finding complete category objects
      try {
        const partialMatch = text.match(/"explanations"\s*:\s*\[([\s\S]*)/);
        if (partialMatch) {
          // Find all complete category objects
          const categoryPattern = /\{\s*"category_id"\s*:\s*"([^"]+)"\s*,\s*"match_reasons"\s*:\s*\[((?:[^[\]]*|\[[^\]]*\])*)\]\s*\}/g;
          const matches = [...text.matchAll(categoryPattern)];
          
          if (matches.length > 0) {
            logger.info('salvaged_partial_explanations', { count: matches.length });
            return matches.map(match => {
              const categoryId = match[1];
              const reasonsStr = match[2];
              const reasons = reasonsStr
                .split(',')
                .map(r => r.trim().replace(/^"|"$/g, ''))
                .filter(r => r.length > 0);
              return {
                category_id: categoryId,
                match_reasons: reasons,
              };
            });
          }
        }
      } catch (salvageError: any) {
        logger.warn('salvage_failed', { error: salvageError.message });
      }

      // Fallback: generate generic reasons
      logger.info('using_generic_explanations', { count: categories.length });
      return categories.map((cat) => ({
        category_id: cat.category_id,
        match_reasons: [
          'Aligns with your nomination focus',
          'Matches your organization profile',
          'Relevant to your achievement',
        ],
      }));
    }
  }
}

// Export singleton instance
export const explanationGenerator = new ExplanationGenerator();
