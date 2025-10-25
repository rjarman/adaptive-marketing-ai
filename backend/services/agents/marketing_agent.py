import json
import re
from typing import List, Dict, Any

from rich import print

from core.llm_handler import openai_client
from core.settings import settings
from core.utils import parse_json
from models import Customer
from models.schemas import QueryProcessingResult


class MarketingAgent:
    _MARKETING_TEMPERATURE = 0.8
    _SUPPORTED_CHANNELS = ["email", "sms", "whatsapp", "ads"]
    _MAX_DATA_POINTS = 10

    @staticmethod
    async def is_marketing_messages_needed(user_message: str) -> bool:
        try:
            print("[cyan]Analyzing if marketing messages are needed...[/cyan]")
            system_prompt = """You are an Intent Analysis Agent that determines whether a user query requires marketing campaign message generation.

Your task is to analyze user messages and determine if they are asking for:
1. Marketing campaign creation
2. Marketing message generation
3. Campaign content for specific channels (email, SMS, WhatsApp, ads)
4. Customer outreach messages
5. Promotional content creation

**Examples of queries that NEED marketing messages:**
- "Create a campaign for customers who abandoned their cart"
- "Generate marketing messages for high-value customers"
- "Send promotional emails to customers from Shopify"
- "Create SMS campaign for customers with high engagement"
- "Generate ads for customers who haven't purchased recently"
- "Create outreach messages for customers"
- "Make marketing content for email and WhatsApp"

**Examples of queries that DON'T need marketing messages:**
- "How many customers do we have?"
- "Show me customer data from CRMS"
- "What is the average order value?"
- "Find customers who purchased in the last month"
- "Export customer list to CSV"
- "Analyze customer demographics"
- "Show me sales statistics"

**Response Format:**
Return ONLY a JSON object with this exact structure:
{
  "needs_marketing_messages": boolean,
  "reasoning": "Brief explanation of your decision",
  "confidence": float between 0.0 and 1.0
}

Be strict - only return true if the user is explicitly asking for marketing content, campaigns, or promotional messages."""

            user_prompt = f"""Analyze this user query and determine if it requires marketing message generation:

User Query: "{user_message}"

Return your analysis in the specified JSON format."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.3,
                max_tokens=500,
                stream=False
            )
            content = response.choices[0].message.content.strip()
            try:
                analysis = parse_json(content)
                needs_marketing = analysis.get('needs_marketing_messages', False)
                reasoning = analysis.get('reasoning', 'No reasoning provided')
                confidence = analysis.get('confidence', 0.5)
                print(f"[cyan]Marketing intent analysis: {needs_marketing} (confidence: {confidence:.2f})[/cyan]")
                print(f"[cyan]Reasoning: {reasoning}[/cyan]")
                return bool(needs_marketing)

            except json.JSONDecodeError as e:
                print(f"[yellow]JSON parsing error in intent analysis: {e}[/yellow]")
                print(f"[yellow]Raw response: {content}[/yellow]")
                return False

        except Exception as e:
            error_msg = f"Marketing intent analysis error: {str(e)}"
            print(f"[red]{error_msg}[/red]")
            return False

    @staticmethod
    def _get_system_prompt() -> str:
        return """You are a Marketing Campaign Specialist who creates SEO-friendly marketing messages for different channels.

Your role is to:
1. Analyze user requests to understand marketing intent and preferred channels
2. Generate compelling, SEO-friendly marketing campaign messages
3. Create channel-specific content optimized for each platform
4. Return structured JSON format with channel and message pairs

**Channel Detection Rules:**
- If user mentions specific channels (email, SMS, social media, etc.), prioritize those channels
- If no specific channels mentioned, generate messages for the most relevant channels based on intent
- Always include all channels unless user specifically requests few channels

**Supported Channels:**
email, sms, whatsapp, ads

