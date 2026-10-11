from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.ml.match import score_match

router = APIRouter(prefix="/api", tags=["match"])

class MatchIn(BaseModel):
    destSim: float = Field(ge=0, le=1)
    dateOverlapDays: int = Field(ge=0, le=30)
    tagSim: float = Field(ge=0, le=1)
    seatsRatio: float = Field(ge=0, le=1)

@router.post("/match")
def match(body: MatchIn):
    return score_match(body.destSim, body.dateOverlapDays, body.tagSim, body.seatsRatio)