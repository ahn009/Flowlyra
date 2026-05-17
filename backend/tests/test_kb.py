"""Phase 4 KB smoke tests: model imports, slug helpers, search snippet, schemas."""

import uuid

import pytest

from app.models import KBArticle, KBArticleComment, KBArticleFeedback, KBArticleRevision, KBArticleView, KBCategory
from app.schemas.kb import KBArticleCreate, KBArticleUpdate, KBCategoryCreate, KBFeedbackCreate
from app.services.kb_service import (
    apply_status_transition,
    deserialize_related_ids,
    make_snippet,
    serialize_related_ids,
    slugify,
)


def test_kb_models_tablenames():
    assert KBCategory.__tablename__ == "kb_categories"
    assert KBArticle.__tablename__ == "kb_articles"
    assert KBArticleRevision.__tablename__ == "kb_article_revisions"
    assert KBArticleFeedback.__tablename__ == "kb_article_feedback"
    assert KBArticleView.__tablename__ == "kb_article_views"
    assert KBArticleComment.__tablename__ == "kb_article_comments"


def test_slugify_basic():
    assert slugify("Hello World!") == "hello-world"
    assert slugify("   Multi---Dash  ") == "multi-dash"
    assert slugify("Über Café") == "ber-caf"
    assert slugify("") != ""


def test_make_snippet_window():
    body = "lorem ipsum dolor sit amet, the term refund appears in the middle of this body " * 4
    snippet = make_snippet(body, "refund", length=120)
    assert "refund" in snippet


def test_make_snippet_no_match_returns_prefix():
    assert make_snippet("hello world", "missing", length=5) == "hello"


def test_apply_status_transition_publishes():
    article = KBArticle(
        organization_id=uuid.uuid4(),
        translation_group_id=uuid.uuid4(),
        title="t",
        slug="t",
        body="",
        status="draft",
    )
    assert article.published_at is None
    apply_status_transition(article, "published")
    assert article.status == "published"
    assert article.published_at is not None
    apply_status_transition(article, "archived")
    assert article.status == "archived"
    assert article.archived_at is not None


def test_related_ids_roundtrip():
    ids = [uuid.uuid4(), uuid.uuid4()]
    payload = serialize_related_ids(ids)
    assert payload == {"items": [str(i) for i in ids]}
    out = deserialize_related_ids(payload)
    assert out == ids
    assert deserialize_related_ids(None) == []
    assert deserialize_related_ids({"items": ["not-a-uuid", str(ids[0])]}) == [ids[0]]


def test_schemas_basic():
    c = KBCategoryCreate(name="Getting Started")
    assert c.position == 0
    a = KBArticleCreate(title="Intro")
    assert a.status == "draft"
    assert a.locale == "en"
    u = KBArticleUpdate(title="x")
    assert u.title == "x"
    fb = KBFeedbackCreate(helpful=True, comment="thanks")
    assert fb.helpful is True
