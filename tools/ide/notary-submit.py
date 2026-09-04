#!/usr/bin/env python3
"""
notary-submit.py — submit an artifact to Apple's notary service WITHOUT
`xcrun notarytool`, by driving the Notary REST API directly (ADR-279 D2/D3).

Owner context: tools/ide — release tooling.

Public interface:
    notary-submit.py <artifact> --key <AuthKey.p8> --key-id <KEY_ID> --issuer <ISSUER_UUID>
                     [--wait] [--poll-seconds N] [--timeout-minutes N]
    notary-submit.py --status <submission-id> --key … --key-id … --issuer …

Prints the submission id on stdout as `id: <uuid>` (same shape notarytool
prints, so ledger-writing callers can reuse their `sed`), then, with --wait,
the final status line `status: Accepted|Invalid|Rejected`. Exit 0 on an
Accepted (or, without --wait, a completed upload); 1 on Invalid/Rejected; 2 on
any transport or API failure. The per-file log Apple produces for a failed
submission is printed on Invalid/Rejected.

WHY THIS EXISTS. `notarytool submit` mints the submission id BEFORE its S3
multipart upload runs, and on this machine that upload crashes the tool
(SIGBUS on SwiftNIO's transport thread, notarytool 1.1.1 / Xcode 26.4 —
17 consecutive crashes on 2026-09-04, from a TTY too). Each crash strands an
"In Progress" submission that never resolves; five release sessions since
2026-08-10 diagnosed that as Apple being slow. It was not. The REST API is
the same thing notarytool wraps — one authenticated POST that returns
temporary S3 credentials, one S3 upload, one GET for the verdict — and the
`aws` CLI's uploader does not share the crash.

Dependencies, all already on the release machine: python3 (stdlib only),
`openssl` (ES256 signing of the JWT — no pyjwt/cryptography needed), `aws`
(the S3 upload; the API hands back a bucket, key, and session credentials).

Invariants:
  - Never prints the private key, the JWT, or the temporary AWS credentials.
  - The sha256 sent to Apple is computed from the exact bytes uploaded.
  - A submission id is only printed AFTER the upload completes, so a caller
    that records the id has recorded a live submission, never an orphan.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

API = "https://appstoreconnect.apple.com/notary/v2"
AUDIENCE = "appstoreconnect-v1"
JWT_TTL_SECONDS = 15 * 60  # Apple allows up to 20 minutes.


def die(message: str, code: int = 2) -> None:
    print(f"error: {message}", file=sys.stderr)
    sys.exit(code)


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def der_ecdsa_to_raw(der: bytes, size: int = 32) -> bytes:
    """Convert an ASN.1 DER ECDSA signature (SEQUENCE of two INTEGERs) to the
    fixed-width r||s form JWS requires. openssl emits DER; JWT wants raw."""
    if der[0] != 0x30:
        raise ValueError("not a DER SEQUENCE")
    idx = 2 if der[1] < 0x80 else 2 + (der[1] & 0x7F)
    out = b""
    for _ in range(2):
        if der[idx] != 0x02:
            raise ValueError("expected DER INTEGER")
        length = der[idx + 1]
        value = der[idx + 2 : idx + 2 + length]
        idx += 2 + length
        value = value.lstrip(b"\x00").rjust(size, b"\x00")
        out += value
    return out


def make_jwt(key_path: str, key_id: str, issuer: str) -> str:
    """ES256 JWT for the App Store Connect API, signed with openssl."""
    now = int(time.time())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    payload = {"iss": issuer, "iat": now, "exp": now + JWT_TTL_SECONDS, "aud": AUDIENCE}
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + b64url(json.dumps(payload, separators=(",", ":")).encode())
    ).encode("ascii")
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(signing_input)
        tmp_path = tmp.name
    try:
        der = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_path, tmp_path],
            check=True,
            capture_output=True,
        ).stdout
    finally:
        os.unlink(tmp_path)
    return signing_input.decode("ascii") + "." + b64url(der_ecdsa_to_raw(der))


def api(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:600]
        die(f"{method} {path} → HTTP {error.code}: {detail}")
    except urllib.error.URLError as error:
        die(f"{method} {path} failed: {error.reason}")
    return {}  # unreachable; keeps the type checker honest


def sha256_of(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upload(path: str, attrs: dict) -> None:
    """Upload with the aws CLI using the one-time credentials Apple returned.
    The credentials live only in this subprocess's environment."""
    env = dict(os.environ)
    env.update(
        AWS_ACCESS_KEY_ID=attrs["awsAccessKeyId"],
        AWS_SECRET_ACCESS_KEY=attrs["awsSecretAccessKey"],
        AWS_SESSION_TOKEN=attrs["awsSessionToken"],
        AWS_DEFAULT_REGION="us-west-2",
    )
    # A profile in ~/.aws must not shadow the session credentials.
    env.pop("AWS_PROFILE", None)
    # ONE PutObject, never a multipart upload. The aws CLI switches to
    # multipart above 8 MB by default. On 2026-09-04 a DMG uploaded that way
    # (id 10dfea30) sat "In Progress" at Apple past 15 minutes, and the same
    # DMG re-uploaded as a single PUT (id f6d74f50) was Accepted in about a
    # minute — though a 65 MB app zip had gone through multipart and been
    # accepted an hour earlier, so multipart is a suspect, not a proven cause.
    # A single PUT is the simplest thing that is known to work; S3's ceiling
    # for it is 5 GB, far above any app or DMG. The threshold is set through
    # a private config file so the user's ~/.aws/config is neither read nor
    # touched.
    with tempfile.NamedTemporaryFile("w", suffix=".ini", delete=False) as cfg:
        cfg.write("[default]\ns3 =\n    multipart_threshold = 5GB\n")
        cfg_path = cfg.name
    env["AWS_CONFIG_FILE"] = cfg_path
    try:
        result = subprocess.run(
            ["aws", "s3", "cp", "--only-show-errors", path, f"s3://{attrs['bucket']}/{attrs['object']}"],
            env=env,
        )
    finally:
        os.unlink(cfg_path)
    if result.returncode != 0:
        die(f"aws s3 cp exited {result.returncode} — the upload did not complete; the submission is dead, submit again.")


