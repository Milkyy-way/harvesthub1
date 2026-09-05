from sqlalchemy.orm import Session
from app.categories.models import Category

def list_categories(db: Session) -> list[dict]:
    # CategoryOut.id is a plain str, but Category.id is a SQLAlchemy UUID
    # object — Pydantic v2 doesn't auto-coerce UUID -> str, so this would
    # 500 on serialization if the ORM objects were returned as-is (same
    # reason app/farmers/service.py stringifies farmer.id explicitly).
    categories = db.query(Category).order_by(Category.sort_order).all()
    return [
        {
            "id": str(c.id),
            "slug": c.slug,
            "name": c.name,
            "sort_order": c.sort_order,
            "icon_name": c.icon_name,
        }
        for c in categories
    ]
