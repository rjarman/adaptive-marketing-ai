import json
from typing import List, Optional

from pydantic import BaseModel
from rich import print

from core.llm_handler import openai_client
from core.settings import settings
from models.models import ChatMessage


class DependencyAnalysisResult(BaseModel):
    needs_context: bool
    confidence: float
    reasoning: str


class ParaphraseAgent:
    _ANALYZE_DEPENDENCY_TEMPERATURE = 0.1
    _EXTRACT_SMART_CONTEXT_TEMPERATURE = 0.1
    _ENHANCE_STANDALONE_QUERY_TEMPERATURE = 0.1
    _GENERATE_CONTEXT_AWARE_QUERY_TEMPERATURE = 0.1

    _ANALYZE_DEPENDENCY_MAX_TOKENS = 3000
    _EXTRACT_SMART_CONTEXT_MAX_TOKENS = 5000
    _ENHANCE_STANDALONE_QUERY_MAX_TOKENS = 3000
    _GENERATE_CONTEXT_AWARE_QUERY_MAX_TOKENS = 3000

    _MAX_HISTORY_LENGTH = 1500

    def __init__(self):
        self.dependency_analysis_examples = [
            # === STANDALONE QUERIES (No Context Needed) ===
            {
                "user_message": "Show me all high-value customers from the Shopify integration",
                "needs_context": False,
                "reasoning": "Complete standalone request with specific data source and customer segment criteria."
            },
            {
                "user_message": "Generate a customer engagement report for Q4 2024",
                "needs_context": False,
                "reasoning": "Standalone report request with specific time period and metrics defined."
            },
            {
                "user_message": "List all customers with abandoned carts in the last 30 days",
                "needs_context": False,
                "reasoning": "Self-contained query with specific criteria (abandoned carts) and timeframe (30 days)."
            },
            {
                "user_message": "Find customers in the enterprise segment with deal values over $50,000",
                "needs_context": False,
                "reasoning": "Complete query with specific segment (enterprise) and value criteria ($50k+)."
            },
            {
                "user_message": "Show me all CRM customers with lifecycle stage 'customer' and high purchase intent",
                "needs_context": False,
                "reasoning": "Standalone query specifying data source (CRM), lifecycle stage, and purchase intent criteria."
            },
            # === CONTEXT-DEPENDENT QUERIES (Need Previous Context) ===
            {
                "user_message": "What about their email engagement rates?",
                "needs_context": True,
                "reasoning": "Uses 'their' referring to previously mentioned customer group, needs context to identify which customers."
            },
            {
                "user_message": "How many of them converted this quarter?",
                "needs_context": True,
                "reasoning": "Uses pronoun 'them' referring to previously discussed customer segment or list."
            },
            {
                "user_message": "Show me their purchase history and lifetime value",
                "needs_context": True,
                "reasoning": "Uses possessive 'their' - needs context to identify which specific customers to analyze."
            },
            {
                "user_message": "Can you also include their preferred communication channels?",
                "needs_context": True,
                "reasoning": "Uses 'also' and 'their' indicating addition to previous customer analysis request."
            },
            {
                "user_message": "What about the website customers?",
                "needs_context": True,
                "reasoning": "Uses 'what about' suggesting comparison or follow-up to previous customer analysis from different source."
            },
            {
                "user_message": "And break it down by seasonal activity patterns",
                "needs_context": True,
                "reasoning": "Uses 'and break it down' referring to previous analysis or report that needs additional segmentation."
            },
            {
                "user_message": "That looks concerning, show me the details",
                "needs_context": True,
                "reasoning": "Uses demonstrative 'that' referring to previous results or metrics that appeared problematic."
            },
            {
                "user_message": "Filter those by device preference mobile",
                "needs_context": True,
                "reasoning": "Uses 'those' referring to previously mentioned customer set that needs additional filtering."
            },
            {
                "user_message": "Compare it with last quarter's performance",
                "needs_context": True,
                "reasoning": "Uses 'it' referring to previous report or analysis for temporal comparison."
            },
            {
                "user_message": "Now segment them by engagement frequency",
                "needs_context": True,
                "reasoning": "Uses 'them' and 'now' indicating next step in analysis of previously identified customers."
            },
            {
                "user_message": "What's the average deal size for those leads?",
                "needs_context": True,
                "reasoning": "Uses 'those leads' referring to specific lead group from previous query or analysis."
            },
            {
                "user_message": "Show similar customers from other integrations",
                "needs_context": True,
                "reasoning": "Uses 'similar customers' requiring context about which customers to use as comparison baseline."
            },
            {
                "user_message": "How do they perform across different channels?",
                "needs_context": True,
                "reasoning": "Uses 'they' referring to previously identified customer group for cross-channel analysis."
            },
            {
                "user_message": "Update those customer tags to include 'high_priority'",
                "needs_context": True,
                "reasoning": "Uses 'those customers' referring to specific customer set from previous query for tag updates."
            },
            {
                "user_message": "Export the same data for the CRM integration",
                "needs_context": True,
                "reasoning": "Uses 'same data' referring to previous data export or analysis for different integration source."
            },
            # === EDGE CASES AND BUSINESS-SPECIFIC PATTERNS ===
            {
                "user_message": "Also check their cart abandonment rates",
                "needs_context": True,
                "reasoning": "Starts with 'also' indicating addition to previous customer analysis, uses 'their' for reference."
            },
            {
                "user_message": "The conversion rates seem low",
                "needs_context": True,
                "reasoning": "Refers to 'the conversion rates' suggesting previous analysis showed conversion metrics."
            },
            {
                "user_message": "Cross-reference with our email campaign performance",
                "needs_context": True,
                "reasoning": "Implies correlation with previous customer analysis and email marketing data."
            },
            {
                "user_message": "Identify VIP customers with declining engagement scores over the past 6 months",
                "needs_context": False,
                "reasoning": "Complete standalone request with specific customer tier (VIP), metric (engagement), and timeframe (6 months)."
            }
        ]

    async def paraphrase_query(self, user_message: str, chat_history: Optional[List[ChatMessage]] = None) -> str:
        """
        Analyzes a user message and enhances it with context from previous messages if needed.
        
        Args:
            user_message: The current user message
            chat_history: List of previous chat messages (most recent first)
            
        Returns:
            Enhanced query with context or original message if no context is needed
        """
        try:
            dependency_analysis = await self._analyze_dependency(user_message)
            print(
                f"[blue]Dependency analysis: {dependency_analysis.reasoning} (confidence: {dependency_analysis.confidence:.2f}, needs context: {dependency_analysis.needs_context})[/blue]")
            if not dependency_analysis.needs_context or not chat_history or len(chat_history) == 0:
                return await self._enhance_standalone_query(user_message)
            relevant_context = await self._extract_smart_context(user_message, chat_history, dependency_analysis)
            if not relevant_context:
                return await self._enhance_standalone_query(user_message)
            enhanced_query = await self._generate_context_aware_query(user_message, relevant_context)
            return enhanced_query

        except Exception as e:
            print(f"[red]Error in paraphrase_query: {e}[/red]")
            return user_message

    async def _analyze_dependency(self, user_message: str) -> DependencyAnalysisResult:
        """
        Analyzes a user message to determine whether it depends on prior context for proper understanding
        and processing. It generates a prompt with examples to send to an AI model and evaluates the response
        to extract the analysis result in the form of a JSON object.

        Parameters:
        user_message (str): The user message to be analyzed for dependency on previous context.

        Returns:
        DependencyAnalysisResult: An object containing the fields `needs_context` (bool), which indicates
        whether context is necessary; `confidence` (float), representing the confidence score of the
        decision; and `reasoning` (str), explaining the rationale behind the determination.

        Raises:
        JSONDecodeError: If the response from the AI model cannot be parsed as valid JSON.
        Exception: If any unexpected error occurs during analysis.
        """
        try:
            examples_text = "\n".join([
                f"Message: \"{example['user_message']}\"\nNeeds Context: {example['needs_context']}\nReasoning: {example['reasoning']}\n"
                for example in self.dependency_analysis_examples
            ])

            prompt = f"""You are an expert at analyzing user messages to determine if they depend on previous conversation context.

TASK: Analyze the given user message and determine if it needs context from previous conversation to be properly understood and processed.

EXAMPLES:
{examples_text}

ANALYSIS CRITERIA FOR CRM/E-COMMERCE/MARKETING QUERIES:
- Messages with pronouns (it, that, they, them, their, those, etc.) referring to customers, segments, or data usually need context
- Follow-up questions (what about, how about, and what, etc.) typically build on previous customer analysis
- Messages starting with conjunctions (and, but, also, etc.) often continue previous analysis workflows
- Comparative references (similar to, different from, compared to) need baseline context from previous queries
- Action words without clear subjects (filter, segment, update, export) often need context about what to act upon
- References to "the data", "those customers", "same analysis" clearly need previous context
- Complete requests with specific criteria (data source, timeframe, metrics, segments) are usually standalone
- Business terms like "high-value", "VIP", "enterprise", "abandoned cart" with clear parameters are standalone

MESSAGE TO ANALYZE: "{user_message}"

Respond with a JSON object containing:
- "needs_context": boolean indicating if context is needed
- "confidence": float between 0.0 and 1.0 indicating confidence in the decision
- "reasoning": string explaining why context is or isn't needed

JSON Response:"""

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system",
                     "content": "You are an expert conversation analyst. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self._ANALYZE_DEPENDENCY_TEMPERATURE,
                max_tokens=self._ANALYZE_DEPENDENCY_MAX_TOKENS
            )

            result_text = response.choices[0].message.content.strip()

            try:
                result = json.loads(result_text)
                if all(key in result for key in ['needs_context', 'confidence', 'reasoning']):
                    return DependencyAnalysisResult(**result)
                else:
                    print(f"[yellow]Invalid JSON structure in dependency analysis: {result}[/yellow]")
                    return DependencyAnalysisResult(
                        needs_context=False,
                        confidence=0.5,
                        reasoning="Failed to parse LLM response properly"
                    )
            except json.JSONDecodeError as e:
                print(f"[yellow]Failed to parse JSON from dependency analysis: {e}[/yellow]")
                print(f"[dim]Raw response: {result_text}[/dim]")
                return DependencyAnalysisResult(
                    needs_context=False,
                    confidence=0.5,
                    reasoning="Failed to parse LLM response as JSON"
                )
        except Exception as e:
            print(f"[red]Error in LLM dependency analysis: {e}[/red]")
            return DependencyAnalysisResult(
                needs_context=False,
                confidence=0.3,
                reasoning="Error in analysis: " + str(e)
            )

    async def _extract_smart_context(self, user_message: str, chat_history: List[ChatMessage],
                                     dependency_analysis: DependencyAnalysisResult,
                                     max_context_messages: Optional[int] = None) -> str:
        """
        Uses LLM to intelligently extract only the most relevant context from chat history.
        
        Args:
            user_message: Current user message
            chat_history: List of previous chat messages
            dependency_analysis: Results from dependency analysis
            max_context_messages: Maximum number of previous messages to consider
            
        Returns:
            Relevant context string or empty string if no relevant context
        """
        if not chat_history:
            return ""
        try:
            if not max_context_messages:
                max_context_messages = len(chat_history)
            recent_messages = chat_history[-max_context_messages:] if len(
                chat_history) > max_context_messages else chat_history
            conversation_history = []
            for i, msg in enumerate(reversed(recent_messages)):
                if msg.message and msg.response:
                    response_preview = msg.response[:self._MAX_HISTORY_LENGTH] + "..." if len(
                        msg.response) > self._MAX_HISTORY_LENGTH else msg.response
                    conversation_history.append({
                        "index": len(recent_messages) - i,
                        "user_message": msg.message,
                        "assistant_response": response_preview
                    })
            if not conversation_history:
                return ""

            conversation_text = "\n".join([
                f"[{conv['index']}] User: {conv['user_message']}\n[{conv['index']}] Assistant: {conv['assistant_response']}"
                for conv in conversation_history
            ])
            prompt = f"""You are an expert at extracting relevant context from conversation history to help understand a current user message.

CURRENT USER MESSAGE: "{user_message}"

DEPENDENCY ANALYSIS: {dependency_analysis.reasoning}

CONVERSATION HISTORY (most recent first):
{conversation_text}

TASK: Extract ONLY the most relevant business context needed to understand the current user message. Focus on:
- Customer segments, data sources, or integrations that the current message refers to
- Previous analysis results, metrics, or reports that the current message builds upon
- Specific customer criteria, filters, or business parameters from previous queries
- Campaign data, engagement metrics, or performance indicators being referenced

BUSINESS CONTEXT PRIORITIES:
- Customer identification: Which customers/segments were previously discussed
- Data source context: Which integrations (Shopify, Website, CRM) were analyzed
- Metric context: What KPIs, engagement scores, or business metrics were shown
- Time context: What date ranges or periods were being analyzed
- Filter context: What criteria or segments were applied in previous queries

INSTRUCTIONS:
- Be selective - only include business context directly relevant to the current message
- Prioritize customer segment and data source information
- Include key metrics or criteria from previous analysis
- Summarize complex business data to keep context actionable
- If no business context is relevant, return "NO_RELEVANT_CONTEXT"

RELEVANT CONTEXT:"""

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system",
                     "content": "You are an expert at extracting relevant context from conversations. Be selective and concise."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self._EXTRACT_SMART_CONTEXT_TEMPERATURE,
                max_tokens=self._EXTRACT_SMART_CONTEXT_MAX_TOKENS
            )

            extracted_context = response.choices[0].message.content.strip()

            if extracted_context == "NO_RELEVANT_CONTEXT" or not extracted_context:
                print(f"[dim]No relevant context found for user message: {user_message}[/dim]")
                return ""
            print(f"[green]Relevant context extracted for user message: {user_message}[/green]")
            print(f"[cyan]Relevant context: {extracted_context}[/cyan]")
            return extracted_context

        except Exception as e:
            print(f"[red]Error in smart context extraction: {e}[/red]")
            simple_context = self._extract_simple_context(chat_history, max_context_messages=3)
            print(f"[blue]Simple context extracted for user message: {user_message}[/blue]")
            print(f"[cyan]Simple context: {simple_context}[/cyan]")
            return simple_context

    @staticmethod
    def _extract_simple_context(chat_history: List[ChatMessage], max_context_messages: int = 3) -> str:
        if not chat_history:
            return ""
        recent_messages = chat_history[-max_context_messages:] if len(
            chat_history) > max_context_messages else chat_history
        context_parts = []
        for i, msg in enumerate(reversed(recent_messages)):  # Most recent first
            if i >= max_context_messages:
                break
            if msg.message and msg.response:
                context_parts.append(f"Previous Q: {msg.message}")
                response_preview = msg.response[:150] + "..." if len(msg.response) > 150 else msg.response
                context_parts.append(f"Previous A: {response_preview}")
        return "\n".join(context_parts) if context_parts else ""

    async def _generate_context_aware_query(self, user_message: str, relevant_context: str) -> str:
        """
        Enhances a user-provided query by incorporating relevant context from a previous conversation. This
        function ensures that the query becomes standalone, resolves pronoun references, and maintains the
        original user's intent while including necessary background for clarity.

        Parameters:
            user_message: str
                The current query or message provided by the user.
            relevant_context: str
                The previous conversation context relevant to the query.

        Returns:
            str
                The enhanced, self-contained version of the query.

        Raises:
            Exception
                If an error occurs during the process of enhancing the query.
        """
        try:
            prompt = f"""You are an expert at analyzing user queries and enhancing them with relevant context from previous conversation.

TASK: Take the current user message and the previous conversation context, then generate a new, comprehensive query that:
1. Preserves the user's original intention completely
2. Includes necessary context from previous messages to make the query self-contained
3. Resolves any pronouns or references (it, that, they, etc.) with specific entities
4. Makes the query clear and unambiguous for an AI assistant to understand

PREVIOUS CONVERSATION CONTEXT:
{relevant_context}

CURRENT USER MESSAGE: 
{user_message}

INSTRUCTIONS:
- If the user message refers to "it", "that", "they", etc., replace with specific entities from context
- If the user asks a follow-up question, include the relevant topic from previous discussion
- Keep the user's tone and intent intact
- Make the query standalone - someone reading just this query should understand what's being asked
- If the user message is already clear and complete, you may return it unchanged
- Do not add unnecessary details or change the scope of the question

Generate the enhanced query:"""

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system",
                     "content": "You are a query enhancement specialist. Your job is to make user queries self-contained while preserving their exact intention."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self._GENERATE_CONTEXT_AWARE_QUERY_TEMPERATURE,
                max_tokens=self._GENERATE_CONTEXT_AWARE_QUERY_MAX_TOKENS
            )

            enhanced_query = response.choices[0].message.content.strip()
            if not enhanced_query:
                print(f"[yellow]Error generating context-aware query: Empty response from LLM[/yellow]")
                return user_message
            print(f"[green]Enhanced query generated for user message: {user_message}[/green]")
            print(f"[cyan]Enhanced query: {enhanced_query}[/cyan]")
            return enhanced_query

        except Exception as e:
            print(f"[red]Error generating context-aware query: {e}[/red]")
            return user_message

    async def _enhance_standalone_query(self, user_message: str) -> str:
        """
        Enhances a standalone user query by making minor improvements for clarity and robustness
        while maintaining the original meaning and scope of the query. This process is performed
        to ensure that the query is optimized for interpretation by an AI assistant.

        Parameters:
            user_message (str): The original user query that requires enhancement.

        Returns:
            str: The enhanced query with minor improvements for clarity, or the original query
            if modifications are deemed unnecessary or if an error occurs.
        """
        try:
            prompt = f"""You are an expert at improving user queries while preserving their exact intention.

TASK: Take this user query and make it slightly more robust and clear while keeping the same meaning and scope.

USER QUERY: {user_message}

INSTRUCTIONS:
- Keep the user's intention EXACTLY the same
- Only make minor improvements for clarity if needed
- Do not add new requirements or change the scope
- If the query is already clear, return it unchanged
- Focus on making it unambiguous for an AI assistant

Enhanced query:"""
            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system",
                     "content": "You are a query enhancement specialist. Make minimal improvements while preserving exact user intention."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self._ENHANCE_STANDALONE_QUERY_TEMPERATURE,
                max_tokens=self._ENHANCE_STANDALONE_QUERY_MAX_TOKENS
            )
            enhanced_query = response.choices[0].message.content.strip()
            if not enhanced_query:
                print("[yellow]Enhanced standalone query is empty, returning original message.[/yellow]")
                return user_message
            print(f"[green]Enhanced standalone query: {enhanced_query}[/green]")
            return enhanced_query

        except Exception as e:
            print(f"[red]Error enhancing standalone query: {e}[/red]")
            return user_message
