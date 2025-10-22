"""
Central database schema prompt for all AI agents.
This module contains the comprehensive database schema documentation that is shared
across validator_agent.py, query_generator_agent.py, and sql_agent_service.py.
"""

DATABASE_SCHEMA_PROMPT = """**Database Schema - customers table:**

The `customers` table is the central entity for customer campaign analysis and segmentation. It consolidates data from multiple sources (WEBSITE, SHOPIFY, CRM) into a unified structure optimized for marketing operations.

**Core Identity & Contact Fields:**
- `id` (UUID, Primary Key) - Unique system identifier for the customer record
- `source_customer_id` (String, NOT NULL) - Original customer ID from the source system
- `data_source` (String, NOT NULL) - Data source origin: 'WEBSITE', 'SHOPIFY', 'CRM'
- `email` (String, NOT NULL) - Customer email address (primary contact method)
- `first_name` (String, Nullable) - Customer's first name
- `last_name` (String, Nullable) - Customer's last name  
- `phone` (String, Nullable) - Customer's phone number with country code

**Business Value & Engagement Metrics:**
- `total_value` (Float, Default: 0.0) - Total monetary value/lifetime purchases from customer
- `engagement_score` (Integer, Default: 0) - Calculated engagement level (0-100 scale)
- `lifecycle_stage` (String, Nullable) - Customer lifecycle: 'Lead', 'Customer', 'Subscriber', 'Opportunity', 'Prospect'
- `purchase_intent` (String, Nullable) - Purchase likelihood: 'high', 'medium', 'low'
- `segment` (String, Nullable) - Customer segment: 'high_value', 'enterprise', 'startup', 'standard', etc.

**Temporal & Interaction Data:**
- `last_interaction` (DateTime, Nullable) - Timestamp of last customer interaction (orders, visits, contacts)
- `last_engagement_time` (DateTime, Nullable) - Timestamp of last meaningful engagement activity
- `created_at` (DateTime, Default: NOW()) - When customer record was first created
- `updated_at` (DateTime, Auto-updated) - When customer record was last modified

**Marketing & Communication Preferences:**
- `accepts_marketing` (Boolean, Default: TRUE) - **CRITICAL**: Whether customer accepts marketing communications
- `timezone` (String, Nullable) - Customer timezone (e.g., 'America/New_York', 'Europe/London')
- `engagement_frequency` (String, Nullable) - Preferred contact frequency: 'daily', 'weekly', 'monthly'
- `device_preference` (String, Nullable) - Preferred device type: 'mobile', 'desktop', 'tablet'

**JSON Fields for Complex Data:**
- `source_data` (JSON) - Complete original data from source system (see detailed breakdown below)
- `tags` (JSON Array) - Customer tags for segmentation: ["VIP", "repeat_customer", "high_value", "decision_maker"]
- `optimal_send_times` (JSON Array) - Best hours for engagement: [9, 14, 18] (24-hour format)
- `seasonal_activity` (JSON Object) - Activity patterns by season:
  ```json
  {{
    "peak_months": ["March", "April"],
    "low_months": ["November", "December"], 
    "preferred_seasons": ["spring", "summer"]
  }}
  ```
- `preferred_channels` (JSON Array) - Communication channel preferences: ["email", "sms", "whatsapp", "ads"]
- `channel_performance` (JSON Object) - Response rates by channel:
  ```json
  {{
    "email": 0.25,
    "sms": 0.45, 
    "whatsapp": 0.75,
    "ads": 0.12
  }}
  ```
- `social_platforms` (JSON Array) - Active social platforms: ["facebook", "twitter", "linkedin", "youtube"]
- `communication_limits` (JSON Object) - Frequency limits by channel:
  ```json
  {{
    "email_per_week": 5,
    "sms_per_week": 2,
    "whatsapp_per_week": 1,
    "ads_per_day": 7
  }}
  ```

**CRITICAL: Actual source_data JSON Structure by Data Source:**

*WEBSITE source_data contains:*
- `page_views` (Integer) - Number of page views
- `session_count` (Integer) - Number of sessions
- `time_on_site` (Integer) - Total time spent on site in seconds
- `last_visit` (DateTime String) - Last website visit timestamp
- `first_visit` (DateTime String) - First website visit timestamp
- `referrer` (String) - Traffic source referrer
- `utm_source` (String) - UTM campaign source
- `utm_medium` (String) - UTM campaign medium
- `utm_campaign` (String) - UTM campaign name
- `device_type` (String) - Device used: "desktop", "mobile", "tablet"
- `browser` (String) - Browser used
- `location` (String) - Geographic location
- `interests` (Array) - Interest categories: ["fashion", "technology", "sports"]
- `behavior_score` (Integer) - Website behavior score (0-100)
- `conversion_status` (String) - Conversion status: "converted", "browsing", "engaged"
- `newsletter_signup` (Boolean) - Whether signed up for newsletter

*SHOPIFY source_data contains:*
- `total_spent` (Float) - Total amount spent
- `orders_count` (Integer) - Number of orders placed
- `last_order_date` (DateTime String) - Last order timestamp
- `state` (String) - Account state: "enabled", "disabled"
- `cart_abandoned_at` (DateTime String) - When cart was abandoned (null if no abandonment)
- `cart_value` (Float) - Value of abandoned cart
- `lifetime_value` (Float) - Customer lifetime value
- `segment` (String) - Customer segment: "high_value", "new_customer", "at_risk"

*CRM source_data contains:*
- `company` (String) - Company name
- `job_title` (String) - Job title
- `industry` (String) - Industry sector
- `lead_source` (String) - Lead source: "Website", "Social Media", "Referral"
- `lead_status` (String) - Lead status: "Customer", "Qualified Lead", "Cold Lead"
- `deal_stage` (String) - Deal stage: "Closed Won", "Proposal", "Negotiation"
- `deal_value` (Float) - Deal/opportunity value
- `last_contact` (DateTime String) - Last contact timestamp
- `next_followup` (DateTime String) - Next scheduled followup (can be null)
- `notes` (String) - Notes about the customer/lead

**Data Source Specific Context:**

*WEBSITE Source:*
- `total_value` is typically 0.0 (pre-purchase)
- `engagement_score` derived from `behavior_score` (page views, session count, time on site)
- `tags` contains interests/categories: ["fashion", "technology"]
- `lifecycle_stage` based on conversion status: "prospect", "lead", "opportunity", "customer"

*SHOPIFY Source:*
- `total_value` from `total_spent` or `lifetime_value`
- `engagement_score` calculated from orders_count and purchase recency
- `tags` include customer status: ["VIP", "repeat_customer"] 
- `lifecycle_stage` based on purchase history: "prospect", "customer", "lead"

*CRM Source:*
- `total_value` from `deal_value`
- `engagement_score` directly provided or calculated
- `tags` include business context: ["high_value", "decision_maker"]
- `lifecycle_stage` from CRM status: "lead", "opportunity", "customer"

**Query Best Practices:**

1. **Always filter by `accepts_marketing = true`** for campaign queries
2. **Use proper date intervals** with PostgreSQL syntax:
   - Recent activity: `last_interaction >= NOW() - INTERVAL '30 days'`
   - New customers: `created_at >= NOW() - INTERVAL '14 days'`
   - Inactive customers: `last_interaction < NOW() - INTERVAL '90 days'`

3. **Common campaign patterns with actual fields:**
   - Cart abandonment (SHOPIFY): `data_source = 'SHOPIFY' AND (source_data->>'cart_abandoned_at') IS NOT NULL AND accepts_marketing = true`
   - High-value customers: `total_value >= 500 AND engagement_score >= 70 AND accepts_marketing = true`
   - Website visitors (WEBSITE): `data_source = 'WEBSITE' AND (source_data->>'conversion_status') = 'browsing' AND accepts_marketing = true`
   - CRM prospects: `data_source = 'CRM' AND (source_data->>'lead_status') = 'Qualified Lead' AND accepts_marketing = true`
   - Re-engagement: `last_engagement_time < NOW() - INTERVAL '30 days' AND accepts_marketing = true`

4. **JSON field querying with actual source_data fields:**
   - SHOPIFY cart abandonment: `(source_data->>'cart_abandoned_at') IS NOT NULL`
   - WEBSITE high engagement: `(source_data->>'behavior_score')::int >= 70`
   - CRM deal value: `(source_data->>'deal_value')::float >= 10000`
   - Array contains: `tags @> '["VIP"]'`
   - JSON key exists: `seasonal_activity ? 'peak_months'`
   - Channel performance: `(channel_performance->>'email')::float > 0.3`

5. **Essential columns for campaigns:**
   - Always include: `email` (required for outreach)
   - Recommended: `first_name`, `engagement_score`, `total_value`, `lifecycle_stage`
   - Targeting: `segment`, `purchase_intent`, `device_preference`
   - Timing: `timezone`, `optimal_send_times`, `engagement_frequency`

**⚠️ CRITICAL WARNING - DO NOT USE THESE NON-EXISTENT FIELDS:**
- `cart_additions` - DOES NOT EXIST (use `cart_abandoned_at` from SHOPIFY source_data)
- `purchases` - DOES NOT EXIST (use `orders_count`, `last_order_date` from SHOPIFY source_data)
- `transactions` - DOES NOT EXIST (use `total_spent` from SHOPIFY source_data)
- `events` - DOES NOT EXIST (use actual source_data fields listed above)
- `activities` - DOES NOT EXIST (use `last_visit`, `last_contact` from source_data)

**✅ ONLY USE FIELDS THAT ACTUALLY EXIST IN THE SCHEMA ABOVE**"""


def get_database_schema_prompt() -> str:
    """
    Returns the comprehensive database schema prompt for AI agents.
    
    Returns:
        str: The complete database schema documentation
    """
    return DATABASE_SCHEMA_PROMPT
