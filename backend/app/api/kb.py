from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from io import StringIO
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import TokenUser, current_user
from app.models.kb import (
    KBArticle,
    KBArticleComment,
    KBArticleFeedback,
    KBArticleRevision,
    KBArticleView,
    KBCategory,
)
from app.models.organization import Organization
from app.schemas.kb import (
    KBAnalyticsOut,
    KBArticleCommentCreate,
    KBArticleCommentOut,
    KBArticleCreate,
    KBArticleOut,
    KBArticleRevisionOut,
    KBArticleSearchHit,
    KBArticleSummary,
    KBArticleUpdate,
    KBCategoryCreate,
    KBCategoryOut,
    KBCategoryUpdate,
    KBFeedbackCreate,
    KBFeedbackOut,
    KBImportPayload,
    KBViewCreate,
)
from app.services.kb_service import (
    apply_status_transition,
    deserialize_related_ids,
    record_revision,
    record_view,
    search_articles,
    serialize_related_ids,
    slugify,
    unique_article_slug,
    unique_category_slug,
)

VALID_STATUSES = {"draft", "review", "published", "archived", "scheduled"}

admin_router = APIRouter(prefix="/kb", tags=["kb"])
public_router = APIRouter(prefix="/public/kb", tags=["kb-public"])


# ---------- Categories ----------


