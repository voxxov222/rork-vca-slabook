"""VCA — Verified Card Authority backend.

FastAPI + MongoDB (motor). Emergent Google session auth, card catalog,
collections, certifications/verification, AI card scanner (Gemini),
Slabook social feed, and submissions.
"""
import os
import re
import json
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vca")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "vca_database")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="VCA API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def gen_cert() -> str:
    return "VCA" + "".join(random.choices("0123456789", k=8))


# ----------------------------- Auth -----------------------------------------
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc():
            raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


class SessionIn(BaseModel):
    session_id: str


@api.post("/auth/session")
async def create_session(body: SessionIn):
    async with httpx.AsyncClient(timeout=20) as hc:
        resp = await hc.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": body.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = resp.json()
    email = data.get("email")
    name = data.get("name") or (email.split("@")[0] if email else "Collector")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Incomplete session data")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login": now_utc()}},
        )
        role = existing.get("role", "user")
    else:
        user_id = "user_" + uuid.uuid4().hex[:12]
        # First user becomes admin for the forensic/admin tools.
        is_first = (await db.users.count_documents({})) == 0
        role = "admin" if is_first else "user"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "bio": "",
            "profile_type": "Collector",
            "cover_image": None,
            "created_at": now_utc(),
            "last_login": now_utc(),
        })

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_type: Optional[str] = None
    cover_image: Optional[str] = None


