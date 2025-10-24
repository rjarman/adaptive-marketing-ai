import json
from collections import deque
from datetime import datetime
from typing import Dict, Any, Optional, List

from pydantic import BaseModel
from rich import print
from sqlalchemy.orm import Session

from core.database_schema_prompt import get_database_schema_prompt
from core.llm_handler import openai_client
from core.settings import settings
from models.schemas import GeneratedQuery, LlmResponseTypes
from services.stream_service import StreamService, StreamMessage


class QueryGenerationRequest(BaseModel):
    user_message: str
    context: Optional[Dict[str, Any]] = None
    validation_feedback: Optional[str] = None
    improvement_suggestions: Optional[List[str]] = None
    execution_error: Optional[str] = None


class QueryGeneratorAgent:
    _QUERY_GENERATOR_TEMPERATURE = 0.7
    _QUERY_GENERATOR_MAX_TOKENS = 5000
    _MAX_RECENT_RESULTS = 10
    _validation_history: deque = deque(maxlen=50)

    def __init__(self, db: Session, stream_service: StreamService):
        self.db = db
        self.stream_service = stream_service

    @classmethod
    def add_validation_result(cls, user_message: str, generated_query: str, validation_result):
        cls._validation_history.append({
            'user_message': user_message,
            'generated_query': generated_query,
            'validation_result': validation_result,
            'timestamp': datetime.utcnow()
        })

    @classmethod
    def get_recent_validation_results(cls) -> List[Dict]:
        return list(cls._validation_history)

    @classmethod
    def cleanup_historical_data(cls):
        cls._validation_history.clear()

    @staticmethod
    def _get_system_prompt() -> str:
        return f"""You are a PostgreSQL Query Generator Agent specialized in customer campaign analysis.

Your role is to generate syntactically correct PostgreSQL queries based on user requests for customer segmentation and campaign targeting.

{get_database_schema_prompt()}

**Common Campaign Patterns:**
1. **Cart Abandonment**: engagement_score < 50 AND last_interaction >= NOW() - INTERVAL '7 days'
2. **High-Value Customers**: total_value >= 500 AND engagement_score >= 70
3. **Inactive Customers**: last_interaction < NOW() - INTERVAL '30 days'
4. **New Customers**: created_at >= NOW() - INTERVAL '14 days'
5. **Re-engagement**: last_engagement_time < NOW() - INTERVAL '14 days' AND accepts_marketing = true

**Query Generation Rules:**
1. Always include accepts_marketing = true for campaign queries
2. Use appropriate date intervals (INTERVAL '7 days', '30 days', etc.)
3. Select relevant columns for the use case
4. Use proper PostgreSQL syntax and functions
5. Include ORDER BY for meaningful result ordering
6. Never use INSERT, UPDATE, DELETE, or DROP statements
7. **MANDATORY COLUMNS**: ALWAYS include these columns in every SELECT statement:
   - email
   - data_source
   - first_name
   - last_name
   These columns MUST be present regardless of the query type or user request

**Feedback Integration:**
When validation feedback is provided from previous attempts:
- Carefully analyze the low_confidence_explanation to understand issues
- Implement specific improvement_suggestions from the validator
- Address identified problems (missing filters, wrong date ranges, inappropriate columns)
- Ensure the revised query better matches the user's intent
- Increase confidence by fixing validation concerns

**Error Correction:**
When execution_error is provided from previous attempts:
- This indicates a SQL syntax or logical error that prevented query execution
- Common issues: invalid column names, syntax errors, data type mismatches
- Fix the specific error mentioned while preserving the query's intent
- Ensure all column names exist in the schema above
- Use proper PostgreSQL syntax and data types
- Test logic for date comparisons, JSON operations, and aggregations

**Response Format:**
Generate a JSON response with:
- sql_query: The PostgreSQL query
- explanation: Clear explanation of what the query does
- confidence_score: Your confidence in the query (0-1)
- tables_used: List of tables used

Example response format:
{{
    "sql_query": "SELECT email, data_source, first_name, last_name, total_value, engagement_score FROM customers WHERE...",
    "explanation": "This query finds customers who...",
    "confidence_score": 0.95,
    "tables_used": ["customers"]
}}

IMPORTANT: The SELECT clause MUST include email, data_source, first_name, and last_name at minimum."""

    async def generate_query(self, request: QueryGenerationRequest) -> GeneratedQuery:
        self.stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content=f"Query Generator analyzing: '{request.user_message[:50]}...'"
        ))
        try:
            recent_results = self.get_recent_validation_results()
            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": f"""
