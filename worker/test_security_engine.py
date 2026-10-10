import base64
import hashlib
import hmac
import json
import unittest

from security_engine import TokenError, analyze_token, crack_hmac_token, generate_playbook, iter_candidates


def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")


def sign(payload, secret, algorithm="HS256", header=None):
    header_segment = encode(header or {"alg": algorithm, "typ": "JWT"})
    payload_segment = encode(payload)
    signing_input = f"{header_segment}.{payload_segment}"
    digest = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}[algorithm]
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), signing_input.encode(), digest).digest()).decode().rstrip("=")
    return f"{signing_input}.{signature}"


class SecurityEngineTests(unittest.TestCase):
    def test_regression_token_finds_bundled_secret(self):
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDExIiwianRpIjoiODg0ZWVmMzgtYWFlOC00N2UzLWE4YTMtYTE0Y2ZlNjI0YzUyIiwicGhvbmVfbnVtYmVyIjoiXHUwMDJCOTc0NjY0OTEzODU0NSIsIm5hbWUiOiJBbWVlciBUZXN0aW5nIiwicm9sZSI6ImN1c3RvbWVyIiwibmJmIjoxNzkxMzI1NzU0LCJleHAiOjE3OTEzNTQ1NTQsImlzcyI6ImJhbGF0YXQtaW50ZXJuYWwiLCJhdWQiOiJiYWxhdGF0LXdlYiJ9.2KXfZGiOUqV9zuEJ1YTcE3kotahVBp8aLWt_e0moRds"
        with open("../backend/jwt/common_secrets.txt", "rb") as wordlist:
            secret, tested = crack_hmac_token(token, iter_candidates(wordlist.read()))
        self.assertEqual(secret, "your-256-bit-secret")
        self.assertEqual(tested, 87)

    def test_all_supported_hmac_algorithms(self):
        for algorithm in ("HS256", "HS384", "HS512"):
            with self.subTest(algorithm=algorithm):
                token = sign({"sub": "1"}, "correct", algorithm)
                self.assertEqual(crack_hmac_token(token, iter_candidates("wrong\ncorrect\n")), ("correct", 2))

    def test_returns_none_when_secret_is_absent(self):
        token = sign({"sub": "1"}, "missing")
        self.assertEqual(crack_hmac_token(token, iter_candidates("one\ntwo\n")), (None, 2))

    def test_rejects_non_hmac_and_malformed_tokens(self):
        token = f"{encode({'alg': 'RS256'})}.{encode({'sub': '1'})}.signature"
        with self.assertRaisesRegex(TokenError, "supports HS256"):
            crack_hmac_token(token, iter_candidates("secret"))
        with self.assertRaisesRegex(TokenError, "three segments"):
            analyze_token("not-a-jwt")

    def test_analysis_detects_security_issues(self):
        token = f"{encode({'alg': 'none', 'jku': 'https://evil.example/jwks'})}.{encode({'password': 'visible'})}."
        result = analyze_token(token, now=100)
        identifiers = {finding["id"] for finding in result["findings"]}
        self.assertTrue({"alg-none", "missing-signature", "remote-jku", "missing-exp", "sensitive-claims"}.issubset(identifiers))

    def test_playbook_is_bounded_and_does_not_change_original(self):
        token = sign({"sub": "1", "exp": 999, "aud": "app", "iss": "issuer"}, "secret")
        result = generate_playbook(token)
        self.assertLessEqual(result["mutation_count"], 10)
        self.assertEqual(token, sign({"sub": "1", "exp": 999, "aud": "app", "iss": "issuer"}, "secret"))
        self.assertIn("alg-none", {item["id"] for item in result["mutations"]})


if __name__ == "__main__":
    unittest.main()
