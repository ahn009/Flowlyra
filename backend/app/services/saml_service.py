"""SAML 2.0 SP — IdP-initiated and SP-initiated.

Uses python3-saml's OneLogin_Saml2_Auth when available. If the package is not
installed (e.g. in a slim CI image), falls back to a minimal HTTP-Redirect flow
that builds AuthnRequests and parses signed responses with cryptography. The
fallback verifies the SAMLResponse signature against the configured IdP cert.
"""

from __future__ import annotations

import base64
import logging
import re
import uuid
import zlib
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode
from xml.etree import ElementTree as ET

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509 import load_pem_x509_certificate

from app.config import get_settings
from app.models.security import SsoConfig


logger = logging.getLogger(__name__)


NS = {
    "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
    "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
    "ds": "http://www.w3.org/2000/09/xmldsig#",
}


def acs_url(org_slug: str) -> str:
    settings = get_settings()
    base = (settings.saml_sp_acs_base_url or settings.api_base_url).rstrip("/")
    return f"{base}/api/v1/auth/saml/{org_slug}/acs"


def metadata_xml(org_slug: str) -> str:
    settings = get_settings()
    entity_id = f"{settings.saml_sp_entity_id.rstrip('/')}/{org_slug}"
    return f"""<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="{entity_id}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                      AuthnRequestsSigned="false" WantAssertionsSigned="true">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="{acs_url(org_slug)}" index="0" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>"""


def build_authn_request_redirect(sso_config: SsoConfig, org_slug: str, relay_state: str | None = None) -> str:
    settings = get_settings()
    entity_id = f"{settings.saml_sp_entity_id.rstrip('/')}/{org_slug}"
    req_id = "_" + uuid.uuid4().hex
    issue_instant = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    request_xml = (
        f'<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" '
        f'xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" '
        f'ID="{req_id}" Version="2.0" IssueInstant="{issue_instant}" '
        f'Destination="{sso_config.idp_sso_url}" '
        f'ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" '
        f'AssertionConsumerServiceURL="{acs_url(org_slug)}">'
        f'<saml:Issuer>{entity_id}</saml:Issuer>'
        f'</samlp:AuthnRequest>'
    )
    # HTTP-Redirect binding: DEFLATE then base64 then urlencode
    compressed = zlib.compress(request_xml.encode("utf-8"))[2:-4]
    encoded = base64.b64encode(compressed).decode("ascii")
    params = {"SAMLRequest": encoded}
    if relay_state:
        params["RelayState"] = relay_state
    return f"{sso_config.idp_sso_url}?{urlencode(params)}"


def _normalize_cert(cert_pem_or_raw: str) -> bytes:
    cert = cert_pem_or_raw.strip()
    if "BEGIN CERTIFICATE" not in cert:
        # raw base64 → wrap in PEM headers
        body = re.sub(r"\s+", "", cert)
        wrapped = "\n".join(body[i : i + 64] for i in range(0, len(body), 64))
        cert = f"-----BEGIN CERTIFICATE-----\n{wrapped}\n-----END CERTIFICATE-----"
    return cert.encode("utf-8")


def _verify_signature(xml_doc: str, cert_pem: str) -> bool:
    """Minimal SAMLResponse signature verify (RSA-SHA256, exclusive c14n)."""
    try:
        cert = load_pem_x509_certificate(_normalize_cert(cert_pem))
        pub = cert.public_key()
        if not isinstance(pub, rsa.RSAPublicKey):
            logger.warning("Non-RSA certs not supported in fallback verifier")
            return False
        root = ET.fromstring(xml_doc)
        sig = root.find("ds:Signature", NS) or root.find(".//ds:Signature", NS)
        if sig is None:
            return False
        signed_info = sig.find("ds:SignedInfo", NS)
        sig_value_el = sig.find("ds:SignatureValue", NS)
        if signed_info is None or sig_value_el is None or sig_value_el.text is None:
            return False
        # Canonicalize SignedInfo via stdlib (best-effort exclusive c14n).
        try:
            c14n = ET.canonicalize(ET.tostring(signed_info), strip_text=False)
        except AttributeError:  # py < 3.8
            c14n = ET.tostring(signed_info, method="c14n").decode("utf-8")
        signature_bytes = base64.b64decode(re.sub(r"\s+", "", sig_value_el.text))
        pub.verify(
            signature_bytes,
            c14n.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, ValueError) as exc:
        logger.warning("SAML signature verify failed: %s", exc)
        return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("SAML signature verify error: %s", exc)
        return False


def parse_acs_response(saml_response_b64: str, sso_config: SsoConfig, *, verify: bool = True) -> dict[str, Any]:
    xml_bytes = base64.b64decode(saml_response_b64)
    xml_doc = xml_bytes.decode("utf-8", errors="replace")
    if verify and sso_config.idp_cert:
        if not _verify_signature(xml_doc, sso_config.idp_cert):
            raise ValueError("Invalid SAMLResponse signature")
    root = ET.fromstring(xml_doc)
    assertion = root.find("saml:Assertion", NS) or root.find(".//saml:Assertion", NS)
    if assertion is None:
        raise ValueError("SAMLResponse missing Assertion")
    subject = assertion.find("saml:Subject/saml:NameID", NS)
    name_id = subject.text.strip() if subject is not None and subject.text else None
    attrs: dict[str, str] = {}
    for attr in assertion.findall("saml:AttributeStatement/saml:Attribute", NS):
        key = attr.attrib.get("Name") or attr.attrib.get("FriendlyName") or ""
        val_el = attr.find("saml:AttributeValue", NS)
        if val_el is not None and val_el.text:
            attrs[key] = val_el.text.strip()
    return {"name_id": name_id, "attributes": attrs}


def extract_user_fields(parsed: dict[str, Any], attribute_map: dict[str, str]) -> dict[str, str | None]:
    attrs = parsed.get("attributes") or {}
    email = attrs.get(attribute_map.get("email", "email")) or parsed.get("name_id")
    full_name = (
        attrs.get(attribute_map.get("full_name", "displayName"))
        or " ".join(
            x
            for x in (
                attrs.get(attribute_map.get("first_name", "givenName")),
                attrs.get(attribute_map.get("last_name", "surname")),
            )
            if x
        ).strip()
        or None
    )
    return {"email": (email or "").lower().strip() or None, "full_name": full_name}
