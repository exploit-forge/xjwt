import base64
import hashlib
import hmac
import json
import math
import time
from collections import Counter


HASH_ALGORITHMS = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}
MAX_TOKEN_BYTES = 32_768
MAX_CANDIDATES = 1_000_000


class TokenError(ValueError):
    pass


def _decode_segment(segment):
    try:
        return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
    except Exception as exc:
        raise TokenError("JWT contains invalid Base64url data") from exc


def parse_token(token):
    if not isinstance(token, str) or not token.strip():
        raise TokenError("JWT is required")
    if len(token.encode("utf-8")) > MAX_TOKEN_BYTES:
        raise TokenError("JWT exceeds the 32 KB limit")
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise TokenError("JWT must contain exactly three segments")
    try:
        header = json.loads(_decode_segment(parts[0]))
        payload = json.loads(_decode_segment(parts[1]))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise TokenError("JWT header or payload is not valid JSON") from exc
    if not isinstance(header, dict) or not isinstance(payload, dict):
        raise TokenError("JWT header and payload must be JSON objects")
    return header, payload, parts


def iter_candidates(content):
    lines = content.splitlines()
    for index, line in enumerate(lines):
        if index >= MAX_CANDIDATES:
            raise ValueError(f"Wordlist exceeds the {MAX_CANDIDATES:,} entry limit")
        candidate = line if isinstance(line, bytes) else line.encode("utf-8")
        yield candidate.rstrip(b"\r\n")


def crack_hmac_token(token, candidates):
    header, _, parts = parse_token(token)
    digest = HASH_ALGORITHMS.get(header.get("alg"))
    if digest is None:
        raise TokenError("Dictionary cracking supports HS256, HS384, and HS512 only")
    if not parts[2]:
        raise TokenError("JWT has no signature")
    signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
    expected = _decode_segment(parts[2])
    tested = 0
    for candidate in candidates:
        tested += 1
        if hmac.compare_digest(hmac.new(candidate, signing_input, digest).digest(), expected):
            return candidate.decode("utf-8", errors="replace"), tested
    return None, tested


def _finding(identifier, severity, title, detail, remediation):
    return {"id": identifier, "severity": severity, "title": title, "detail": detail, "remediation": remediation}


def _shannon_entropy(value):
    if not value:
        return 0.0
    counts = Counter(value)
    return -sum((count / len(value)) * math.log2(count / len(value)) for count in counts.values())