**Message Guidelines:**
- Messages should be templates with {{property}} placeholders for personalization
- Only use placeholders for properties that are explicitly allowed
- Keep messages concise and action-oriented
- Include relevant keywords for SEO optimization
- Use channel-appropriate tone and format
- Include clear call-to-action (CTA)
- Ensure compliance with marketing best practices

**Response Format:**
Return ONLY a valid JSON array in this exact format:

For EMAIL messages:
[
  {
    "channel": "email",
    "subject": "Subject line template with {{placeholders}}",
    "message": "Email body template with {{placeholders}}"
  }
]

For OTHER channels (sms, whatsapp, ads):
[
  {
    "channel": "sms",
    "message": "Message template with {{placeholders}}"
  }
]

**Important:**
- Return ONLY the JSON array, no additional text or formatting
- Ensure all JSON is properly formatted and valid
- Tailor message length and style to each channel's requirements
- Include all channels messages unless user specifies otherwise"""

    async def generate_campaign_messages(
            self,
            result: QueryProcessingResult,
            user_message: str,
            allowed_properties: list[tuple[str, str]]
    ) -> List[Dict[str, str]]:
        try:
            print("[cyan]Marketing Agent generating campaign messages...[/cyan]")
            customer_count = len(result.all_data) if result.all_data else 0
            sample_customers = result.all_data[:self._MAX_DATA_POINTS] if result.all_data else []
            context = self._build_marketing_context(
                user_message=user_message,
                customer_count=customer_count,
                sample_customers=sample_customers,
                allowed_properties=allowed_properties,
                explanation=result.explanation
            )
            messages = [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": context}
            ]
            print("[cyan]Generating channel-specific marketing messages...[/cyan]")
            response = await openai_client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=self._MARKETING_TEMPERATURE,
                stream=False
            )
            content = response.choices[0].message.content.strip()
            try:
                campaign_messages = parse_json(content)
                for msg in campaign_messages:
                    if not isinstance(msg, dict) or 'channel' not in msg:
                        raise ValueError("Each message must have 'channel' field")
                    if msg['channel'] == 'email':
                        if 'subject' not in msg or 'message' not in msg:
                            raise ValueError("Email messages must have both 'subject' and 'message' fields")
                    else:
                        if 'message' not in msg:
                            raise ValueError("Non-email messages must have 'message' field")
                print(f"[green]Generated {len(campaign_messages)} marketing messages[/green]")
                return campaign_messages

            except json.JSONDecodeError as e:
                print(f"[red]JSON parsing error: {e}[/red]")
                print(f"[red]Raw response: {content}[/red]")
                raise

        except Exception as e:
            error_msg = f"Marketing Agent error: {str(e)}"
            print(f"[red]{error_msg}[/red]")
            raise Exception("Failed to generate campaign messages") from e

    def _build_marketing_context(
            self,
            user_message: str,
            customer_count: int,
            sample_customers: List[Dict[str, Any]],
            allowed_properties: list[tuple[str, str]],
            explanation: str = None
    ) -> str:
        customer_insights = self._extract_customer_insights(sample_customers, allowed_properties)
        allowed_props_text = ", ".join([f"{prop[0]} ({prop[1]})" for prop in allowed_properties])
        context = f"""
Generate marketing campaign messages for this request:

**User Request:** "{user_message}"

**Target Audience:** {customer_count} customers identified

**Campaign Context:** {explanation if explanation else "Customer targeting campaign"}

**Customer Insights:**
{customer_insights}

**Available Properties for Personalization:**
{allowed_props_text}

**Requirements:**
1. Analyze the user request to determine appropriate marketing channels
2. Generate compelling, SEO-friendly message TEMPLATES with {{{{property}}}} placeholders
3. Use ONLY the allowed properties listed above for personalization
4. Ensure messages are action-oriented with clear CTAs
5. Optimize message length and tone for each channel

**Template Example:**
"Hi {{{{first_name}}}}, your {{{{data_source}}}} cart is waiting! Complete your purchase now."