def status_of(submission_id: str, token: str) -> str:
    return api("GET", f"/submissions/{submission_id}", token)["data"]["attributes"]["status"]


def print_logs(submission_id: str, token: str) -> None:
    try:
        logs = api("GET", f"/submissions/{submission_id}/logs", token)
        url = logs["data"]["attributes"]["developerLogUrl"]
        with urllib.request.urlopen(url, timeout=60) as response:
            print(response.read().decode(errors="replace"), file=sys.stderr)
    except SystemExit:
        raise
    except Exception as error:  # noqa: BLE001 — the log is a courtesy, never the verdict
        print(f"(could not fetch Apple's log: {error})", file=sys.stderr)


def wait_for(submission_id: str, key: str, key_id: str, issuer: str, poll: int, timeout_minutes: int) -> int:
    deadline = time.time() + timeout_minutes * 60
    token = make_jwt(key, key_id, issuer)
    token_born = time.time()
    while True:
        if time.time() - token_born > JWT_TTL_SECONDS - 60:
            token = make_jwt(key, key_id, issuer)
            token_born = time.time()
        status = status_of(submission_id, token)
        if status == "Accepted":
            print(f"status: {status}")
            return 0
        if status in ("Invalid", "Rejected"):
            print(f"status: {status}")
            print_logs(submission_id, token)
            return 1
        if time.time() > deadline:
            print(f"status: {status} (still, after {timeout_minutes} min — with a completed upload this is abnormal)")
            return 2
        time.sleep(poll)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("artifact", nargs="?", help="zip, dmg or pkg to notarize")
    parser.add_argument("--status", metavar="SUBMISSION_ID", help="only report the status of an existing submission")
    parser.add_argument("--key", required=True, help="path to the App Store Connect API AuthKey_*.p8")
    parser.add_argument("--key-id", required=True)
    parser.add_argument("--issuer", required=True)
    parser.add_argument("--wait", action="store_true", help="poll until Accepted/Invalid/Rejected")
    parser.add_argument("--poll-seconds", type=int, default=15)
    parser.add_argument("--timeout-minutes", type=int, default=30)
    args = parser.parse_args()

    if not os.path.isfile(args.key):
        die(f"key not found: {args.key}")

    if args.status:
        return wait_for(args.status, args.key, args.key_id, args.issuer, args.poll_seconds, args.timeout_minutes) if args.wait \
            else (print(f"status: {status_of(args.status, make_jwt(args.key, args.key_id, args.issuer))}") or 0)

    if not args.artifact or not os.path.isfile(args.artifact):
        die("artifact path required (or --status <id>)")

    token = make_jwt(args.key, args.key_id, args.issuer)
    created = api(
        "POST",
        "/submissions",
        token,
        {"submissionName": os.path.basename(args.artifact), "sha256": sha256_of(args.artifact)},
    )
    submission_id = created["data"]["id"]
    upload(args.artifact, created["data"]["attributes"])
    print("Successfully uploaded file")
    print(f"  id: {submission_id}")
    if not args.wait:
        return 0
    return wait_for(submission_id, args.key, args.key_id, args.issuer, args.poll_seconds, args.timeout_minutes)


if __name__ == "__main__":
    sys.exit(main())