Generate a PostgreSQL query for this customer campaign request:

User Request: "{request.user_message}"

Additional Context: {json.dumps(request.context) if request.context else "None"}

{self._format_feedback_section(request)}

{self._format_recent_results_section(recent_results)}

Focus on creating a query that:
1. Targets customers who accept marketing (accepts_marketing = true)
2. Uses appropriate date filters for time-based criteria
3. Selects relevant customer information for campaign use
4. Includes proper ordering for best results first
5. **MUST include these mandatory columns in SELECT: email, data_source, first_name, last_name**

Respond with a valid JSON object containing the query details.
"""}
            ]

            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content="Generating query..."
            ))

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._QUERY_GENERATOR_TEMPERATURE,
                max_tokens=self._QUERY_GENERATOR_MAX_TOKENS
            )
            response_content = response.choices[0].message.content
            try:
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = response_content[start_idx:end_idx]
                    query_data = json.loads(json_str)
                else:
                    raise ValueError("No JSON found in response")

            except (json.JSONDecodeError, ValueError) as e:
                print(f"[yellow]Warning: Failed to parse JSON from response: {e}[/yellow]")
                raise ValueError("Failed to parse JSON from response") from e

            if "sql_query" not in query_data:
                raise ValueError("Generated response missing sql_query field")

            generated_query = GeneratedQuery(
                sql_query=query_data["sql_query"],
                explanation=query_data.get("explanation", "No explanation provided"),
                confidence_score=query_data.get("confidence_score", 0.0),
                tables_used=query_data.get("tables_used", []),
            )
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content=f"Query generated (confidence: {generated_query.confidence_score:.2f})",
                data={"sql_preview": generated_query.sql_query}
            ))
            print(f"[green]Generated query: {generated_query}[/green]")
            return generated_query

        except Exception as e:
            error_msg = f"Query generation error: {str(e)}"
            self.stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.SERVER_ERROR,
                content=error_msg
            ))
            print(f"[red]{error_msg}[/red]")
            raise Exception("Failed to generate query") from e

    @staticmethod
    def _format_feedback_section(request: QueryGenerationRequest) -> str:
        if not request.validation_feedback and not request.improvement_suggestions and not request.execution_error:
            return ""

        feedback_section = "\n**FEEDBACK FROM PREVIOUS ATTEMPT:**\n"

        if request.execution_error:
            feedback_section += f"SQL EXECUTION ERROR (CRITICAL): {request.execution_error}\n"
            feedback_section += "This query failed to execute. You MUST fix this error in your new query.\n\n"

        if request.validation_feedback:
            feedback_section += f"Validation Issue: {request.validation_feedback}\n"

        if request.improvement_suggestions:
            feedback_section += "\nSpecific Improvements Needed:\n"
            for i, suggestion in enumerate(request.improvement_suggestions, 1):
                feedback_section += f"{i}. {suggestion}\n"

        feedback_section += "\nPLEASE ADDRESS ALL THESE ISSUES IN YOUR NEW QUERY GENERATION.\n"

        return feedback_section

    def _format_recent_results_section(self, recent_results: List[Dict]) -> str:
        if not recent_results:
            return ""

        section = "\n**RECENT VALIDATION RESULTS (Learn from these):**\n"

        for i, result in enumerate(recent_results[-self._MAX_RECENT_RESULTS:], 1):
            validation_result = result['validation_result']
            section += f"{i}. Query: {result['generated_query']}...\n"
            section += f"   Result: {'Valid' if validation_result.is_valid else 'Invalid'} "
            section += f"(confidence: {validation_result.confidence_score:.2f})\n"

            if validation_result.error_message:
                section += f"   Error: {validation_result.error_message}\n"
            if validation_result.low_confidence_explanation:
                section += f"   Issue: {validation_result.low_confidence_explanation}...\n"
            section += "\n"

        return section