**Channel Selection Guidelines:**
- Email: Include separate "subject" and "message" fields with personalization placeholders
- SMS: Short, urgent messages (160 chars max) with key placeholders
- WhatsApp: Conversational, friendly tone with personal touches
- Ads: Compelling, action-oriented advertising copy with targeting data

Return ONLY the JSON array with channel-message template pairs.
"""
        return context

    @staticmethod
    def _extract_customer_insights(sample_customers: List[Dict[str, Any]],
                                   allowed_properties: list[tuple[str, str]]) -> str:
        if not sample_customers:
            return "No specific customer data available"
        insights = []
        allowed_prop_names = [prop[0] for prop in allowed_properties]
        property_values = {}
        for customer in sample_customers:
            for prop_name in allowed_prop_names:
                if prop_name in customer and customer[prop_name] is not None:
                    if prop_name not in property_values:
                        property_values[prop_name] = set()
                    property_values[prop_name].add(str(customer[prop_name]))
        for prop_name, values in property_values.items():
            if values:
                prop_description = next((prop[1] for prop in allowed_properties if prop[0] == prop_name), prop_name)
                insights.append(f"{prop_description}: {', '.join(filter(None, values))}")
        insights.append(f"Sample customer data available for {len(sample_customers)} customers")
        return "; ".join(insights) if insights else "General customer base"

    def enrich_messages_with_customer_data(
            self,
            messages: List[Dict[str, str]],
            all_data: List[Customer],
            keys: list[str]
    ) -> List[Dict[str, Any]]:
        enriched_messages = []
        for msg in messages:
            channel = msg.get("channel")
            message = msg.get("message")
            subject = msg.get("subject")

            customer_data = self._filter_customers_by_channel_preference(channel, all_data, message, subject, keys)
            enriched_msg = {
                "channel": channel,
                "metadata": customer_data,
                "total": len(customer_data)
            }
            enriched_messages.append(enriched_msg)
        return enriched_messages

    @staticmethod
    def _prepare_message(message: str, allowed_keys: list[str], data: Customer) -> str:
        message = message.strip()
        placeholders = re.findall(r'\{\{(\w+)\}\}', message)
        for placeholder in placeholders:
            if placeholder in allowed_keys:
                value = getattr(data, placeholder, "")
                if value is None:
                    value = ""
                placeholder_pattern = f"{{{{{placeholder}}}}}"
                message = message.replace(placeholder_pattern, str(value))
            else:
                placeholder_pattern = f"{{{{{placeholder}}}}}"
                message = message.replace(placeholder_pattern, "")

        return message

    def _filter_customers_by_channel_preference(
            self,
            channel: str,
            all_data: List[Customer],
            message: str,
            subject: str = None,
            keys: list[str] = None
    ) -> List[Dict[str, Any]]:
        filtered_customers = []
        for customer in all_data:
            preferred_channels = customer.preferred_channels
            if channel not in preferred_channels:
                continue
            customer_info = {
                "user_id": customer.id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "data_source": customer.data_source,
            }
            if message and keys:
                customer_info["message"] = self._prepare_message(message, keys, customer)
            if channel == "email" and subject and keys:
                customer_info["subject"] = self._prepare_message(subject, keys, customer)
            if channel == "ads":
                social_platforms = customer.social_platforms
                if social_platforms:
                    customer_info['social_platforms'] = social_platforms
            elif channel == "email":
                email = customer.email
                if email:
                    customer_info['email'] = email
            elif channel in ["sms", "whatsapp"]:
                phone = customer.phone
                if phone:
                    customer_info['phone'] = phone

            customer_info = {k: v for k, v in customer_info.items() if v is not None}
            has_required_contact = False
            if channel == "ads" and 'social_platforms' in customer_info:
                has_required_contact = True
            elif channel == "email" and 'email' in customer_info:
                has_required_contact = True
            elif channel in ["sms", "whatsapp"] and 'phone' in customer_info:
                has_required_contact = True

            if has_required_contact and customer_info:
                filtered_customers.append(customer_info)

        return filtered_customers
