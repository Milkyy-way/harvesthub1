import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

bearer_scheme = HTTPBearer()
JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwk_client = PyJWKClient(JWKS_URL)

def decode_supabase_jwt(token: str) -> dict:
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    payload = decode_supabase_jwt(credentials.credentials)
    return {"id": payload.get("sub"), "email": payload.get("email")}