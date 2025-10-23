import json
import re
from typing import Dict, Any, List, Optional, Tuple

from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database_schema_prompt import get_database_schema_prompt
from core.llm_handler import openai_client
from core.settings import settings
from models.schemas import QueryValidationResult, GeneratedQuery, LlmResponseTypes
from services.agents import CONFIDENCE_THRESHOLD
from services.stream_service import stream_service, StreamMessage


class ValidationRequest(BaseModel):
    user_message: str
    generated_query: GeneratedQuery


class ValidatorAgent:
    _VALIDATOR_TEMPERATURE = 0.7
    _MAX_SAMPLES = 10

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _get_system_prompt() -> str:
        return f"""You are a Validator Agent specialized in validating PostgreSQL queries against user intent for customer campaign analysis.

Your role is to:
1. Execute the generated SQL query safely (with LIMIT to get sample data)
2. Analyze the sample results against the user's original request
3. Determine if the query correctly addresses the user's intent
4. Provide validation feedback with confidence score

{get_database_schema_prompt()}

**Validation Criteria:**
1. **Correctness**: Does the query return the type of customers requested?
2. **Completeness**: Does it include all necessary filters and conditions?
3. **Relevance**: Are the selected columns appropriate for the use case?
4. **Marketing Focus**: Does it properly filter for accepts_marketing = true?
5. **Data Quality**: Are the sample results meaningful and expected?

**Sample Analysis Guidelines:**
- Check if customer profiles match the requested criteria
- Verify date ranges align with user requirements
- Ensure engagement scores and values are appropriate
- Confirm lifecycle stages and segments are relevant

**Validation Levels:**
- **High Confidence (0.8-1.0)**: Query perfectly matches intent, sample data is highly relevant
- **Medium Confidence (0.6-0.79)**: Query mostly correct, minor improvements possible
- **Low Confidence (0.4-0.59)**: Query partially correct, needs refinement
- **Invalid (0.0-0.39)**: Query doesn't match intent or returns irrelevant data

**Response Format:**
Provide JSON response with:
- is_valid: boolean (true if confidence >= 0.6)
- confidence_score: float (0-1)
- validation_details: detailed explanation
- sample_data: array of sample records (limited)
- error_message: any issues found (optional)
- low_confidence_explanation: detailed explanation when confidence < {CONFIDENCE_THRESHOLD} (why the query doesn't fully match intent)
- improvement_suggestions: array of specific suggestions for query improvement

**Low Confidence Analysis:**
When confidence < {CONFIDENCE_THRESHOLD}, provide detailed explanations covering:
- Missing or incorrect filters (dates, segments, conditions) - reference actual schema columns
- Inappropriate column selections for campaign use - suggest better columns from schema
- Sample data quality issues (empty results, irrelevant customers)
- Marketing focus problems (missing accepts_marketing filter)
- Query structure issues (ordering, limits, joins)
- Schema compliance (using non-existent columns, wrong data types)
- Missing key campaign columns (email, engagement_score, total_value, lifecycle_stage, etc.)

**Improvement Suggestions Guidelines:**
- Only suggest columns that exist in the schema
- Recommend appropriate data types and formats
- Consider campaign-specific columns (engagement_score, total_value, accepts_marketing)
- Suggest proper date/time filtering using created_at, last_interaction, last_engagement_time
- Recommend segmentation using lifecycle_stage, segment, purchase_intent

Focus on practical campaign usability and customer targeting accuracy."""

    async def validate_query(self, request: ValidationRequest) -> QueryValidationResult:
        stream_service.add_message(StreamMessage(
            response_type=LlmResponseTypes.AGENT_STATUS,
            content=f"🔍 Validator analyzing query for: '{request.user_message[:50]}...'"
        ))

        try:
            sample_data, execution_error = await self._execute_query_safely(
                request.generated_query.sql_query,
            )
            if execution_error:
                print(f"Warning: Query execution failed: {execution_error}")
                stream_service.add_message(StreamMessage(
                    response_type=LlmResponseTypes.SERVER_ERROR,
                    content=f"Query execution failed: {execution_error}"
                ))
                return QueryValidationResult(
                    is_valid=False,
                    confidence_score=0.0,
                    validation_details=f"Query execution failed: {execution_error}",
                    sample_data=None,
                    error_message=execution_error
                )
            print(f"Sample data: {sample_data}")
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content=f"📊 Retrieved {len(sample_data) if sample_data else 0} sample records"
            ))
            validation_result = await self._analyze_query_intent(
                request.user_message,
                request.generated_query,
                sample_data
            )
            print(f"Validation result: {validation_result}")
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.AGENT_THINKING,
                content=f"✅ Validation complete (confidence: {validation_result.confidence_score:.2f})",
                data={
                    "is_valid": validation_result.is_valid,
                    "sample_count": len(sample_data) if sample_data else 0
                }
            ))
            return validation_result

        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            stream_service.add_message(StreamMessage(
                response_type=LlmResponseTypes.SERVER_ERROR,
                content=error_msg
            ))

            validation_result = QueryValidationResult(
                is_valid=False,
                confidence_score=0.0,
                validation_details=error_msg,
                sample_data=None,
                error_message=str(e)
            )

            # Historical data will be recorded by orchestrator
            return validation_result

    async def _execute_query_safely(self, sql_query: str) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
        try:
            query_upper = sql_query.upper().strip()
            if 'LIMIT' not in query_upper:
                sql_query = sql_query.rstrip(';') + f' LIMIT {self._MAX_SAMPLES}'
            else:
                limit_match = re.search(r'LIMIT\s+(\d+)', sql_query, re.IGNORECASE)
                if limit_match:
                    existing_limit = int(limit_match.group(1))
                    if existing_limit > self._MAX_SAMPLES:
                        sql_query = re.sub(r'LIMIT\s+\d+', f'LIMIT {self._MAX_SAMPLES}', sql_query, flags=re.IGNORECASE)

            result = self.db.execute(text(sql_query))
            columns = result.keys()
            rows = result.fetchall()
            sample_data = []
            for row in rows:
                row_dict = {}
                for i, column in enumerate(columns):
                    value = row[i]
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    row_dict[column] = value
                sample_data.append(row_dict)

            return sample_data, None

        except Exception as e:
            try:
                print(f"Warning: Query execution failed with error: {e}")
                self.db.rollback()
            except Exception as rollback_error:
                print(f"Warning: Failed to rollback transaction: {rollback_error}")
            return None, str(e)

    async def _analyze_query_intent(
            self,
            user_message: str,
            generated_query: GeneratedQuery,
            sample_data: List[Dict[str, Any]]
    ) -> QueryValidationResult:
        try:
            # @todo make sure query has read only operation
            analysis_sample = sample_data[:self._MAX_SAMPLES] if sample_data else []

            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": f"""
