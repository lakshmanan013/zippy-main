import os
import random
import re
import requests
import shutil
import base64
import uuid
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Any
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import *
from models import *
from schemas import *
from utils import *

router = APIRouter()

@router.post("/products")
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=data.name,
        price=data.price,
        mrp=data.mrp,
        discount_percent=data.discount_percent,
        pincode=data.pincode,
        stock_quantity=data.stock_quantity,
        is_prescription_required=data.is_prescription_required,
        rating=data.rating,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return model_response(product)
@router.get("/products")
def get_products(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Product).all()]
@router.get("/products/{product_id}")
def get_product_id(product_id: int, db: Session = Depends(get_db)):
    record = db.query(Product).filter(Product.id == product_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Product not found")
    return model_response(record)
@router.put("/products/{product_id}")
def update_product(product_id: int,data: ProductCreate,db: Session = Depends(get_db)):
    record = db.query(Product).filter(Product.id == product_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Product not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/products/{product_id}")
def delete_product(product_id: int,db: Session = Depends(get_db)):
    record = db.query(Product).filter(Product.id == product_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Product not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Product deleted successfully",
            "id": product_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/inventory")
def create_inventory(data: InventoryCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    seller = db.query(SellerStore).filter(SellerStore.id == data.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller/store not found")
    inventory = Inventory(
        product_id=data.product_id,
        seller_id=data.seller_id,
        pincode=data.pincode,
        inventory_source=data.inventory_source,
        available_quantity=data.available_quantity,
        reserved_quantity=data.reserved_quantity,
        reorder_level=data.reorder_level
    )
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return model_response(inventory)
@router.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Inventory).all()]
@router.get("/inventory/{inventory_id}")
def get_inventory_id(inventory_id: int, db: Session = Depends(get_db)):
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Inventory not found")
    return model_response(record)
@router.put("/inventory/{inventory_id}")
def update_inventory(inventory_id: int,data: InventoryCreate,db: Session = Depends(get_db)):
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Inventory not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/inventory/{inventory_id}")
def delete_inventory(inventory_id: int,db: Session = Depends(get_db)):
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Inventory not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Inventory deleted successfully",
            "id": inventory_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/categories")
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    category = Category(
        name=data.name,
        slug=data.slug,
        sort_order=data.sort_order,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return model_response(category)
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Category).all()]
@router.get("/categories/{category_id}")
def get_category_id(category_id: int, db: Session = Depends(get_db)):
    record = db.query(Category).filter(
        Category.id == category_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Category not found")
    return model_response(record)
@router.put("/categories/{category_id}")
def update_category(category_id: int,data: CategoryCreate,db: Session = Depends(get_db)):
    record = db.query(Category).filter(Category.id == category_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Category not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/categories/{category_id}")
def delete_category(category_id: int,db: Session = Depends(get_db)):
    record = db.query(Category).filter(Category.id == category_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Category not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Category deleted successfully",
            "id": category_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/brands")
def create_brand(data: BrandCreate, db: Session = Depends(get_db)):
    brand = Brand(name=data.name,is_active=yes_no_to_bool(data.is_active))
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return model_response(brand)
@router.get("/brands")
def get_brands(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Brand).all()]
@router.get("/brands/{brand_id}")
def get_brand_id(brand_id: int, db: Session = Depends(get_db)):
    record = db.query(Brand).filter(
        Brand.id == brand_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Brand not found")
    return model_response(record)
@router.put("/brands/{brand_id}")
def update_brand(brand_id: int,data: BrandCreate,db: Session = Depends(get_db)):
    record = db.query(Brand).filter(Brand.id == brand_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Brand not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/brands/{brand_id}")
def delete_brand(brand_id: int,db: Session = Depends(get_db)):
    record = db.query(Brand).filter(Brand.id == brand_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Brand not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Brand deleted successfully",
            "id": brand_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/seller-stores")
def create_seller_store(data: SellerStoreCreate, db: Session = Depends(get_db)):
    seller = SellerStore(
        business_name=data.business_name,
        seller_type=data.seller_type,
        phone=data.phone,
        commission_rate=data.commission_rate,
        verification_status=data.verification_status,
        rating=data.rating,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return model_response(seller)
@router.get("/seller-stores")
def get_seller_stores(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(SellerStore).all()]
@router.get("/seller-stores/{seller_id}")
def get_seller_id(seller_id: int, db: Session = Depends(get_db)):
    record = db.query(SellerStore).filter(SellerStore.id == seller_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Seller store not found")
    return model_response(record)
@router.put("/seller-stores/{seller_id}")
def update_sellerstore(seller_id: int,data: SellerStoreCreate,db: Session = Depends(get_db)):
    record = db.query(SellerStore).filter(SellerStore.id == seller_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="SellerStore not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/seller-stores/{seller_id}")
def delete_sellerstore(seller_id: int,db: Session = Depends(get_db)):
    record = db.query(SellerStore).filter(SellerStore.id == seller_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="SellerStore not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "SellerStore deleted successfully",
            "id": seller_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/warehouses")
def create_warehouse(data: WarehouseCreate, db: Session = Depends(get_db)):
    seller = db.query(SellerStore).filter(SellerStore.id == data.seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller/store not found")
    warehouse = Warehouse(
        name=data.name,
        seller_id=data.seller_id,
        is_zenve_owned=data.is_zenve_owned,
        contact_phone=data.contact_phone,
        is_active=yes_no_to_bool(data.is_active)
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return model_response(warehouse)
@router.get("/warehouses")
def get_warehouses(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Warehouse).all()]
@router.get("/warehouses/{warehouse_id}")
def get_warehouse_id(warehouse_id: int, db: Session = Depends(get_db)):
    record = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Warehouse not found")
    return model_response(record)
@router.put("/warehouses/{warehouse_id}")
def update_warehouse(warehouse_id: int,data: WarehouseCreate,db: Session = Depends(get_db)):
    record = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Warehouse not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/warehouses/{warehouse_id}")
def delete_warehouse(warehouse_id: int,db: Session = Depends(get_db)):
    record = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Warehouse not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Warehouse deleted successfully",
            "id": warehouse_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/carts")
def create_cart(data: CartCreate, db: Session = Depends(get_db)):
    cart = Cart(user_id=data.user_id)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return model_response(cart)
@router.get("/carts")
def get_carts(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Cart).all()]
@router.get("/carts/{cart_id}")
def get_cart_id(cart_id: int, db: Session = Depends(get_db)):
    record = db.query(Cart).filter(Cart.id == cart_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Cart not found")
    return model_response(record)
@router.put("/carts/{cart_id}")
def update_cart(cart_id: int,data: CartCreate,db: Session = Depends(get_db)):
    record = db.query(Cart).filter(Cart.id == cart_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Cart not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/carts/{cart_id}")
def delete_cart(cart_id: int,db: Session = Depends(get_db)):
    record = db.query(Cart).filter(Cart.id == cart_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Cart not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Cart deleted successfully",
            "id": cart_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/cart-items")
def create_cart_item(data: CartItemCreate, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.id == data.cart_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    cart_item = CartItem(
        cart_id=data.cart_id,
        product_id=data.product_id,
        quantity=data.quantity,
        price=data.price,
        saved_for_later=data.saved_for_later
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return model_response(cart_item)
@router.get("/cart-items")
def get_cart_items(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(CartItem).all()]
@router.get("/cart-items/{cart_item_id}")
def get_cart_item_id(cart_item_id: int, db: Session = Depends(get_db)):
    record = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Cart item not found")
    return model_response(record)
@router.put("/cart-items/{cart_item_id}")
def update_cartitem(cart_item_id: int,data: CartItemCreate,db: Session = Depends(get_db)):
    record = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="CartItem not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/cart-items/{cart_item_id}")
def delete_cartitem(cart_item_id: int,db: Session = Depends(get_db)):
    record = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="CartItem not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "CartItem deleted successfully",
            "id": cart_item_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/orders")
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    order = Order(
        order_number=data.order_number,
        total_amount=data.total_amount,
        status=data.status,
        payment_status=data.payment_status
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return model_response(order)
@router.get("/orders")
def get_order(db :Session =Depends(get_db)):
    return [model_response(item) for item in db.query(Order).all()]
@router.get("/orders/{order_id}")
def get_order_id(order_id: int, db: Session = Depends(get_db)):
    record = db.query(Order).filter(Order.id == order_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Order not found")
    return model_response(record)
@router.put("/orders/{order_id}")
def update_order(order_id: int,data: OrderCreate,db: Session = Depends(get_db)):
    record = db.query(Order).filter(Order.id == order_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Order not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/orders/{order_id}")
def delete_order(order_id: int,db: Session = Depends(get_db)):
    record = db.query(Order).filter(Order.id == order_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Order not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Order deleted successfully",
            "id": order_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/order-items")
def create_order_item(data: OrderItemCreate , db : Session=Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404 , detail="order not found")
    item = OrderItem(
        order_id = data.order_id,
        product_name = data.product_name,
        quantity = data.quantity,
        unit_price = data.unit_price,
        total_price = data.total_price,
        status = data.status
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return model_response(item)
@router.get("/order-items")
def get_order_items(db :Session = Depends(get_db)):
    return [model_response(item) for item in db.query(OrderItem).all()]
@router.get("/order-items/{item_id}")
def get_item_id(item_id: int, db: Session = Depends(get_db)):
    record = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Order item not found")
    return model_response(record)
@router.put("/order-items/{item_id}")
def update_orderitem(item_id: int,data: OrderItemCreate,db: Session = Depends(get_db)):
    record = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="OrderItem not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/order-items/{item_id}")
def delete_orderitem(item_id: int,db: Session = Depends(get_db)):
    record = db.query(OrderItem).filter(OrderItem.id == item_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="OrderItem not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "OrderItem deleted successfully",
            "id": item_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/deliveries")
def create_delivery(data: DeliveryCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    delivery = Delivery(**data.model_dump())
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return model_response(delivery)
@router.get("/deliveries")
def get_deliveries(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Delivery).all()]
@router.get("/deliveries/{delivery_id}")
def get_delivery_id(delivery_id: int, db: Session = Depends(get_db)):
    record = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Delivery not found")
    return model_response(record)
@router.put("/deliveries/{delivery_id}")
def update_delivery(delivery_id: int,data: DeliveryCreate,db: Session = Depends(get_db)):
    record = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Delivery not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/deliveries/{delivery_id}")
def delete_delivery(delivery_id: int,db: Session = Depends(get_db)):
    record = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Delivery not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Delivery deleted successfully",
            "id": delivery_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/payments")
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404,detail="Order not found")
    payment = Payment(
        order_id=data.order_id,
        amount=data.amount,
        gateway=data.gateway,
        status=data.status,
        webhook_verified=data.webhook_verified
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return model_response(payment)
@router.get("/payments")
def get_payment(db:Session=Depends(get_db)):
    return [model_response(item) for item in db.query(Payment).all()]
@router.get("/payments/{payment_id}")
def get_payment_id(payment_id: int, db: Session = Depends(get_db)):
    record = db.query(Payment).filter(Payment.id == payment_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payment not found")
    return model_response(record)
@router.put("/payments/{payment_id}")
def update_payment(payment_id: int,data: PaymentCreate,db: Session = Depends(get_db)):
    record = db.query(Payment).filter(Payment.id == payment_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payment not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/payments/{payment_id}")
def delete_payment(payment_id: int,db: Session = Depends(get_db)):
    record = db.query(Payment).filter(Payment.id == payment_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payment not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Payment deleted successfully",
            "id": payment_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/refunds")
def create_refund(data: RefundCreate, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == data.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    refund = Refund(**data.model_dump())
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return model_response(refund)
@router.get("/refunds")
def get_refunds(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Refund).all()]
@router.get("/refunds/{refund_id}")
def get_refund_id(refund_id: int, db: Session = Depends(get_db)):
    record = db.query(Refund).filter(Refund.id == refund_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Refund not found")
    return model_response(record)
@router.put("/refunds/{refund_id}")
def update_refund(refund_id: int,data: RefundCreate,db: Session = Depends(get_db)):
    record = db.query(Refund).filter(Refund.id == refund_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Refund not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/refunds/{refund_id}")
def delete_refund(refund_id: int,db: Session = Depends(get_db)):
    record = db.query(Refund).filter(Refund.id == refund_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Refund not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Refund deleted successfully",
            "id": refund_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/payouts")
def create_payout(data: PayoutCreate, db: Session = Depends(get_db)):
    payout = Payout(**data.model_dump())
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return model_response(payout)
@router.get("/payouts")
def get_payouts(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(Payout).all()]
@router.get("/payouts/{payout_id}")
def get_payout_id(payout_id: int, db: Session = Depends(get_db)):
    record = db.query(Payout).filter(Payout.id == payout_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payout not found")
    return model_response(record)
@router.put("/payouts/{payout_id}")
def update_payout(payout_id: int,data: PayoutCreate,db: Session = Depends(get_db)):
    record = db.query(Payout).filter(Payout.id == payout_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payout not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/payouts/{payout_id}")
def delete_payout(payout_id: int,db: Session = Depends(get_db)):
    record = db.query(Payout).filter(Payout.id == payout_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Payout not found")
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "Payout deleted successfully",
            "id": payout_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.post("/commission-rules")
def create_commission_rule(data: CommissionRuleCreate, db: Session = Depends(get_db)):
    rule_data = data.model_dump()
    rule_data["is_active"] = yes_no_to_bool(rule_data["is_active"])
    rule = CommissionRule(**rule_data)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return model_response(rule)
@router.get("/commission-rules")
def get_commission_rules(db: Session = Depends(get_db)):
    return [model_response(item) for item in db.query(CommissionRule).all()]
@router.get("/commission-rules/{rule_id}")
def get_rule_id(rule_id: int, db: Session = Depends(get_db)):
    record = db.query(CommissionRule).filter(
        CommissionRule.id == rule_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Commission rule not found")
    return model_response(record)
@router.put("/commission-rules/{rule_id}")
def update_commissionrule(rule_id: int,data: CommissionRuleCreate,db: Session = Depends(get_db)):
    record = db.query(CommissionRule).filter(CommissionRule.id == rule_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="CommissionRule not found")
    try:
        update_data = data.model_dump(exclude_unset=True)
        if "is_active" in update_data:
            update_data["is_active"] = yes_no_to_bool(update_data["is_active"])
        for field, value in update_data.items():
            setattr(record, field, value)
        db.commit()
        db.refresh(record)
        return model_response(record)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
@router.delete("/commission-rules/{rule_id}")
def delete_commissionrule(rule_id: int,db: Session = Depends(get_db)):
    record = db.query(CommissionRule).filter(CommissionRule.id == rule_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="CommissionRule not found" )
    try:
        db.delete(record)
        db.commit()
        return {
            "message": "CommissionRule deleted successfully",
            "id": rule_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400,detail=str(e))