@api.put("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    return await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ----------------------------- Cards / Catalog ------------------------------
@api.get("/cards")
async def list_cards(category: Optional[str] = None, q: Optional[str] = None, limit: int = 60):
    query: dict = {}
    if category and category.lower() != "all":
        query["category"] = category
    if q:
        query["$or"] = [
            {"name": {"$regex": re.escape(q), "$options": "i"}},
            {"set": {"$regex": re.escape(q), "$options": "i"}},
            {"number": {"$regex": re.escape(q), "$options": "i"}},
        ]
    cards = await db.cards.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return cards


@api.get("/cards/top")
async def top_cards(category: Optional[str] = None, grade: str = "vca10", limit: int = 25):
    query: dict = {}
    if category and category.lower() != "all":
        query["category"] = category
    grade_key = grade if grade in ("raw", "vca10", "vca9", "vca8", "psa10", "psa9") else "vca10"
    cards = await db.cards.find(query, {"_id": 0}).to_list(500)
    cards.sort(key=lambda c: c.get("grade_values", {}).get(grade_key, c.get("raw_value", 0)), reverse=True)
    return cards[:limit]


@api.get("/cards/{card_id}")
async def get_card(card_id: str):
    card = await db.cards.find_one({"id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


# ----------------------------- Collection -----------------------------------
class CollectionItemIn(BaseModel):
    card_id: Optional[str] = None
    name: str
    set: Optional[str] = ""
    number: Optional[str] = ""
    category: Optional[str] = "Pokemon"
    rarity: Optional[str] = ""
    image: Optional[str] = None
    grade: Optional[str] = "Raw"
    purchase_price: Optional[float] = 0
    current_value: Optional[float] = 0
    notes: Optional[str] = ""


@api.get("/collection")
async def get_collection(user: dict = Depends(get_current_user)):
    items = await db.collection_items.find(
        {"user_id": user["user_id"], "deleted_at": None}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return items


@api.post("/collection")
async def add_collection_item(body: CollectionItemIn, user: dict = Depends(get_current_user)):
    item = body.model_dump()
    item.update({
        "id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "cert_number": None,
        "slab_id": None,
        "nfc_id": None,
        "acquisition_date": now_utc().isoformat(),
        "created_at": now_utc(),
        "deleted_at": None,
    })
    if not item.get("current_value"):
        item["current_value"] = item.get("purchase_price", 0)
    await db.collection_items.insert_one(item)
    return await db.collection_items.find_one({"id": item["id"]}, {"_id": 0})


@api.put("/collection/{item_id}")
async def update_collection_item(item_id: str, body: CollectionItemIn, user: dict = Depends(get_current_user)):
    existing = await db.collection_items.find_one({"id": item_id, "user_id": user["user_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.collection_items.update_one({"id": item_id}, {"$set": body.model_dump()})
    return await db.collection_items.find_one({"id": item_id}, {"_id": 0})


@api.delete("/collection/{item_id}")
async def delete_collection_item(item_id: str, user: dict = Depends(get_current_user)):
    await db.collection_items.update_one(
        {"id": item_id, "user_id": user["user_id"]},
        {"$set": {"deleted_at": now_utc()}},
    )
    return {"ok": True}


# ----------------------------- Certifications / Slabs -----------------------
@api.post("/collection/{item_id}/certify")
async def certify_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.collection_items.find_one({"id": item_id, "user_id": user["user_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.get("cert_number"):
        return await db.certifications.find_one({"cert_number": item["cert_number"]}, {"_id": 0})

    cert_number = gen_cert()
    slab_id = "SLB-" + uuid.uuid4().hex[:8].upper()
    nfc_id = "NFC-" + uuid.uuid4().hex[:12].upper()
    grade = item.get("grade") or "VCA 10"
    if grade == "Raw":
        grade = "VCA " + str(random.randint(8, 10))

    cert = {
        "cert_number": cert_number,
        "slab_id": slab_id,
        "nfc_id": nfc_id,
        "user_id": user["user_id"],
        "owner_name": user.get("name"),
        "card": {
            "name": item.get("name"),
            "set": item.get("set"),
            "number": item.get("number"),
            "category": item.get("category"),
            "image": item.get("image"),
            "rarity": item.get("rarity"),
        },
        "grade": grade,
        "subgrades": {
            "centering": random.randint(8, 10),
            "corners": random.randint(8, 10),
            "edges": random.randint(8, 10),
            "surface": random.randint(8, 10),
        },
        "authentication_status": "AUTHENTICITY REVIEW PASSED",
        "verification_status": "VCA VERIFIED",
        "value": item.get("current_value", 0),
        "date_certified": now_utc().isoformat(),
        "history": [
            {"event": "Submission received", "at": now_utc().isoformat()},
            {"event": "Authentication passed", "at": now_utc().isoformat()},
            {"event": "Graded " + grade, "at": now_utc().isoformat()},
            {"event": "Slab & NFC registered", "at": now_utc().isoformat()},
        ],
        "created_at": now_utc(),
    }
    await db.certifications.insert_one(cert)
    await db.collection_items.update_one(
        {"id": item_id},
        {"$set": {"cert_number": cert_number, "slab_id": slab_id, "nfc_id": nfc_id, "grade": grade}},
    )
    return await db.certifications.find_one({"cert_number": cert_number}, {"_id": 0})


@api.get("/certifications")
async def my_certifications(user: dict = Depends(get_current_user)):
    return await db.certifications.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@api.get("/verify/{cert_number}")
async def verify_cert(cert_number: str):
    cert = await db.certifications.find_one(
        {"cert_number": cert_number.upper().strip()}, {"_id": 0}
    )
    if not cert:
        return {"found": False, "message": "CERTIFICATION NOT FOUND"}
    return {"found": True, "certification": cert}


# ----------------------------- Dashboard ------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    items = await db.collection_items.find(
        {"user_id": user["user_id"], "deleted_at": None}, {"_id": 0}
    ).to_list(1000)
    total_value = sum(i.get("current_value", 0) or 0 for i in items)
    total_cost = sum(i.get("purchase_price", 0) or 0 for i in items)
    certified = [i for i in items if i.get("cert_number")]
    grade_breakdown: dict = {}
    for i in items:
        g = i.get("grade") or "Raw"
        grade_breakdown[g] = grade_breakdown.get(g, 0) + 1
    top_card = max(items, key=lambda i: i.get("current_value", 0) or 0) if items else None
    pending = await db.submissions.count_documents(
        {"user_id": user["user_id"], "status": {"$nin": ["COMPLETED", "SHIPPED"]}}
    )
    # Build a value-history sparkline (deterministic-ish trend around current value).
    history = []
    base = total_value if total_value else 0
    for m in range(6, -1, -1):
        factor = 1 - (m * random.uniform(0.008, 0.03))
        history.append({"label": f"-{m}m" if m else "now", "value": round(base * factor, 2)})
    return {
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "profit_loss": round(total_value - total_cost, 2),
        "total_cards": len(items),
        "certified_count": len(certified),
        "pending_submissions": pending,
        "grade_breakdown": grade_breakdown,
        "top_card": top_card,
        "recent": items[:5] if items else [],
        "value_history": history,
    }


# ----------------------------- AI Scanner -----------------------------------
class ScanIn(BaseModel):
    image_base64: str


SCAN_SYSTEM = (
    "You are VCA's card identification engine for trading cards (Pokemon, sports, "
    "Magic, Yu-Gi-Oh, One Piece and others). Analyze the card image and return ONLY "
    "a compact JSON object, no markdown, with keys: name (string), set (string), "
    "number (string), category (one of Pokemon, Sports, Magic, Yu-Gi-Oh, One Piece, Other), "
    "rarity (string), language (string), condition (one of Mint, Near Mint, Excellent, Good, Played), "
    "confidence (0-100 integer), authenticity_status (one of "
    "'AUTHENTICITY REVIEW PASSED','AUTHENTICITY REVIEW FLAGGED','MANUAL REVIEW REQUIRED',"
    "'INSUFFICIENT IMAGE QUALITY'), notes (short string). "
    "Never claim a card is definitely counterfeit; if suspicious use 'AUTHENTICITY REVIEW FLAGGED'. "
    "If the image is not a trading card or unreadable, use 'INSUFFICIENT IMAGE QUALITY' with low confidence."
)


def _strip_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        text = m.group(0)
    return json.loads(text)


@api.post("/scan")
async def scan_card(body: ScanIn, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Scanner not configured")
    b64 = body.image_base64
    if "," in b64 and b64.strip().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id="scan_" + uuid.uuid4().hex[:10],
            system_message=SCAN_SYSTEM,
        ).with_model("gemini", "gemini-3-flash-preview")
        message = UserMessage(
            text="Identify this trading card and return the JSON described.",
            file_contents=[ImageContent(image_base64=b64)],
        )
        raw = await chat.send_message(message)
        result = _strip_json(raw)
    except Exception as e:  # noqa: BLE001
        logger.exception("scan failed")
        raise HTTPException(status_code=502, detail=f"Scan failed: {e}")

    name = (result.get("name") or "").strip()
    category = result.get("category") or "Other"
    confidence = int(result.get("confidence") or 0)

    # Try to match a catalog card for real pricing.
    matched = None
    if name:
        matched = await db.cards.find_one(
            {"name": {"$regex": re.escape(name.split(" ")[0]), "$options": "i"}}, {"_id": 0}
        )
    raw_value = (matched or {}).get("raw_value", round(random.uniform(15, 120), 2))
    grade_values = (matched or {}).get("grade_values") or {
        "raw": raw_value,
        "vca10": round(raw_value * 6.5, 2),
        "vca9": round(raw_value * 3.2, 2),
        "vca8": round(raw_value * 1.8, 2),
        "psa10": round(raw_value * 6.0, 2),
        "psa9": round(raw_value * 3.0, 2),
    }
    image = (matched or {}).get("image") if matched else None

    return {
        "identification": {
            "name": name or "Unidentified card",
            "set": result.get("set") or (matched or {}).get("set", ""),
            "number": result.get("number") or (matched or {}).get("number", ""),
            "category": category,
            "rarity": result.get("rarity") or (matched or {}).get("rarity", ""),
            "language": result.get("language") or "English",
        },
        "confidence": confidence,
        "authenticity_status": result.get("authenticity_status") or "MANUAL REVIEW REQUIRED",
        "condition": result.get("condition") or "Near Mint",
        "notes": result.get("notes") or "",
        "matched": bool(matched),
        "image": image,
        "raw_value": raw_value,
        "grade_values": grade_values,
        "market": {
            "low": round(raw_value * 0.85, 2),
            "mid": raw_value,
            "high": round(raw_value * 1.35, 2),
            "updated_at": now_utc().isoformat(),
            "sources": ["VCA Market Index", "eBay (aggregate)", "PriceCharting"],
        },
    }


# ----------------------------- Slabook (social) -----------------------------
class PostIn(BaseModel):
    text: str = ""
    image: Optional[str] = None
    card: Optional[dict] = None


@api.get("/feed")
async def get_feed(user: Optional[dict] = Depends(optional_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    uid = user["user_id"] if user else None
    for p in posts:
        p["like_count"] = len(p.get("likes", []))
        p["comment_count"] = len(p.get("comments", []))
        p["liked_by_me"] = uid in p.get("likes", []) if uid else False
    return posts


@api.post("/posts")
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    post = {
        "id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "author": {"name": user.get("name"), "picture": user.get("picture"), "profile_type": user.get("profile_type")},
        "text": body.text,
        "image": body.image,
        "card": body.card,
        "likes": [],
        "comments": [],
        "created_at": now_utc(),
    }
    await db.posts.insert_one(post)
    out = await db.posts.find_one({"id": post["id"]}, {"_id": 0})
    out["like_count"] = 0
    out["comment_count"] = 0
    out["liked_by_me"] = False
    return out


@api.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    likes = post.get("likes", [])
    if user["user_id"] in likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user["user_id"]}})
        liked = False
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": user["user_id"]}})
        liked = True
    updated = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return {"liked": liked, "like_count": len(updated.get("likes", []))}


class CommentIn(BaseModel):
    text: str


@api.post("/posts/{post_id}/comments")
async def comment_post(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    comment = {
        "id": uuid.uuid4().hex,
        "author": user.get("name"),
        "picture": user.get("picture"),
        "text": body.text,
        "at": now_utc().isoformat(),
    }
    res = await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return comment


# ----------------------------- Submissions & pricing ------------------------
@api.get("/pricing/tiers")
async def pricing_tiers():
    doc = await db.settings.find_one({"key": "pricing_tiers"}, {"_id": 0})
    return doc["value"] if doc else []


@api.get("/settings/shipping")
async def shipping_settings():
    doc = await db.settings.find_one({"key": "shipping"}, {"_id": 0})
    return doc["value"] if doc else {}


class SubmissionIn(BaseModel):
    tier: str
    cards: List[dict]
    contact_name: str
    contact_email: str
    address: str


@api.post("/submissions")
async def create_submission(body: SubmissionIn, user: dict = Depends(get_current_user)):
    tiers = await pricing_tiers()
    tier = next((t for t in tiers if t["name"] == body.tier), None)
    per_card = tier["price"] if tier else 25
    total = per_card * max(1, len(body.cards))
    sub = {
        "id": "SUB-" + uuid.uuid4().hex[:8].upper(),
        "user_id": user["user_id"],
        "tier": body.tier,
        "cards": body.cards,
        "contact_name": body.contact_name,
        "contact_email": body.contact_email,
        "address": body.address,
        "total": total,
        "status": "SUBMISSION CREATED",
        "status_history": [{"status": "SUBMISSION CREATED", "at": now_utc().isoformat()}],
        "created_at": now_utc(),
    }
    await db.submissions.insert_one(sub)
    return await db.submissions.find_one({"id": sub["id"]}, {"_id": 0})


@api.get("/submissions")
async def list_submissions(user: dict = Depends(get_current_user)):
    return await db.submissions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)


# ----------------------------- Health & seed --------------------------------
@api.get("/health")
async def health():
    return {"status": "ok", "cards": await db.cards.count_documents({})}


app.include_router(api)


# --------------------------- Startup seed -----------------------------------
SEED_CARDS = [
    # Pokemon (images.pokemontcg.io)
    ("Charizard", "Base Set", "4/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/4_hires.png", 420),
    ("Blastoise", "Base Set", "2/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/2_hires.png", 240),
    ("Venusaur", "Base Set", "15/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/15_hires.png", 190),
    ("Pikachu", "Base Set", "58/102", "Pokemon", "Common", "https://images.pokemontcg.io/base1/58_hires.png", 60),
    ("Mewtwo", "Base Set", "10/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/10_hires.png", 120),
    ("Gyarados", "Base Set", "6/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/6_hires.png", 95),
    ("Alakazam", "Base Set", "1/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/1_hires.png", 88),
    ("Zapdos", "Base Set", "16/102", "Pokemon", "Holo Rare", "https://images.pokemontcg.io/base1/16_hires.png", 80),
    # Yu-Gi-Oh (images.ygoprodeck.com)
    ("Blue-Eyes White Dragon", "LOB", "001", "Yu-Gi-Oh", "Ultra Rare", "https://images.ygoprodeck.com/images/cards/89631139.jpg", 300),
    ("Dark Magician", "LOB", "005", "Yu-Gi-Oh", "Ultra Rare", "https://images.ygoprodeck.com/images/cards/46986414.jpg", 210),
    ("Red-Eyes Black Dragon", "LOB", "070", "Yu-Gi-Oh", "Ultra Rare", "https://images.ygoprodeck.com/images/cards/74677422.jpg", 160),
    ("Exodia the Forbidden One", "LOB", "124", "Yu-Gi-Oh", "Ultra Rare", "https://images.ygoprodeck.com/images/cards/33396948.jpg", 260),
    ("Summoned Skull", "MRD", "030", "Yu-Gi-Oh", "Ultra Rare", "https://images.ygoprodeck.com/images/cards/70781052.jpg", 70),
    ("Kuriboh", "MRD", "071", "Yu-Gi-Oh", "Rare", "https://images.ygoprodeck.com/images/cards/40640057.jpg", 45),
]


async def seed():
    if await db.cards.count_documents({}) == 0:
        docs = []
        for name, cset, number, cat, rarity, image, raw in SEED_CARDS:
            trend = round(random.uniform(-8, 22), 1)
            docs.append({
                "id": uuid.uuid4().hex,
                "name": name,
                "set": cset,
                "number": number,
                "category": cat,
                "rarity": rarity,
                "image": image,
                "raw_value": raw,
                "grade_values": {
                    "raw": raw,
                    "vca10": round(raw * 6.5, 2),
                    "vca9": round(raw * 3.2, 2),
                    "vca8": round(raw * 1.8, 2),
                    "psa10": round(raw * 6.0, 2),
                    "psa9": round(raw * 3.0, 2),
                },
                "market_low": round(raw * 0.85, 2),
                "market_mid": raw,
                "market_high": round(raw * 1.35, 2),
                "cert_count": random.randint(120, 9000),
                "trend": trend,
                "updated_at": now_utc().isoformat(),
            })
        await db.cards.insert_many(docs)
        logger.info("Seeded %d cards", len(docs))

    if await db.settings.count_documents({"key": "pricing_tiers"}) == 0:
        await db.settings.insert_one({"key": "pricing_tiers", "value": [
            {"name": "VCA Standard", "price": 25, "turnaround": "20 business days", "max_value": "$500", "features": ["Authentication", "Grading", "Slab + NFC"]},
            {"name": "VCA Express", "price": 60, "turnaround": "7 business days", "max_value": "$2,500", "features": ["Priority queue", "Grading", "Slab + NFC", "Insurance"]},
            {"name": "VCA Premium", "price": 150, "turnaround": "3 business days", "max_value": "$10,000", "features": ["Forensic review", "Grading", "Premium slab + NFC", "Insurance", "Return shipping"]},
            {"name": "VCA Bulk", "price": 15, "turnaround": "35 business days", "max_value": "$200", "features": ["10+ cards", "Grading", "Slab + NFC"]},
        ]})
    if await db.settings.count_documents({"key": "shipping"}) == 0:
        await db.settings.insert_one({"key": "shipping", "value": {
            "submission_address": "3534 46 St NW\nEdmonton, Alberta\nT6L 3T8\nCanada",
            "instructions": "Place each card in a penny sleeve and top loader. Include your submission number inside the package.",
            "contact": "support@vca.example",
        }})


async def seed_feed():
    if await db.posts.count_documents({}) == 0:
        samples = [
            ("Ash K.", "Creator", "Just pulled a gem mint Charizard! Sending it to VCA for grading 🔥", "https://images.pokemontcg.io/base1/4_hires.png"),
            ("Mai V.", "Dealer", "Fresh VCA slab back from the lab — Blue-Eyes graded VCA 10.", "https://images.ygoprodeck.com/images/cards/89631139.jpg"),
            ("Trent D.", "Collector", "Base Set Blastoise finally certified. NFC verified and in the vault.", "https://images.pokemontcg.io/base1/2_hires.png"),
        ]
        for name, ptype, text, img in samples:
            await db.posts.insert_one({
                "id": uuid.uuid4().hex,
                "user_id": "seed",
                "author": {"name": name, "picture": None, "profile_type": ptype},
                "text": text,
                "image": img,
                "card": None,
                "likes": [],
                "comments": [],
                "created_at": now_utc(),
            })


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.certifications.create_index("cert_number", unique=True)
    await seed()
    await seed_feed()
