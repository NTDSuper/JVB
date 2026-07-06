import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.users_model import User
from models.cart_model import Cart
from models.cart_item_model import CartItem
from models.products_model import Product
from routers.auth import get_current_user
from schemas.cart_schema import (
    AddToCartRequest,
    UpdateCartItemRequest,
    CartItemResponse,
    CartResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cart", tags=["Cart"])


def _get_or_create_cart(user_id: int, db: Session) -> Cart:
    """Get existing cart for user or create a new one."""
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _build_cart_response(cart: Cart) -> CartResponse:
    """Build a CartResponse from a Cart object with item details."""
    items = []
    total = 0.0

    for item in cart.items:
        product = item.product
        # Skip soft-deleted products in cart display
        if product.deleted_at is not None:
            continue
        subtotal = float(product.price) * item.quantity
        total += subtotal

        items.append(
            CartItemResponse(
                id=item.id,
                product_id=product.id,
                product_name=product.name,
                product_sku=product.sku,
                product_price=float(product.price),
                product_image_url=product.image_url,
                quantity=item.quantity,
                subtotal=round(subtotal, 2),
            )
        )

    return CartResponse(
        id=cart.id,
        user_id=cart.user_id,
        items=items,
        total_amount=round(total, 2),
    )


@router.get("", response_model=CartResponse)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's cart with all items."""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        return CartResponse(id=0, user_id=current_user.id, items=[], total_amount=0)

    return _build_cart_response(cart)


@router.post("/add", response_model=CartResponse)
def add_to_cart(
    payload: AddToCartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a product to cart. If product already exists, increase quantity."""
    # Validate product exists, is active and not soft-deleted
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Product is not available")
    if product.status != "active":
        raise HTTPException(status_code=400, detail="Product is not available")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if product.stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.stock}",
        )

    cart = _get_or_create_cart(current_user.id, db)

    # Check if product already in cart
    existing_item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == payload.product_id)
        .first()
    )

    if existing_item:
        # Increase quantity
        new_qty = existing_item.quantity + payload.quantity
        if product.stock < new_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {product.stock}, in cart: {existing_item.quantity}",
            )
        existing_item.quantity = new_qty
        db.commit()
        db.refresh(existing_item)
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

    # Refresh cart to get updated items
    db.refresh(cart)
    return _build_cart_response(cart)


@router.patch("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    payload: UpdateCartItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update quantity of a specific cart item."""
    cart = _get_or_create_cart(current_user.id, db)

    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    product = item.product
    if product.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Product is no longer available")
    if product.stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.stock}",
        )

    item.quantity = payload.quantity
    db.commit()
    db.refresh(cart)
    return _build_cart_response(cart)


@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an item from cart."""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    db.refresh(cart)
    return _build_cart_response(cart)


@router.delete("", response_model=CartResponse)
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove all items from cart."""
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        return CartResponse(id=0, user_id=current_user.id, items=[], total_amount=0)

    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(cart)
    return CartResponse(id=cart.id, user_id=cart.user_id, items=[], total_amount=0)