@admin_router.get("/categories", response_model=list[KBCategoryOut])
async def list_categories(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[KBCategory]:
    stmt = (
        select(KBCategory)
        .where(KBCategory.organization_id == user.organization_id)
        .order_by(KBCategory.position, KBCategory.name)
    )
    return list((await db.execute(stmt)).scalars().all())


@admin_router.post("/categories", response_model=KBCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: KBCategoryCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBCategory:
    slug = await unique_category_slug(db, organization_id=user.organization_id, base=payload.slug or payload.name)
    category = KBCategory(
        organization_id=user.organization_id,
        parent_id=payload.parent_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        icon=payload.icon,
        position=payload.position,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@admin_router.patch("/categories/{category_id}", response_model=KBCategoryOut)
async def update_category(
    category_id: uuid.UUID,
    payload: KBCategoryUpdate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBCategory:
    category = await _get_category_for_org(db, category_id, user.organization_id)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"]:
        data["slug"] = await unique_category_slug(
            db, organization_id=user.organization_id, base=data["slug"], exclude_id=category.id
        )
    for key, value in data.items():
        setattr(category, key, value)
    await db.commit()
    await db.refresh(category)
    return category


@admin_router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    category = await _get_category_for_org(db, category_id, user.organization_id)
    await db.delete(category)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Articles ----------


@admin_router.get("/articles", response_model=list[KBArticleSummary])
async def list_articles(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status"),
    category_id: uuid.UUID | None = None,
    locale: str | None = None,
    featured: bool | None = None,
    internal_only: bool | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[KBArticle]:
    stmt = select(KBArticle).where(KBArticle.organization_id == user.organization_id)
    if status_filter:
        stmt = stmt.where(KBArticle.status == status_filter)
    if category_id:
        stmt = stmt.where(KBArticle.category_id == category_id)
    if locale:
        stmt = stmt.where(KBArticle.locale == locale)
    if featured is not None:
        stmt = stmt.where(KBArticle.featured.is_(featured))
    if internal_only is not None:
        stmt = stmt.where(KBArticle.internal_only.is_(internal_only))
    if q:
        like = f"%{q}%"
        stmt = stmt.where((KBArticle.title.ilike(like)) | (KBArticle.body.ilike(like)))
    stmt = stmt.order_by(desc(KBArticle.updated_at)).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


@admin_router.post("/articles", response_model=KBArticleOut, status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: KBArticleCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBArticle:
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")
    slug = await unique_article_slug(
        db,
        organization_id=user.organization_id,
        locale=payload.locale,
        base=payload.slug or payload.title,
    )
    article = KBArticle(
        organization_id=user.organization_id,
        category_id=payload.category_id,
        author_user_id=user.id,
        translation_group_id=payload.translation_group_id or uuid.uuid4(),
        title=payload.title,
        slug=slug,
        summary=payload.summary,
        body=payload.body,
        body_format=payload.body_format,
        status="draft",
        locale=payload.locale,
        featured=payload.featured,
        internal_only=payload.internal_only,
        seo_title=payload.seo_title,
        seo_description=payload.seo_description,
        og_image=payload.og_image,
        tags=payload.tags,
        related_article_ids=serialize_related_ids(payload.related_article_ids),
        scheduled_publish_at=payload.scheduled_publish_at,
    )
    apply_status_transition(article, payload.status)
    db.add(article)
    await db.flush()
    await record_revision(db, article=article, author_user_id=user.id, change_summary=payload.change_summary or "created")
    await db.commit()
    await db.refresh(article)
    return article


@admin_router.get("/articles/{article_id}", response_model=KBArticleOut)
async def get_article(
    article_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBArticle:
    return await _get_article_for_org(db, article_id, user.organization_id)


@admin_router.patch("/articles/{article_id}", response_model=KBArticleOut)
async def update_article(
    article_id: uuid.UUID,
    payload: KBArticleUpdate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBArticle:
    article = await _get_article_for_org(db, article_id, user.organization_id)
    data = payload.model_dump(exclude_unset=True)
    new_status = data.pop("status", None)
    change_summary = data.pop("change_summary", None)
    if new_status and new_status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")
    if "slug" in data and data["slug"]:
        data["slug"] = await unique_article_slug(
            db,
            organization_id=user.organization_id,
            locale=data.get("locale", article.locale),
            base=data["slug"],
            exclude_id=article.id,
        )
    if "related_article_ids" in data:
        data["related_article_ids"] = serialize_related_ids(data["related_article_ids"] or [])
    record_body_change = "body" in data or "title" in data or "summary" in data
    for key, value in data.items():
        setattr(article, key, value)
    if record_body_change:
        await record_revision(db, article=article, author_user_id=user.id, change_summary=change_summary)
    if new_status:
        apply_status_transition(article, new_status)
    await db.commit()
    await db.refresh(article)
    return article


@admin_router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    article = await _get_article_for_org(db, article_id, user.organization_id)
    await db.delete(article)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get("/articles/{article_id}/revisions", response_model=list[KBArticleRevisionOut])
async def list_revisions(
    article_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[KBArticleRevision]:
    await _get_article_for_org(db, article_id, user.organization_id)
    stmt = (
        select(KBArticleRevision)
        .where(KBArticleRevision.article_id == article_id)
        .order_by(desc(KBArticleRevision.revision_number))
    )
    return list((await db.execute(stmt)).scalars().all())


@admin_router.post("/articles/{article_id}/revisions/{revision_id}/restore", response_model=KBArticleOut)
async def restore_revision(
    article_id: uuid.UUID,
    revision_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBArticle:
    article = await _get_article_for_org(db, article_id, user.organization_id)
    revision = (
        await db.execute(
            select(KBArticleRevision).where(
                KBArticleRevision.id == revision_id, KBArticleRevision.article_id == article.id
            )
        )
    ).scalar_one_or_none()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    article.title = revision.title
    article.body = revision.body
    article.summary = revision.summary
    await record_revision(db, article=article, author_user_id=user.id, change_summary=f"restored r{revision.revision_number}")
    await db.commit()
    await db.refresh(article)
    return article


@admin_router.get("/articles/{article_id}/comments", response_model=list[KBArticleCommentOut])
async def list_article_comments(
    article_id: uuid.UUID,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> list[KBArticleComment]:
    await _get_article_for_org(db, article_id, user.organization_id)
    stmt = (
        select(KBArticleComment)
        .where(KBArticleComment.article_id == article_id)
        .order_by(KBArticleComment.created_at)
    )
    return list((await db.execute(stmt)).scalars().all())


@admin_router.post(
    "/articles/{article_id}/comments",
    response_model=KBArticleCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_article_comment(
    article_id: uuid.UUID,
    payload: KBArticleCommentCreate,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBArticleComment:
    await _get_article_for_org(db, article_id, user.organization_id)
    comment = KBArticleComment(
        article_id=article_id,
        organization_id=user.organization_id,
        author_user_id=user.id,
        content=payload.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


# ---------- Search (agent + public) ----------


@admin_router.get("/search", response_model=list[KBArticleSearchHit])
async def admin_search(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
    q: str = Query(min_length=1, max_length=255),
    locale: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
) -> list[KBArticleSearchHit]:
    hits = await search_articles(
        db, organization_id=user.organization_id, query=q, locale=locale, include_internal=True, limit=limit
    )
    return _hits_to_schema(hits)


# ---------- Bulk import/export ----------


@admin_router.post("/articles/import")
async def import_articles(
    payload: KBImportPayload,
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    created = 0
    cat_cache: dict[str, KBCategory] = {}
    for item in payload.articles:
        category_id: uuid.UUID | None = None
        if item.category_slug:
            slug = slugify(item.category_slug)
            cached = cat_cache.get(slug)
            if cached is None:
                cached = (
                    await db.execute(
                        select(KBCategory).where(
                            KBCategory.organization_id == user.organization_id, KBCategory.slug == slug
                        )
                    )
                ).scalar_one_or_none()
                if cached is None:
                    cached = KBCategory(
                        organization_id=user.organization_id, name=item.category_slug, slug=slug
                    )
                    db.add(cached)
                    await db.flush()
                cat_cache[slug] = cached
            category_id = cached.id
        slug = await unique_article_slug(
            db,
            organization_id=user.organization_id,
            locale=item.locale,
            base=item.slug or item.title,
        )
        article = KBArticle(
            organization_id=user.organization_id,
            category_id=category_id,
            author_user_id=user.id,
            translation_group_id=uuid.uuid4(),
            title=item.title,
            slug=slug,
            body=item.body,
            body_format=item.body_format,
            summary=item.summary,
            status="draft",
            locale=item.locale,
            tags=item.tags,
        )
        if item.status in VALID_STATUSES and item.status != "draft":
            apply_status_transition(article, item.status)
        else:
            article.status = "draft"
        db.add(article)
        await db.flush()
        await record_revision(db, article=article, author_user_id=user.id, change_summary="imported")
        created += 1
    await db.commit()
    return {"ok": True, "created": created}


@admin_router.get("/articles/export.json")
async def export_articles_json(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    rows = (
        await db.execute(select(KBArticle).where(KBArticle.organization_id == user.organization_id))
    ).scalars().all()
    cats = {
        c.id: c
        for c in (
            await db.execute(select(KBCategory).where(KBCategory.organization_id == user.organization_id))
        ).scalars().all()
    }
    payload = {
        "articles": [
            {
                "title": r.title,
                "slug": r.slug,
                "body": r.body,
                "body_format": r.body_format,
                "summary": r.summary,
                "status": r.status,
                "locale": r.locale,
                "tags": r.tags,
                "category_slug": cats[r.category_id].slug if r.category_id and r.category_id in cats else None,
            }
            for r in rows
        ]
    }
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="kb-export.json"'},
    )


# ---------- Analytics ----------


@admin_router.get("/analytics", response_model=KBAnalyticsOut)
async def kb_analytics(
    user: Annotated[TokenUser, Depends(current_user)],
    db: AsyncSession = Depends(get_db),
) -> KBAnalyticsOut:
    from sqlalchemy import case

    org = user.organization_id
    totals = (
        await db.execute(
            select(
                func.count(KBArticle.id).label("total"),
                func.sum(case((KBArticle.status == "published", 1), else_=0)).label("published"),
                func.sum(case((KBArticle.status == "draft", 1), else_=0)).label("draft"),
                func.sum(case((KBArticle.status == "archived", 1), else_=0)).label("archived"),
            ).where(KBArticle.organization_id == org)
        )
    ).one()

    thirty_days_ago = datetime.now(UTC).replace(microsecond=0)
    from datetime import timedelta as _td

    cutoff = thirty_days_ago - _td(days=30)
    views_30d = (
        await db.execute(
            select(func.count(KBArticleView.id))
            .where(KBArticleView.organization_id == org)
            .where(KBArticleView.created_at >= cutoff)
        )
    ).scalar_one()
    fb_rows = (
        await db.execute(
            select(KBArticleFeedback.helpful, func.count(KBArticleFeedback.id))
            .where(KBArticleFeedback.organization_id == org)
            .where(KBArticleFeedback.created_at >= cutoff)
            .group_by(KBArticleFeedback.helpful)
        )
    ).all()
    helpful_count = sum(c for h, c in fb_rows if h)
    fb_total = sum(c for _, c in fb_rows)
    ratio = (helpful_count / fb_total) if fb_total else 0.0

    top_viewed = (
        await db.execute(
            select(KBArticle.id, KBArticle.title, KBArticle.view_count)
            .where(KBArticle.organization_id == org)
            .order_by(desc(KBArticle.view_count))
            .limit(10)
        )
    ).all()
    top_helpful = (
        await db.execute(
            select(KBArticle.id, KBArticle.title, KBArticle.helpful_count)
            .where(KBArticle.organization_id == org)
            .order_by(desc(KBArticle.helpful_count))
            .limit(10)
        )
    ).all()
    top_unhelpful = (
        await db.execute(
            select(KBArticle.id, KBArticle.title, KBArticle.not_helpful_count)
            .where(KBArticle.organization_id == org)
            .order_by(desc(KBArticle.not_helpful_count))
            .limit(10)
        )
    ).all()

    return KBAnalyticsOut(
        total_articles=int(totals.total or 0),
        published_articles=int(totals.published or 0),
        draft_articles=int(totals.draft or 0),
        archived_articles=int(totals.archived or 0),
        total_views_30d=int(views_30d or 0),
        total_feedback_30d=fb_total,
        helpful_ratio=round(ratio, 3),
        top_viewed=[{"id": str(r[0]), "title": r[1], "view_count": r[2]} for r in top_viewed],
        top_helpful=[{"id": str(r[0]), "title": r[1], "helpful_count": r[2]} for r in top_helpful],
        top_unhelpful=[{"id": str(r[0]), "title": r[1], "not_helpful_count": r[2]} for r in top_unhelpful],
    )


# ---------- Public endpoints (no auth) ----------


@public_router.get("/{org_slug}/categories", response_model=list[KBCategoryOut])
async def public_list_categories(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
) -> list[KBCategory]:
    org = await _get_org_by_slug(db, org_slug)
    return list(
        (
            await db.execute(
                select(KBCategory)
                .where(KBCategory.organization_id == org.id)
                .order_by(KBCategory.position, KBCategory.name)
            )
        )
        .scalars()
        .all()
    )


@public_router.get("/{org_slug}/articles", response_model=list[KBArticleSummary])
async def public_list_articles(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
    category_slug: str | None = None,
    locale: str | None = None,
    featured: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[KBArticle]:
    org = await _get_org_by_slug(db, org_slug)
    stmt = (
        select(KBArticle)
        .where(KBArticle.organization_id == org.id)
        .where(KBArticle.status == "published")
        .where(KBArticle.internal_only.is_(False))
    )
    if category_slug:
        cat = (
            await db.execute(
                select(KBCategory).where(
                    KBCategory.organization_id == org.id, KBCategory.slug == category_slug
                )
            )
        ).scalar_one_or_none()
        if not cat:
            return []
        stmt = stmt.where(KBArticle.category_id == cat.id)
    if locale:
        stmt = stmt.where(KBArticle.locale == locale)
    if featured is not None:
        stmt = stmt.where(KBArticle.featured.is_(featured))
    stmt = stmt.order_by(desc(KBArticle.featured), desc(KBArticle.published_at)).limit(limit)
    return list((await db.execute(stmt)).scalars().all())


@public_router.get("/{org_slug}/articles/{slug}", response_model=KBArticleOut)
async def public_get_article(
    org_slug: str,
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    locale: str = "en",
    session_id: str | None = None,
) -> KBArticle:
    org = await _get_org_by_slug(db, org_slug)
    article = (
        await db.execute(
            select(KBArticle).where(
                KBArticle.organization_id == org.id,
                KBArticle.slug == slug,
                KBArticle.locale == locale,
                KBArticle.status == "published",
                KBArticle.internal_only.is_(False),
            )
        )
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await record_view(
        db,
        article=article,
        organization_id=org.id,
        source="public",
        visitor_session_id=session_id,
        referrer=request.headers.get("referer"),
    )
    await db.commit()
    await db.refresh(article)
    return article


@public_router.get("/{org_slug}/articles/{slug}/related", response_model=list[KBArticleSummary])
async def public_related_articles(
    org_slug: str,
    slug: str,
    db: AsyncSession = Depends(get_db),
    locale: str = "en",
    limit: int = Query(default=5, ge=1, le=20),
) -> list[KBArticle]:
    org = await _get_org_by_slug(db, org_slug)
    article = (
        await db.execute(
            select(KBArticle).where(
                KBArticle.organization_id == org.id,
                KBArticle.slug == slug,
                KBArticle.locale == locale,
                KBArticle.status == "published",
            )
        )
    ).scalar_one_or_none()
    if not article:
        return []
    ids = deserialize_related_ids(article.related_article_ids)
    if ids:
        stmt = (
            select(KBArticle)
            .where(KBArticle.id.in_(ids))
            .where(KBArticle.organization_id == org.id)
            .where(KBArticle.status == "published")
            .where(KBArticle.internal_only.is_(False))
            .limit(limit)
        )
        return list((await db.execute(stmt)).scalars().all())
    if article.category_id:
        stmt = (
            select(KBArticle)
            .where(
                KBArticle.organization_id == org.id,
                KBArticle.category_id == article.category_id,
                KBArticle.status == "published",
                KBArticle.internal_only.is_(False),
                KBArticle.id != article.id,
            )
            .order_by(desc(KBArticle.view_count))
            .limit(limit)
        )
        return list((await db.execute(stmt)).scalars().all())
    return []


@public_router.get("/{org_slug}/search", response_model=list[KBArticleSearchHit])
async def public_search(
    org_slug: str,
    db: AsyncSession = Depends(get_db),
    q: str = Query(min_length=1, max_length=255),
    locale: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
) -> list[KBArticleSearchHit]:
    org = await _get_org_by_slug(db, org_slug)
    hits = await search_articles(
        db, organization_id=org.id, query=q, locale=locale, include_internal=False, limit=limit
    )
    return _hits_to_schema(hits)


@public_router.post(
    "/{org_slug}/articles/{article_id}/feedback",
    response_model=KBFeedbackOut,
    status_code=status.HTTP_201_CREATED,
)
async def public_submit_feedback(
    org_slug: str,
    article_id: uuid.UUID,
    payload: KBFeedbackCreate,
    db: AsyncSession = Depends(get_db),
) -> KBArticleFeedback:
    org = await _get_org_by_slug(db, org_slug)
    article = (
        await db.execute(
            select(KBArticle).where(KBArticle.id == article_id, KBArticle.organization_id == org.id)
        )
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    feedback = KBArticleFeedback(
        article_id=article.id,
        organization_id=org.id,
        helpful=payload.helpful,
        comment=payload.comment,
        contact_email=payload.contact_email,
        visitor_session_id=payload.visitor_session_id,
    )
    db.add(feedback)
    if payload.helpful:
        article.helpful_count = (article.helpful_count or 0) + 1
    else:
        article.not_helpful_count = (article.not_helpful_count or 0) + 1
    await db.commit()
    await db.refresh(feedback)
    return feedback


@public_router.post("/{org_slug}/articles/{article_id}/view", status_code=status.HTTP_202_ACCEPTED)
async def public_record_view(
    org_slug: str,
    article_id: uuid.UUID,
    payload: KBViewCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    org = await _get_org_by_slug(db, org_slug)
    article = (
        await db.execute(
            select(KBArticle).where(KBArticle.id == article_id, KBArticle.organization_id == org.id)
        )
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await record_view(
        db,
        article=article,
        organization_id=org.id,
        source=payload.source,
        visitor_session_id=payload.visitor_session_id,
        referrer=payload.referrer or request.headers.get("referer"),
    )
    await db.commit()
    return {"ok": True}


@public_router.get("/{org_slug}/sitemap.xml")
async def public_sitemap(org_slug: str, db: AsyncSession = Depends(get_db)) -> Response:
    org = await _get_org_by_slug(db, org_slug)
    rows = (
        await db.execute(
            select(KBArticle.slug, KBArticle.locale, KBArticle.updated_at)
            .where(KBArticle.organization_id == org.id)
            .where(KBArticle.status == "published")
            .where(KBArticle.internal_only.is_(False))
            .order_by(KBArticle.updated_at.desc())
        )
    ).all()
    base = f"/kb/{org_slug}"
    out = StringIO()
    out.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    out.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    out.write(f"  <url><loc>{base}</loc></url>\n")
    for slug, locale, updated in rows:
        loc = f"{base}/{slug}"
        if locale and locale != "en":
            loc += f"?locale={locale}"
        ts = updated.isoformat() if updated else ""
        out.write(f"  <url><loc>{loc}</loc><lastmod>{ts}</lastmod></url>\n")
    out.write("</urlset>\n")
    return Response(content=out.getvalue(), media_type="application/xml")


# ---------- Helpers ----------


async def _get_org_by_slug(db: AsyncSession, slug: str) -> Organization:
    org = (
        await db.execute(select(Organization).where(Organization.slug == slug))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


async def _get_article_for_org(
    db: AsyncSession, article_id: uuid.UUID, organization_id: uuid.UUID
) -> KBArticle:
    article = (
        await db.execute(
            select(KBArticle).where(
                KBArticle.id == article_id, KBArticle.organization_id == organization_id
            )
        )
    ).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


async def _get_category_for_org(
    db: AsyncSession, category_id: uuid.UUID, organization_id: uuid.UUID
) -> KBCategory:
    category = (
        await db.execute(
            select(KBCategory).where(
                KBCategory.id == category_id, KBCategory.organization_id == organization_id
            )
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def _hits_to_schema(hits: list[tuple[KBArticle, float, str | None]]) -> list[KBArticleSearchHit]:
    return [
        KBArticleSearchHit(
            id=art.id,
            title=art.title,
            slug=art.slug,
            summary=art.summary,
            snippet=snippet,
            category_id=art.category_id,
            locale=art.locale,
            score=score,
        )
        for art, score, snippet in hits
    ]