Validate this customer campaign query against the user's intent:

**User Request:** "{user_message}"

**Generated Query:** 
```sql
{generated_query.sql_query}
```

**Query Explanation:** {generated_query.explanation}

**Sample Results (first {len(analysis_sample)} rows):**
{json.dumps(analysis_sample, indent=2, default=str) if analysis_sample else "No results returned"}

**Total Sample Count:** {len(sample_data) if sample_data else 0}

Analyze:
1. Does the query correctly interpret the user's campaign intent?
2. Are the sample results appropriate for the requested customer segment?
3. Do the filters and conditions align with the user's requirements?
4. Is this query suitable for creating a marketing campaign?

If confidence score < {CONFIDENCE_THRESHOLD}, provide:
- low_confidence_explanation: Detailed explanation of why the query doesn't fully match intent
- improvement_suggestions: Specific actionable suggestions for improving the query

Provide a detailed validation assessment in JSON format with confidence score.
"""}
            ]

            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._VALIDATOR_TEMPERATURE,
            )
            response_content = response.choices[0].message.content
            try:
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = response_content[start_idx:end_idx]
                    validation_data = json.loads(json_str)
                else:
                    raise ValueError("No JSON found in response")

            except (json.JSONDecodeError, ValueError):
                print("Warning: Failed to parse JSON from response, falling back to rule-based analysis")
                raise ValueError("Failed to parse JSON from response")

            return QueryValidationResult(
                is_valid=validation_data.get("is_valid", False),
                confidence_score=validation_data.get("confidence_score", 0),
                validation_details=validation_data.get("validation_details", "Query validation completed"),
                sample_data=sample_data,
                error_message=validation_data.get("error_message"),
                low_confidence_explanation=validation_data.get("low_confidence_explanation"),
                improvement_suggestions=validation_data.get("improvement_suggestions")
            )

        except Exception as e:
            print(f"Warning: Validation failed with error: {e}")
            raise e
