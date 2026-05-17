from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class KBCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str | None = None
    parent_id: UUID | None = None
    description: str | None = None
    icon: str | None = None
    position: int = 0


class KBCategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: UUID | None = None
    description: str | None = None
    icon: str | None = None
    position: int | None = None


class KBCategoryOut(BaseModel):
    id: UUID
    organization_id: UUID
    parent_id: UUID | None
    name: str
    slug: str
    description: str | None
    icon: str | None
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KBArticleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    slug: str | None = None
    summary: str | None = None
    body: str = ""
    body_format: str = "markdown"
    status: str = "draft"
    locale: str = "en"
    category_id: UUID | None = None
    translation_group_id: UUID | None = None
    tags: list[str] = []
    featured: bool = False
    internal_only: bool = False
    seo_title: str | None = None
    seo_description: str | None = None
    og_image: str | None = None
    scheduled_publish_at: datetime | None = None
    related_article_ids: list[UUID] = []
    change_summary: str | None = None


class KBArticleUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    summary: str | None = None
    body: str | None = None
    body_format: str | None = None
    status: str | None = None
    locale: str | None = None
    category_id: UUID | None = None
    tags: list[str] | None = None
    featured: bool | None = None
    internal_only: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    og_image: str | None = None
    scheduled_publish_at: datetime | None = None
    related_article_ids: list[UUID] | None = None
    change_summary: str | None = None


class KBArticleOut(BaseModel):
    id: UUID
    organization_id: UUID
    category_id: UUID | None
    author_user_id: UUID | None
    translation_group_id: UUID
    title: str
    slug: str
    summary: str | None
    body: str
    body_format: str
    status: str
    locale: str
    featured: bool
    internal_only: bool
    seo_title: str | None
    seo_description: str | None
    og_image: str | None
    tags: list[str]
    related_article_ids: dict
    scheduled_publish_at: datetime | None
    published_at: datetime | None
    archived_at: datetime | None
    view_count: int
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KBArticleSummary(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    category_id: UUID | None
    locale: str
    featured: bool
    status: str
    published_at: datetime | None
    view_count: int
    helpful_count: int
    not_helpful_count: int

    model_config = {"from_attributes": True}


class KBArticleSearchHit(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    snippet: str | None
    category_id: UUID | None
    locale: str
    score: float


class KBArticleRevisionOut(BaseModel):
    id: UUID
    article_id: UUID
    revision_number: int
    title: str
    body: str
    summary: str | None
    change_summary: str | None
    author_user_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class KBFeedbackCreate(BaseModel):
    helpful: bool
    comment: str | None = None
    contact_email: str | None = None
    visitor_session_id: str | None = None


class KBFeedbackOut(BaseModel):
    id: UUID
    article_id: UUID
    helpful: bool
    comment: str | None
    contact_email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class KBViewCreate(BaseModel):
    source: str = "public"
    visitor_session_id: str | None = None
    referrer: str | None = None


class KBArticleCommentCreate(BaseModel):
    content: str = Field(min_length=1)


class KBArticleCommentOut(BaseModel):
    id: UUID
    article_id: UUID
    author_user_id: UUID | None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class KBArticleImport(BaseModel):
    title: str
    slug: str | None = None
    body: str = ""
    body_format: str = "markdown"
    summary: str | None = None
    status: str = "draft"
    locale: str = "en"
    tags: list[str] = []
    category_slug: str | None = None


class KBImportPayload(BaseModel):
    articles: list[KBArticleImport]


class KBAnalyticsOut(BaseModel):
    total_articles: int
    published_articles: int
    draft_articles: int
    archived_articles: int
    total_views_30d: int
    total_feedback_30d: int
    helpful_ratio: float
    top_viewed: list[dict]
    top_helpful: list[dict]
    top_unhelpful: list[dict]
