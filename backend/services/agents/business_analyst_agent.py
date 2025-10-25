import json
from typing import AsyncGenerator

from rich import print

from core.llm_handler import openai_client
from core.settings import settings
from models.schemas import QueryProcessingResult, LlmResponseTypes
from services.stream_service import StreamService, StreamMessage


class BusinessAnalystAgent:
    _ANALYST_TEMPERATURE = 0.7
    _MAX_SAMPLES = 10

    def __init__(self, stream_service: StreamService):
        self.stream_service = stream_service

    @staticmethod
    def _get_system_prompt() -> str:
        return """You are a Marketing Business Analyst who helps explain customer targeting results in simple, business-friendly terms.

Your role is to:
1. Explain customer targeting results in plain English that any business person can understand
2. Focus on business impact and marketing opportunities
3. Reference customers naturally as [1], [2], [3], etc. when giving examples
4. Keep explanations brief and actionable for marketing teams

**Response Guidelines:**

**For Successful Results:**
- Start with "Great news! We found [X] customers who match your criteria"
- Explain WHY these customers are a good fit for your campaign
- Use business language like "engaged customers", "potential buyers", "target audience"
- Give 1-2 concrete examples using customer references like [1] and [2]
- Keep it concise (2-3 paragraphs maximum)

**For Failed/Empty Results:**
- Start with "We didn't find customers matching these specific criteria"
- Explain the reason in business terms (e.g., "too narrow targeting", "conflicting requirements")
- Suggest practical alternatives (e.g., "try broader date range", "focus on one channel")
- Keep it brief and actionable

**Response Format:**
Write like you're explaining to a marketing manager:
1. Lead with the business outcome (found X customers / no matches)
2. Explain why these customers are valuable for marketing
3. Use examples naturally (e.g., "customers like [1] and [3] are perfect because they...")
4. Keep the entire response under 200 words and business-focused

Do NOT use technical terms like:
- "Query results", "validation details", "confidence score"
- "Database queries", "filtering criteria", "data validation"
- Technical jargon or development terminology

DO use business language like:
- "Customer targeting", "campaign audience", "marketing criteria"
- "Engaged customers", "potential buyers", "target segment"
- "Campaign performance", "customer behavior", "marketing opportunity"
"""

    async def analyze_result(self, result: QueryProcessingResult, user_message: str) -> AsyncGenerator[str, None]:
        try:
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_STATUS,
                content="Marketing Analyst reviewing your target audience..."
            ))

            # it should be paginated or chunking, but for dummy purpose I am removing the restrictions
            # sample_data = result.all_data[:self._MAX_SAMPLES] if result.all_data else []
            sample_data = result.all_data
            total_count = len(result.all_data) if result.all_data else 0
            context = self._build_analysis_context(
                user_message=user_message,
                explanation=result.explanation,
                sample_data=sample_data,
                total_count=total_count,
                confidence_score=result.confidence_score,
                validation_details=result.validation_result.validation_details if result.validation_result else None
            )

            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": context}
            ]

            print("[cyan]Marketing Analyst explaining results...[/cyan]")
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content="Analyzing your campaign audience..."
            ))

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._ANALYST_TEMPERATURE,
                stream=True
            )

            async for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content

            print("[green]Marketing Analyst explanation completed[/green]")

        except Exception as e:
            error_msg = f"Marketing Analyst error: {str(e)}"
            print(f"[red]{error_msg}[/red]")
            yield f"\n\n**Analysis Error:** {error_msg}\n"

    def _build_analysis_context(
            self,
            user_message: str,
            explanation: str,
            sample_data: list,
            total_count: int,
            confidence_score: float = None,
            validation_details: str = None
    ) -> str:
        if not sample_data:
            return f"""
Analyze this customer targeting request that found NO CUSTOMERS:

**Marketing Request:** "{user_message}"

**What We Were Looking For:** {explanation}

**Search Quality:** {self._translate_confidence_to_business(confidence_score)}

**Why No Results:** {validation_details}

**Outcome:** No customers match these criteria

Explain in business terms why no customers were found and suggest practical alternatives for the marketing team.
"""
        formatted_samples = []
        for idx, customer in enumerate(sample_data, start=1):
            formatted_samples.append(f"[{idx}] {json.dumps(customer, indent=2, default=str)}")

        samples_text = "\n\n".join(formatted_samples)

        return f"""
Explain this successful customer targeting result to the marketing team:

**Marketing Request:** "{user_message}"

**What We Were Looking For:** {explanation}

**Search Quality:** {self._translate_confidence_to_business(confidence_score)}

**Target Validation:** {validation_details}

**Campaign Audience:** {total_count} customers identified for your campaign

**Sample Target Customers:**

{samples_text}

Provide a business-friendly explanation that:
1. Celebrates the successful customer targeting with "Great news!"
2. Explains why these customers are perfect for the campaign
3. References specific customers (e.g., [1], [3]) naturally to show examples
4. Keeps the response under 200 words and focuses on marketing value

Focus on business impact, not technical details.
"""

    @staticmethod
    def _translate_confidence_to_business(confidence_score: float = None) -> str:
        if confidence_score is None:
            return "Standard targeting accuracy"
        if confidence_score >= 0.9:
            return "Excellent targeting accuracy"
        elif confidence_score >= 0.7:
            return "Good targeting accuracy"
        elif confidence_score >= 0.5:
            return "Moderate targeting accuracy"
        else:
            return "Low targeting accuracy - may need refinement"
