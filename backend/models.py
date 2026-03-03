# models.py
from pydantic import BaseModel, EmailStr
from pydantic import BaseModel, Field
from typing import TypedDict, List, Dict, Any, Literal
from bson import ObjectId

class GraphState(TypedDict):
    text: str
    analysis: Dict[str, Any]
    outputs: List[Dict[str, Any]]

class VisualizationSpec(BaseModel):
    type: Literal["matplotlib", "graphviz", "diffusion"]
    title: str
    description: str
    data: Dict[str, Any] = Field(default_factory=dict)
    prompt: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    email: EmailStr
    hashed_password: str

class AnalysisOutput(BaseModel):
    summary: str
    visualizations: List[VisualizationSpec] = Field(default_factory=list)

class User(BaseModel):
    username: str
    email: str
    password_hash: str  # Use bcrypt
    totp_secret: str  # For 2FA

class ChatRequest(BaseModel):
    message: str

class Visualization(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class ChatResponse(BaseModel):
    summary: str
    visualizations: List[Visualization]

class HistoryItem(BaseModel):
    input_text: str
    output: Dict[str, Any]
    created_at: str

# Mongo doc IDs
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")
