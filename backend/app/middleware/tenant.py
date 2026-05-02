import uuid

from fastapi import HTTPException, status
from sqlalchemy import Select


def tenant_filter(statement: Select[tuple], model: object, organization_id: uuid.UUID) -> Select[tuple]:
    return statement.where(getattr(model, "organization_id") == organization_id)


def assert_same_org(resource_org_id: uuid.UUID, organization_id: uuid.UUID) -> None:
    if resource_org_id != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
