from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: int = Field(..., gt=0)
    weight: Optional[int] = Field(None, gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    is_available: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: Optional[int] = Field(None, gt=0)
    weight: Optional[int] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderItem(BaseModel):
    product_id: int
    product_name: str
    quantity: int = Field(..., gt=0)
    price: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    address: str = Field(..., min_length=5, max_length=500)
    items: List[OrderItem] = Field(..., min_length=1)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        return v

    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError('Order must contain at least one item')
        return v


class OrderResponse(BaseModel):
    id: int
    customer_name: str
    phone: str
    address: str
    total_price: int
    status: str
    items: List[OrderItem]
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=20)