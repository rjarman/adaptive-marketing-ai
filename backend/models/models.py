import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Float, Integer, Boolean, JSON

from models import Base


class Integration(Base):
    """
    Represents an integration entity in the system.

    This class defines the structure and properties of an integration within
    the database, specifying its unique identifier, data source, and the time
    at which it was created. It is designed to handle data storage and retrieval
    of integration-related information seamlessly across the application.
    """
    __tablename__ = "integrations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    data_source = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    """
    Represents a chat message entity within the system.

    This class is used to store and manage chat message data. It includes
    information such as the message content, response, sources used, and the creation timestamp.
    It is intended to be used as a database model for storing data related to
    chat interactions.

    Attributes:
        id: A unique identifier for the chat message.
        message: The content of the chat message provided by the user.
        response: The response generated for the given chat message.
        sources: JSON array of data sources used to generate the response.
        created_at: The timestamp indicating when the message was created.

    """
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    """
    Represents a customer and associated attributes for marketing and interactions optimization.

    The Customer class is designed to store and manage comprehensive information about a
    customer, including contact details, engagement metrics, marketing preferences, and
    interaction optimization data. It serves as a central entity for businesses to manage
    customer data and enhance customer experiences through personalized marketing and
    communications.

    Attributes
    ----------
    id : str
        Unique identifier for the customer record (UUID).
    source_customer_id : str
        Source-specific identifier for the customer.
    data_source : str
        The origin of the customer data (e.g., application, platform, or system).
    email : str
        The email address of the customer.
    first_name : str, optional
        The first name of the customer (if available).
    last_name : str, optional
        The last name of the customer (if available).
    phone : str, optional
        Contact phone number of the customer (if available).
    total_value : float
        The total monetary value associated with the customer, default is 0.0.
    engagement_score : int
        A calculated score representing the customer's level of engagement, default is 0.
    lifecycle_stage : str, optional
        Lifecycle stage of the customer (e.g., Lead, Customer, Subscriber).
    last_interaction : datetime, optional
        The timestamp of the last interaction with the customer.
    created_at : datetime
        The timestamp when the customer record was created, default is the current time.
    updated_at : datetime
        The timestamp when the customer record was last updated, automatically updated.

    source_data : dict
        A JSON object containing additional metadata or custom data related to the customer.

    tags : dict
        A JSON array of tags associated with the customer for segmentation.
    segment : str, optional
        The segment to which the customer belongs.
    purchase_intent : str, optional
        Purchase intent level of the customer (e.g., high, medium, low).
    accepts_marketing : bool
        Indicates whether the customer has opted to receive marketing communications,
        default is True.

    timezone : str, optional
        The timezone of the customer.
    optimal_send_times : dict
        A JSON object specifying the optimal times for engaging the customer.
    last_engagement_time : datetime, optional
        The timestamp of the last meaningful engagement with the customer.
    engagement_frequency : str, optional
        Frequency preference for communications (e.g., daily, weekly, monthly).
    seasonal_activity : dict
        A JSON object summarizing the customer's activity by season or month.

    preferred_channels : dict
        A JSON object containing the preferred channels for communication (e.g., email, sms).
    channel_performance : dict
        A JSON object summarizing the customer's response performance across channels.
    device_preference : str, optional
        The preferred type of device used by the customer (e.g., mobile, desktop, tablet).
    social_platforms : dict
        A JSON object listing social media platforms the customer is active on.
    communication_limits : dict
        A JSON object specifying the communication frequency limits by channel.
    """
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    source_customer_id = Column(String, nullable=False)
    data_source = Column(String, nullable=False)
    email = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String)

    total_value = Column(Float, default=0.0)
    engagement_score = Column(Integer, default=0)
    lifecycle_stage = Column(String)
    last_interaction = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    source_data = Column(JSON)

    tags = Column(JSON)
    segment = Column(String)
    purchase_intent = Column(String)
    accepts_marketing = Column(Boolean, default=True)

    timezone = Column(String)
    optimal_send_times = Column(JSON)
    last_engagement_time = Column(DateTime)
    engagement_frequency = Column(String)
    seasonal_activity = Column(JSON)

    preferred_channels = Column(JSON)
    channel_performance = Column(JSON)
    device_preference = Column(String)
    social_platforms = Column(JSON)
    communication_limits = Column(JSON)
