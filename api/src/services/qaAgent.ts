/**
 * QA Agent using OpenAI Function Calling (Native)
 *
 * All OpenAI calls go through openaiService (circuit breaker, retry, queue, token tracking).
 * Tool calls execute in parallel (Promise.all).
 * Tool result payloads are capped at 6000 chars (~1500 tokens) to prevent context bloat.
 * KB search passes a program filter when the query mentions a specific program.
 */

import OpenAI from 'openai';
import { awardSearchService } from './awardSearchService';
import { pineconeClient } from './pineconeClient';
import { openaiService } from './openaiService';
import { webSearchService } from './webSearchService';
import { jinaReader } from './crawler/jinaReader';
import logger from '../utils/logger';

const MAX_TOOL_RESULT_CHARS = 6000; // ~1500 tokens — prevents context window bloat

// Define tools for function calling
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the Stevie Awards knowledge base for general information about categories, eligibility, processes, and award programs. Use this for questions about award types, category descriptions, general eligibility criteria, and nomination processes.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information in the knowledge base',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_stevie_website',
      description: 'Search and scrape the official Stevie Awards website (stevieawards.com) for specific event information, locations, dates, judging criteria, entry procedures. Use this for questions about specific events like SAWIB, MENA, SATE, or how to enter.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find information on stevieawards.com',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the entire web for current information about Stevie Awards from various sources. Use this as a fallback when stevieawards.com might not have the information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find current information on the web',
          },
        },
        required: ['query'],
      },
    },
  },
];

const systemPrompt = `You are a helpful assistant for the Stevie Awards nomination system.

CORE RESPONSIBILITIES:
1. Answer questions about Stevie Awards programs, categories, deadlines, and processes
2. Help users find relevant information using available tools
3. Guide users toward finding the right award categories for their achievements

CRITICAL: ANSWER ACCURACY
- ONLY use information that DIRECTLY answers the user's specific question
- If the user asks about "SAWIB 25", do NOT provide information about MENA, SATE, or other events
- If the user asks about "MENA 25", do NOT provide information about SAWIB, SATE, or other events
- Pay close attention to event names, years, and specific details in the query
- If you find information about multiple events, ONLY use the one that matches the query

TOOL USAGE GUIDELINES:
- Use "search_knowledge_base" for general information about categories, eligibility, processes
- Use "search_stevie_website" for specific event details (locations, dates, judging criteria, how to enter)
- Use "search_web" as a fallback when other tools don't have the information
- Prefer search_stevie_website over search_web for Stevie Awards specific queries

CITATION REQUIREMENTS:
- ALWAYS include source URLs at the end of your answer
- Format: "Sources: [URL1], [URL2], [URL3]"
- Use the URLs from the tool results
- If multiple sources, list all of them

OUT-OF-CONTEXT QUESTIONS:
If a user asks something completely unrelated to Stevie Awards (e.g., weather, sports, cooking, general knowledge):
- Start with: "I'm having trouble answering that question as it's outside my area of expertise."
- Explain you're specifically designed for Stevie Awards
- Provide contact: help@stevieawards.com
- Redirect back to Stevie Awards topics

ANSWER FORMATTING:
When answering questions:
1. Provide clear, accurate information
2. Include relevant sources/citations at the end
3. Keep answers concise but complete
4. Use a friendly, professional tone

GUIDING TO RECOMMENDATIONS:
After answering a question, naturally guide users toward personalized recommendations:
- "Would you like me to help you find the right categories for your specific achievements?"
- "I can provide personalized category recommendations based on your organization's accomplishments. Would that be helpful?"

Keep the transition natural and conversational, not pushy.`;

/** Detect which Stevie program a query is specifically about, for KB metadata filtering. */
function detectProgram(query: string): string | undefined {
  const q = query.toLowerCase();
  if (q.includes('american business') || /\baba\b/.test(q)) return 'ABA';
  if (q.includes('international business') || /\biba\b/.test(q)) return 'IBA';
  if (/\bmena\b/.test(q) || q.includes('middle east')) return 'MENA';
  if (q.includes('asia-pacific') || q.includes('asia pacific') || /\bapac\b/.test(q)) return 'APAC';
  if (q.includes('german') || /\bgsa\b/.test(q)) return 'GERMAN';
  if (q.includes('technology excellence') || /\bsate\b/.test(q)) return 'TECH';
  if (q.includes('great employers') || /\bsage\b/.test(q)) return 'EMPLOYERS';
  if (q.includes('sales') && q.includes('customer service')) return 'SALES';
  if (q.includes('women in business') || /\bsawib\b/.test(q)) return 'WOMEN';
  return undefined;
}

export class QAAgent {
  async query(userQuery: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<string> {
    logger.info('qa_agent_query_start', { query: userQuery });

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: userQuery },
      ];

      // Initial call — through openaiService (circuit breaker + retry + queue + token tracking)
      let response = await openaiService.chatCompletionRaw({
        messages,
        model: 'gpt-4o-mini',
        tools,
        toolChoice: 'auto',
        temperature: 0.3,
        maxTokens: 1000,
      });

