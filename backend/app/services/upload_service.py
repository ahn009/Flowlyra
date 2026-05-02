import uuid

import boto3
from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

ALLOWED_MIME = {"image/png", "image/jpeg", "image/gif", "application/pdf", "text/plain"}
MAX_SIZE = 10 * 1024 * 1024


async def upload_file(file: UploadFile, organization_id: uuid.UUID) -> dict:
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 10MB")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")
    settings = get_settings()
    key = f"{organization_id}/{uuid.uuid4()}-{file.filename}"
    if not settings.aws_access_key_id:
        return {"file_url": f"https://example.invalid/uploads/{key}", "file_name": file.filename, "file_size": len(data), "file_mime": file.content_type}
    client = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    client.put_object(Bucket=settings.aws_s3_bucket, Key=key, Body=data, ContentType=file.content_type)
    url = client.generate_presigned_url("get_object", Params={"Bucket": settings.aws_s3_bucket, "Key": key}, ExpiresIn=3600)
    return {"file_url": url, "file_name": file.filename, "file_size": len(data), "file_mime": file.content_type}