def analyze_token(token, now=None):
    header, payload, parts = parse_token(token)
    now = int(time.time() if now is None else now)
    findings = []
    algorithm = header.get("alg")
    if not algorithm or str(algorithm).lower() == "none":
        findings.append(_finding("alg-none", "critical", "Unsigned token algorithm", "The token declares no signing algorithm.", "Reject alg=none and allowlist one expected algorithm."))
    elif algorithm not in HASH_ALGORITHMS and not str(algorithm).startswith(("RS", "PS", "ES", "Ed")):
        findings.append(_finding("unknown-alg", "high", "Unexpected signing algorithm", f"The token declares {algorithm!r}.", "Allowlist the exact algorithm expected by the application."))
    elif algorithm in HASH_ALGORITHMS:
        findings.append(_finding("shared-secret", "info", "HMAC shared-secret token", f"{algorithm} uses the same secret to sign and verify tokens.", "Use a high-entropy secret and rotate it regularly; consider asymmetric signing across multiple services."))
    if not parts[2]:
        findings.append(_finding("missing-signature", "critical", "Missing signature", "The JWT signature segment is empty.", "Reject unsigned tokens before processing claims."))
    for key in ("jku", "x5u"):
        if key in header:
            findings.append(_finding(f"remote-{key}", "high", f"Remote {key} key reference", f"The header can direct verifiers to {header[key]!r}.", "Ignore untrusted key URLs or enforce a strict host allowlist."))
    if "jwk" in header:
        findings.append(_finding("embedded-jwk", "high", "Embedded verification key", "The header contains an inline JWK.", "Do not trust verification keys supplied by the token itself."))
    if "kid" in header and any(marker in str(header["kid"]) for marker in ("../", "..\\", "file:", "http:", "https:", "|", ";")):
        findings.append(_finding("unsafe-kid", "high", "Potentially unsafe key identifier", "The kid value contains path, URL, or shell metacharacters.", "Treat kid as an opaque allowlisted identifier, never as a path or command fragment."))
    if "exp" not in payload:
        findings.append(_finding("missing-exp", "medium", "No expiration claim", "The payload has no exp claim.", "Issue short-lived tokens and enforce expiration."))
    elif isinstance(payload["exp"], (int, float)):
        if payload["exp"] < now:
            findings.append(_finding("expired", "medium", "Token is expired", "The exp timestamp is in the past.", "Reject the token or obtain a newly issued token."))
        elif payload["exp"] - now > 86_400 * 30:
            findings.append(_finding("long-exp", "low", "Long token lifetime", "The token remains valid for more than 30 days.", "Prefer short-lived access tokens with controlled refresh."))
    else:
        findings.append(_finding("invalid-exp", "medium", "Non-numeric expiration", "The exp claim is not a NumericDate.", "Encode exp as an integer Unix timestamp and validate its type."))
    if isinstance(payload.get("nbf"), (int, float)) and payload["nbf"] > now + 300:
        findings.append(_finding("not-yet-valid", "medium", "Token is not yet valid", "The nbf timestamp is in the future.", "Reject the token until nbf, allowing only a small clock-skew window."))
    if "aud" not in payload:
        findings.append(_finding("missing-aud", "low", "No audience restriction", "The payload has no aud claim.", "Bind tokens to intended recipients and validate aud."))
    if "iss" not in payload:
        findings.append(_finding("missing-iss", "low", "No issuer claim", "The payload has no iss claim.", "Include and strictly validate the expected issuer."))
    markers = ("password", "secret", "token", "card", "ssn", "private_key")
    exposed = [key for key in payload if any(marker in key.lower() for marker in markers)]
    if exposed:
        findings.append(_finding("sensitive-claims", "medium", "Potentially sensitive payload data", f"JWT payloads are readable by clients; review: {', '.join(exposed)}.", "Store sensitive data server-side and keep only non-sensitive identifiers in JWTs."))
    if parts[2] and _shannon_entropy(parts[2]) < 3.0:
        findings.append(_finding("low-signature-entropy", "high", "Unusual signature entropy", "The signature has unexpectedly low character diversity.", "Verify the token is signed with the declared algorithm and a strong key."))
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings.sort(key=lambda item: order[item["severity"]])
    return {"header": header, "payload": payload, "findings": findings, "finding_count": len(findings)}


def generate_playbook(token):
    header, payload, parts = parse_token(token)
    mutations = []
    def add(identifier, title, changed_header, changed_payload, signature):
        enc = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")
        mutations.append({"id": identifier, "title": title, "token": f"{enc(changed_header)}.{enc(changed_payload)}.{signature}"})
    add("alg-none", "Unsigned alg=none probe", {**header, "alg": "none"}, payload, "")
    add("empty-signature", "Original claims with an empty signature", header, payload, "")
    if "exp" in payload:
        add("expired-claim", "Expired-token validation probe", header, {**payload, "exp": 1}, parts[2])
    if "nbf" in payload:
        add("future-nbf", "Future not-before validation probe", header, {**payload, "nbf": 4_102_444_800}, parts[2])
    if "aud" in payload:
        add("audience-change", "Audience validation probe", header, {**payload, "aud": "xjwt-invalid-audience"}, parts[2])
    if "iss" in payload:
        add("issuer-change", "Issuer validation probe", header, {**payload, "iss": "https://xjwt.invalid"}, parts[2])
    return {"analysis": analyze_token(token), "mutations": mutations[:10], "mutation_count": min(len(mutations), 10)}