      let iterations = 0;
      const maxIterations = 5;

      while (response.choices[0].message.tool_calls && iterations < maxIterations) {
        iterations++;
        const toolCalls = response.choices[0].message.tool_calls;

        logger.info('qa_agent_tool_calls', {
          iteration: iterations,
          toolCount: toolCalls.length,
          tools: toolCalls.map(tc => tc.function.name),
        });

        // Add assistant message with tool_calls
        messages.push(response.choices[0].message);

        // Execute all tool calls in parallel (B5)
        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            logger.info('qa_agent_executing_tool', { tool: functionName, args: functionArgs });

            let result: string;
            try {
              if (functionName === 'search_knowledge_base') {
                result = await this.searchKnowledgeBase(functionArgs.query);
              } else if (functionName === 'search_stevie_website') {
                result = await this.searchStevieWebsite(functionArgs.query);
              } else if (functionName === 'search_web') {
                result = await this.searchWeb(functionArgs.query);
              } else {
                result = JSON.stringify({ error: 'Unknown function' });
              }
            } catch (error: any) {
              logger.error('qa_agent_tool_error', { tool: functionName, error: error.message });
              result = JSON.stringify({ error: error.message });
            }

            // Cap each tool result to prevent context window bloat (B8)
            const capped = result.length > MAX_TOOL_RESULT_CHARS
              ? result.substring(0, MAX_TOOL_RESULT_CHARS)
              : result;

            return { toolCall, result: capped };
          })
        );

        // Push all tool results to messages
        for (const { toolCall, result } of toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        // Follow-up call — also through openaiService
        response = await openaiService.chatCompletionRaw({
          messages,
          model: 'gpt-4o-mini',
          tools,
          toolChoice: 'auto',
          temperature: 0.3,
          maxTokens: 1000,
        });
      }

      const finalAnswer = response.choices[0].message.content || 'I apologize, but I was unable to generate a response.';

      logger.info('qa_agent_query_complete', {
        query: userQuery,
        iterations,
        answerLength: finalAnswer.length,
      });

      return finalAnswer;
    } catch (error: any) {
      logger.error('qa_agent_query_error', { query: userQuery, error: error.message });
      throw error;
    }
  }

  private async searchKnowledgeBase(query: string): Promise<string> {
    try {
      const embedding = await openaiService.generateEmbedding(query);

      // Pass program filter when query is about a specific program (B10)
      const detectedProgram = detectProgram(query);
      const filter = detectedProgram ? { program: detectedProgram } : undefined;
      const results = await pineconeClient.query(embedding, 5, filter);

      if (!results || results.length === 0) {
        return JSON.stringify({ success: false, message: 'No relevant information found in knowledge base' });
      }

      const formattedResults = results.map((match: any) => ({
        content: match.metadata?.text || match.metadata?.content || '',
        score: match.score,
        source: match.metadata?.source || 'Knowledge Base',
      }));

      return JSON.stringify({ success: true, results: formattedResults });
    } catch (error: any) {
      logger.error('search_knowledge_base_error', { error: error.message });
      return JSON.stringify({ success: false, error: error.message });
    }
  }

  private async searchStevieWebsite(query: string): Promise<string> {
    try {
      const searchResults = await webSearchService.search(`site:stevieawards.com ${query}`, { maxResults: 5 });

      if (!searchResults.results || searchResults.results.length === 0) {
        return JSON.stringify({ success: false, message: 'No relevant information found on stevieawards.com' });
      }

      const urlsToScrape = searchResults.results.slice(0, 3).map(r => r.url);
      const scrapedResults = await jinaReader.scrapeMultiple(urlsToScrape);

      const formattedResults = scrapedResults.map(result => ({
        title: result.title,
        url: result.url,
        content: `[Source: ${result.url}]\n${result.content.substring(0, 2000)}`,
      }));

      return JSON.stringify({
        success: true,
        results: formattedResults,
        answer: searchResults.answer,
        note: 'IMPORTANT: Only use information that directly answers the user query. Ignore information about other events or programs.',
      });
    } catch (error: any) {
      logger.error('search_stevie_website_error', { error: error.message });
      return JSON.stringify({ success: false, error: error.message });
    }
  }

  private async searchWeb(query: string): Promise<string> {
    try {
      const searchResults = await webSearchService.searchAndScrape(query, { maxResults: 5, maxScrape: 3 });

      if (!searchResults.scrapedContent || searchResults.scrapedContent.length === 0) {
        return JSON.stringify({ success: false, message: 'No relevant web results found' });
      }

      const formattedResults = searchResults.scrapedContent.map(result => ({
        title: result.title,
        url: result.url,
        content: result.content.substring(0, 2000),
      }));

      return JSON.stringify({ success: true, results: formattedResults, answer: searchResults.answer });
    } catch (error: any) {
      logger.error('search_web_error', { error: error.message });
      return JSON.stringify({ success: false, error: error.message });
    }
  }
}

export const qaAgent = new QAAgent();
