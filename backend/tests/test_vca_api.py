"""VCA backend API test suite (pytest).

Covers: health, auth, catalog, dashboard, collection CRUD, certify+verify,
Slabook feed/post/like/comment, submissions, and AI scanner.
"""
import base64
import io
import os
import uuid
import urllib.request

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://3f9eee2f-d13e-4970-9d8d-48f47593a6e1.preview.emergentagent.com").rstrip("/")
TOKEN = "testtoken_abc123"
AUTH = {"Authorization": f"Bearer {TOKEN}"}
POKE_IMG = "https://images.pokemontcg.io/base1/4_hires.png"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def card_image_b64():
    req = urllib.request.Request(POKE_IMG, headers={"User-Agent": "Mozilla/5.0 VCA-test"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    # Downscale via PIL to keep payload small and force JPEG
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((512, 720))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=85)
        data = buf.getvalue()
    except Exception:
        pass
    return base64.b64encode(data).decode()


# --------- Health -----------------------------------------------------------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert isinstance(j["cards"], int) and j["cards"] > 0


# --------- Auth -------------------------------------------------------------
class TestAuth:
    def test_me_ok(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=AUTH, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == "tester@vca.example"
        assert u["user_id"] == "user_testseed001"
        assert u["role"] == "admin"

    def test_me_missing(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer nope"}, timeout=15)
        assert r.status_code == 401


# --------- Catalog ----------------------------------------------------------
class TestCatalog:
    def test_list(self, api):
        r = api.get(f"{BASE_URL}/api/cards", timeout=15)
        assert r.status_code == 200
        cards = r.json()
        assert len(cards) >= 10
        c = cards[0]
        for k in ("id", "name", "image", "grade_values", "raw_value"):
            assert k in c

    def test_top(self, api):
        r = api.get(f"{BASE_URL}/api/cards/top", params={"grade": "vca10", "limit": 5}, timeout=15)
        assert r.status_code == 200
        top = r.json()
        assert 1 <= len(top) <= 5
        vals = [c["grade_values"]["vca10"] for c in top]
        assert vals == sorted(vals, reverse=True)

    def test_top_category(self, api):
        r = api.get(f"{BASE_URL}/api/cards/top", params={"category": "Pokemon", "grade": "vca10"}, timeout=15)
        assert r.status_code == 200
        assert all(c["category"] == "Pokemon" for c in r.json())

    def test_detail(self, api):
        cards = api.get(f"{BASE_URL}/api/cards", timeout=15).json()
        cid = cards[0]["id"]
        r = api.get(f"{BASE_URL}/api/cards/{cid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == cid

    def test_detail_404(self, api):
        r = api.get(f"{BASE_URL}/api/cards/does-not-exist", timeout=15)
        assert r.status_code == 404


# --------- Dashboard --------------------------------------------------------
def test_dashboard_stats(api):
    r = api.get(f"{BASE_URL}/api/dashboard/stats", headers=AUTH, timeout=15)
    assert r.status_code == 200
    j = r.json()
    for k in ("total_value", "grade_breakdown", "top_card", "value_history", "total_cards"):
        assert k in j
    assert isinstance(j["value_history"], list) and len(j["value_history"]) == 7
    assert isinstance(j["grade_breakdown"], dict)


# --------- Collection + certify + verify (stateful class) -------------------
class TestCollectionFlow:
    created_id = None
    cert_number = None

    def test_get_seed_collection(self, api):
        r = api.get(f"{BASE_URL}/api/collection", headers=AUTH, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1

    def test_add_item(self, api):
        payload = {
            "name": f"TEST_Card_{uuid.uuid4().hex[:6]}",
            "set": "Base Set",
            "number": "999/999",
            "category": "Pokemon",
            "rarity": "Rare",
            "grade": "Raw",
            "purchase_price": 100.0,
            "current_value": 150.0,
            "notes": "TEST item",
        }
        r = api.post(f"{BASE_URL}/api/collection", headers=AUTH, json=payload, timeout=15)
        assert r.status_code == 200
        item = r.json()
        assert item["name"] == payload["name"]
        assert item["current_value"] == 150.0
        assert "id" in item
        TestCollectionFlow.created_id = item["id"]

        got = api.get(f"{BASE_URL}/api/collection", headers=AUTH, timeout=15).json()
        assert any(i["id"] == item["id"] for i in got), "Newly added item not present in GET /collection"

    def test_update_item(self, api):
        cid = TestCollectionFlow.created_id
        assert cid, "prior test failed"
        payload = {
            "name": f"TEST_Card_updated_{uuid.uuid4().hex[:4]}",
            "set": "Base Set",
            "number": "999/999",
            "category": "Pokemon",
            "grade": "Raw",
            "purchase_price": 100.0,
            "current_value": 175.5,
        }
        r = api.put(f"{BASE_URL}/api/collection/{cid}", headers=AUTH, json=payload, timeout=15)
        assert r.status_code == 200
        assert r.json()["current_value"] == 175.5

    def test_certify_item(self, api):
        cid = TestCollectionFlow.created_id
        assert cid
        r = api.post(f"{BASE_URL}/api/collection/{cid}/certify", headers=AUTH, timeout=20)
        assert r.status_code == 200
        cert = r.json()
        for k in ("cert_number", "slab_id", "nfc_id", "grade", "subgrades", "history"):
            assert k in cert
        assert cert["cert_number"].startswith("VCA")
        assert cert["slab_id"].startswith("SLB-")
        assert cert["nfc_id"].startswith("NFC-")
        TestCollectionFlow.cert_number = cert["cert_number"]

        items = api.get(f"{BASE_URL}/api/collection", headers=AUTH, timeout=15).json()
        this = next(i for i in items if i["id"] == cid)
        assert this["cert_number"] == cert["cert_number"]

    def test_verify_success(self, api):
        cn = TestCollectionFlow.cert_number
        assert cn
        r = api.get(f"{BASE_URL}/api/verify/{cn}", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["found"] is True
        assert j["certification"]["cert_number"] == cn

    def test_verify_bogus(self, api):
        r = api.get(f"{BASE_URL}/api/verify/VCA00000000", timeout=15)
        assert r.status_code == 200
        assert r.json()["found"] is False

    def test_list_certifications(self, api):
        r = api.get(f"{BASE_URL}/api/certifications", headers=AUTH, timeout=15)
        assert r.status_code == 200
        certs = r.json()
        assert any(c["cert_number"] == TestCollectionFlow.cert_number for c in certs)

    def test_delete_item(self, api):
        cid = TestCollectionFlow.created_id
        r = api.delete(f"{BASE_URL}/api/collection/{cid}", headers=AUTH, timeout=15)
        assert r.status_code == 200 and r.json().get("ok") is True
        items = api.get(f"{BASE_URL}/api/collection", headers=AUTH, timeout=15).json()
        assert not any(i["id"] == cid for i in items), "Soft-deleted item still visible in GET /collection"


# --------- Slabook ----------------------------------------------------------
class TestSlabook:
    post_id = None

    def test_feed_seed(self, api):
        r = api.get(f"{BASE_URL}/api/feed", timeout=15)
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 3
        p = posts[0]
        for k in ("id", "author", "like_count", "comment_count", "liked_by_me"):
            assert k in p

    def test_create_post(self, api):
        body = {"text": "TEST post from pytest", "image": None}
        r = api.post(f"{BASE_URL}/api/posts", headers=AUTH, json=body, timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["text"] == body["text"]
        assert p["like_count"] == 0
        TestSlabook.post_id = p["id"]

    def test_like_toggle(self, api):
        pid = TestSlabook.post_id
        r1 = api.post(f"{BASE_URL}/api/posts/{pid}/like", headers=AUTH, timeout=15).json()
        assert r1["liked"] is True and r1["like_count"] == 1
        r2 = api.post(f"{BASE_URL}/api/posts/{pid}/like", headers=AUTH, timeout=15).json()
        assert r2["liked"] is False and r2["like_count"] == 0

    def test_comment(self, api):
        pid = TestSlabook.post_id
        r = api.post(f"{BASE_URL}/api/posts/{pid}/comments", headers=AUTH,
                     json={"text": "TEST comment"}, timeout=15)
        assert r.status_code == 200
        c = r.json()
        assert c["text"] == "TEST comment"

        feed = api.get(f"{BASE_URL}/api/feed", headers=AUTH, timeout=15).json()
        me_post = next(p for p in feed if p["id"] == pid)
        assert me_post["comment_count"] == 1


# --------- Submissions ------------------------------------------------------
class TestSubmissions:
    def test_pricing_tiers(self, api):
        r = api.get(f"{BASE_URL}/api/pricing/tiers", timeout=15)
        assert r.status_code == 200
        tiers = r.json()
        names = {t["name"] for t in tiers}
        assert {"VCA Standard", "VCA Express", "VCA Premium"}.issubset(names)

    def test_shipping(self, api):
        r = api.get(f"{BASE_URL}/api/settings/shipping", timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert "submission_address" in s and "Edmonton" in s["submission_address"]

    def test_create_and_list_submission(self, api):
        payload = {
            "tier": "VCA Express",
            "cards": [{"name": "TEST Charizard"}, {"name": "TEST Blastoise"}],
            "contact_name": "Trent Test",
            "contact_email": "tester@vca.example",
            "address": "123 TEST st",
        }
        r = api.post(f"{BASE_URL}/api/submissions", headers=AUTH, json=payload, timeout=15)
        assert r.status_code == 200
        sub = r.json()
        assert sub["tier"] == "VCA Express"
        assert sub["total"] == 60 * 2
        assert sub["id"].startswith("SUB-")
        assert sub["status"] == "SUBMISSION CREATED"

        listed = api.get(f"{BASE_URL}/api/submissions", headers=AUTH, timeout=15).json()
        assert any(s["id"] == sub["id"] for s in listed)


# --------- AI Scanner -------------------------------------------------------
def test_scan_real_card(api, card_image_b64):
    payload = {"image_base64": card_image_b64}
    r = api.post(f"{BASE_URL}/api/scan", headers=AUTH, json=payload, timeout=90)
    assert r.status_code == 200, f"scan failed: {r.status_code} {r.text[:400]}"
    j = r.json()
    for k in ("identification", "confidence", "authenticity_status", "condition",
              "grade_values", "market"):
        assert k in j, f"missing key {k}"
    assert isinstance(j["confidence"], int)
    assert 0 <= j["confidence"] <= 100
    ident = j["identification"]
    for k in ("name", "set", "number", "category", "rarity", "language"):
        assert k in ident
    for k in ("raw", "vca10", "vca9", "vca8", "psa10", "psa9"):
        assert k in j["grade_values"]
    for k in ("low", "mid", "high", "updated_at", "sources"):
        assert k in j["market"]
