# crud.py
from sqlalchemy import select, delete, cast, Integer
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import (
    DBUser,
    DBProperty,
    Event,
    Payment,
    Inventory,
    Room,
    Item,
    DefaultRoom,
    DefaultItem,
    Client,
    IntegrationConfig,
    DeadLetter,
    BrandSettings,
    DBTenant,
    DBTenancy,
)
from schemas import (
    UserCreate,
    PropertyCreate,
    EventCreate,
    PaymentCreate,
    InventoryCreate,
    ClientCreate,
    IntegrationConfigCreate,
    IntegrationConfigUpdate,
    BrandSettingsUpdate,
    TenantCreate,
    TenantResponse,
    TenancyCreateInput,
    TenancyUpdateInput,
    TenancyWithTenantResponse,
)
from typing import Dict, Any, List, Optional
from adapters.registry import get_adapter
from datetime import datetime, timezone
import re
 


async def get_user(db: AsyncSession, username: str):
    result = await db.execute(select(DBUser).where(DBUser.username == username))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: UserCreate):
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=user.password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_property(db: AsyncSession, property_id: int):
    result = await db.execute(
        select(DBProperty)
        .options(
            selectinload(DBProperty.inventory)
            .selectinload(Inventory.rooms)
            .selectinload(Room.items)
        )
        .where(DBProperty.id == property_id)
    )
    property_obj = result.scalar()
    if not property_obj:
        return None

    return {
        "id": property_obj.id,
        "title": property_obj.title,
        "content": property_obj.content,
        "address": property_obj.address,
        "published": property_obj.published,
        "owner_id": property_obj.owner_id,
        "tenant_info": property_obj.tenant_info,
        "financial_info": property_obj.financial_info,
        "maintenance_records": property_obj.maintenance_records,
        "documents": property_obj.documents,
        "inspections": property_obj.inspections,
        "acf": property_obj.acf,
        "created_at": property_obj.created_at,
        "updated_at": property_obj.updated_at,
        "inventory": {
            "id": property_obj.inventory.id,
            "property_id": property_obj.inventory.property_id,
            "property_name": property_obj.inventory.property_name,
            "rooms": [
                {
                    "id": room.id,
                    "room_name": room.room_name,
                    "room_type": room.room_type,
                    "items": [
                        {
                            "id": item.id,
                            "name": item.name,
                            "brand": item.brand,
                            "purchase_date": item.purchase_date,
                            "value": item.value,
                            "condition": item.condition,
                            "owner": item.owner,
                            "notes": item.notes,
                            "photos": item.photos,
                            "created": item.created,
                            "updated": item.updated
                        }
                        for item in room.items
                    ]
                }
                for room in property_obj.inventory.rooms
            ]
        } if property_obj.inventory else None
    }


async def create_property(db: AsyncSession, property: PropertyCreate, owner_id: int):
    # 1. Create the property
    # Coalesce optional text fields to empty strings to satisfy NOT NULL constraints
    _base_payload = property.model_dump(exclude={"acf"})
    for _text_key in ("content", "address", "description"):
        if _base_payload.get(_text_key) is None:
            _base_payload[_text_key] = ""
    db_property = DBProperty(
        **_base_payload,
        owner_id=owner_id
    )
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)

    # 2. Handle ACF data
    if property.acf:
        # Normalize numeric fields within profilegroup to ensure ints are stored consistently
        acf_payload = property.acf.model_dump(exclude_unset=True)
        pg = acf_payload.get("profilegroup")
        if isinstance(pg, dict):
            for key in ("beds", "bathrooms", "living_rooms", "parking", "house_number"):
                if key in pg and pg[key] is not None:
                    try:
                        # Coerce numeric-looking strings to ints
                        pg[key] = int(pg[key])
                    except Exception:
                        # Leave as-is if not convertible
                        pass
        db_property.acf = acf_payload
        await db.commit()
        await db.refresh(db_property)

    # 3. Create inventory
    inventory = Inventory(
        property_id=db_property.id,
        property_name=db_property.title
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)

    # 4. Extract profilegroup values
    acf = db_property.acf or {}
    profilegroup = acf.get("profilegroup", {})

    def _safe_int(val, default=1):
        if val is None:
            return default
        if isinstance(val, bool):
            return default
        if isinstance(val, (int, float)):
            try:
                return int(val)
            except Exception:
                return default
        if isinstance(val, str):
            s = val.strip()
            if s == "":
                return default
            try:
                return int(s)
            except Exception:
                try:
                    return int(float(s))
                except Exception:
                    return default
        return default

    bed_count = max(1, _safe_int(profilegroup.get("beds", 1), 1))
    bath_count = max(1, _safe_int(profilegroup.get("bathrooms", 1), 1))
    living_count = max(1, _safe_int(profilegroup.get("living_rooms", 1), 1))
    parking_count = max(1, _safe_int(profilegroup.get("parking", 1), 1))

    # 5. Load default items from the database (ordered)
    defaults_result = await db.execute(select(DefaultItem).order_by(DefaultItem.order))
    default_items = defaults_result.scalars().all()

    # Build a mapping: room_name -> list of item dicts to create
    items_by_room_name: Dict[str, List[Dict[str, Any]]] = {}
    for d in default_items:
        items_by_room_name.setdefault(d.room_name, []).append({
            "name": d.name,
            "brand": d.brand,
            "value": d.value,
            "condition": d.condition,
            "owner": d.owner,
            "notes": d.notes,
            "photos": d.photos or []
        })

    # 6. Create rooms and items
    room_responses = []

    for i in range(bed_count):
        room_name = f"Bedroom {i + 1}"
        room = Room(inventory_id=inventory.id, room_name=room_name, room_type="Bedroom")
        db.add(room)
        await db.commit()
        await db.refresh(room)

        item_responses = []
        for item_data in items_by_room_name.get("Bedroom", []):
            item = Item(room_id=room.id, **item_data)
            db.add(item)
            await db.commit()
            await db.refresh(item)
            item_responses.append({
                "id": item.id,
                "name": item.name,
                "brand": item.brand,
                "value": item.value,
                "condition": item.condition,
                "owner": item.owner,
                "notes": item.notes,
                "photos": item.photos,
                "room_id": item.room_id
            })

        room_responses.append({
            "id": room.id,
            "room_name": room.room_name,
            "room_type": room.room_type,
            "items": item_responses
        })

    # Create Bathrooms
    for i in range(bath_count):
        room = Room(
            inventory_id=inventory.id,
            room_name=f"Bathroom {i + 1}",
            room_type="Bathroom"
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)

        item_responses = []
        for item_data in items_by_room_name.get("Bathroom", []):
            item = Item(room_id=room.id, **item_data)
            db.add(item)
            await db.commit()
            await db.refresh(item)
            item_responses.append({
                "id": item.id,
                "name": item.name,
                "brand": item.brand,
                "value": item.value,
                "condition": item.condition,
                "owner": item.owner,
                "notes": item.notes,
                "photos": item.photos,
                "room_id": item.room_id
            })

        room_responses.append({
            "id": room.id,
            "room_name": room.room_name,
            "room_type": room.room_type,
            "items": item_responses
        })

    # Create Living Rooms
    for i in range(living_count):
        room = Room(
            inventory_id=inventory.id,
            room_name=f"Living Room {i + 1}",
            room_type="Living Room"
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)

        item_responses = []
        for item_data in items_by_room_name.get("Living Room", []):
            item = Item(room_id=room.id, **item_data)
            db.add(item)
            await db.commit()
            await db.refresh(item)
            item_responses.append({
                "id": item.id,
                "name": item.name,
                "brand": item.brand,
                "value": item.value,
                "condition": item.condition,
                "owner": item.owner,
                "notes": item.notes,
                "photos": item.photos,
                "room_id": item.room_id
            })

        room_responses.append({
            "id": room.id,
            "room_name": room.room_name,
            "room_type": room.room_type,
            "items": item_responses
        })

    # Create Parking
    for i in range(parking_count):
        room = Room(
            inventory_id=inventory.id,
            room_name=f"Parking Space {i + 1}",
            room_type="Parking"
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)

        item_responses = []
        # Use defaults if present under either 'Parking' or 'Parking Space'
        parking_defaults = items_by_room_name.get("Parking", []) or items_by_room_name.get("Parking Space", [])
        for item_data in parking_defaults:
            item = Item(room_id=room.id, **item_data)
            db.add(item)
            await db.commit()
            await db.refresh(item)
            item_responses.append({
                "id": item.id,
                "name": item.name,
                "brand": item.brand,
                "value": item.value,
                "condition": item.condition,
                "owner": item.owner,
                "notes": item.notes,
                "photos": item.photos,
                "room_id": item.room_id
            })

        room_responses.append({
            "id": room.id,
            "room_name": room.room_name,
            "room_type": room.room_type,
            "items": item_responses
        })
    
    # 2. Trigger outbound sync via adapter (adapter-only)
    try:
        adapter = get_adapter("wordpress_acf")
        if adapter:
            result = await db.execute(
                select(IntegrationConfig).where(
                    IntegrationConfig.integration_type == "wordpress_acf",
                    IntegrationConfig.enabled == True,
                )
            )
            config = result.scalars().first()
            # Only proceed if config is set to allow outbound
            if config and (config.direction in ("outbound", "bidirectional")):
                send_result = await adapter.send_outbound_property(db_property, config, db)
                if not send_result:
                    # Record to DLQ when outbound didn't produce a result
                    try:
                        payload = await adapter.prepare_outbound_property(db_property, config)
                    except Exception:
                        payload = {"title": db_property.title, "content": db_property.content, "acf": db_property.acf}
                    dlq = DeadLetter(
                        entity_type="property",
                        property_id=db_property.id,
                        config_id=config.id,
                        integration_type=config.integration_type,
                        operation="outbound",
                        payload=payload,
                        error_message="Adapter returned no result",
                        attempt_count=0,
                    )
                    db.add(dlq)
                await db.commit()
                await db.refresh(db_property)
            else:
                print("No enabled wordpress_acf integration config; skipping outbound sync.")
        else:
            print("WordPress adapter not registered; skipping outbound sync.")
    except Exception as e:
        # Log to DLQ on exception
        try:
            payload = {"title": db_property.title, "content": db_property.content, "acf": db_property.acf}
            dlq = DeadLetter(
                entity_type="property",
                property_id=db_property.id,
                integration_type="wordpress_acf",
                operation="outbound",
                payload=payload,
                error_message=str(e),
                attempt_count=0,
            )
            db.add(dlq)
            await db.commit()
        except Exception:
            pass
        print(f"Failed to sync to WordPress via adapter: {e}")

    # 7. Return full response
    return {
        "id": db_property.id,
        "title": db_property.title,
        "content": db_property.content,
        "address": db_property.address,
        "description": db_property.description,
        "owner_id": db_property.owner_id,
        "published": db_property.published,
        "tenant_info": db_property.tenant_info,
        "financial_info": db_property.financial_info,
        "maintenance_records": db_property.maintenance_records,
        "documents": db_property.documents,
        "inspections": db_property.inspections,
        "acf": db_property.acf,
        "created_at": db_property.created_at,
        "updated_at": db_property.updated_at,
        "inventory": 
            {
                "id": inventory.id,
                "property_id": inventory.property_id,
                "property_name": inventory.property_name,
                "rooms": room_responses
            }
        
    }


async def get_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    """
    Get a list of properties with pagination
    """
    result = await db.execute(
        select(DBProperty)
        .options(
            selectinload(DBProperty.inventory)
            .selectinload(Inventory.rooms)
            .selectinload(Room.items)
        )
        .offset(skip)
        .limit(limit)
    )
    properties = result.scalars().all()

    # Convert each property to a dict to avoid ORM serialization issues
    return [
        {
            "id": prop.id,
            "title": prop.title,
            "content": prop.content,
            "address": prop.address,
            "published": prop.published,
            "owner_id": prop.owner_id,
            "tenant_info": prop.tenant_info,
            "financial_info": prop.financial_info,
            "maintenance_records": prop.maintenance_records,
            "documents": prop.documents,
            "inspections": prop.inspections,
            "acf": prop.acf,
            "created_at": prop.created_at,
            "updated_at": prop.updated_at,
            "inventory": {
            "id": prop.inventory.id,
            "property_id": prop.inventory.property_id,
            "property_name": prop.inventory.property_name,
            "rooms": [
                {
                    "id": room.id,
                    "room_name": room.room_name,
                    "room_type": room.room_type,
                    "items": [
                        {
                            "id": item.id,
                            "name": item.name,
                            "quantity": item.quantity,
                            "notes": item.notes,
                            "room_id": item.room_id
                        }
                        for item in room.items
                    ]
                }
                for room in prop.inventory.rooms
            ]
        } if prop.inventory else None
        }
        for prop in properties
    ]


async def get_published_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    """
    Get a list of published properties with pagination.
    """
    result = await db.execute(
        select(DBProperty)
        .where(DBProperty.published == True)
        .options(
            selectinload(DBProperty.inventory)
            .selectinload(Inventory.rooms)
            .selectinload(Room.items)
        )
        .offset(skip)
        .limit(limit)
    )
    properties = result.scalars().all()

    return [
        {
            "id": prop.id,
            "title": prop.title,
            "content": prop.content,
            "address": prop.address,
            "published": prop.published,
            "owner_id": prop.owner_id,
            "tenant_info": prop.tenant_info,
            "financial_info": prop.financial_info,
            "maintenance_records": prop.maintenance_records,
            "documents": prop.documents,
            "inspections": prop.inspections,
            "acf": prop.acf,
            "created_at": prop.created_at,
            "updated_at": prop.updated_at,
            "inventory": {
                "id": prop.inventory.id,
                "property_id": prop.inventory.property_id,
                "property_name": prop.inventory.property_name,
                "rooms": [
                    {
                        "id": room.id,
                        "room_name": room.room_name,
                        "room_type": room.room_type,
                        "items": [
                            {
                                "id": item.id,
                                "name": item.name,
                                "quantity": item.quantity,
                                "notes": item.notes,
                                "room_id": item.room_id
                            }
                            for item in room.items
                        ]
                    }
                    for room in prop.inventory.rooms
                ]
            } if prop.inventory else None
        }
        for prop in properties
    ]
    

async def update_property(db: AsyncSession, property_id: int, updates: dict):
    db_property = await db.get(DBProperty, property_id)
    if not db_property:
        return None

    # Handle acf merge
    if "acf" in updates:
        # Reassign the top-level JSON object to ensure SQLAlchemy change detection
        existing_acf: Dict[str, Any] = {}
        if isinstance(db_property.acf, dict):
            # Create a shallow copy to avoid in-place mutations on the tracked object
            existing_acf = {**db_property.acf}

        for group, data in updates["acf"].items():
            group_existing = {}
            if isinstance(existing_acf.get(group), dict):
                group_existing = {**existing_acf[group]}

            if isinstance(data, dict):
                # Merge and normalize numeric fields for profilegroup
                merged = {**group_existing, **data}
                if group == "profilegroup":
                    for key in ("beds", "bathrooms", "living_rooms", "parking", "house_number"):
                        if key in merged and merged[key] is not None:
                            try:
                                merged[key] = int(merged[key])
                            except Exception:
                                pass
                existing_acf[group] = merged
            else:
                existing_acf[group] = data

        # Assign back the rebuilt object to mark the column as changed
        db_property.acf = existing_acf

        # Sync Tenants: keep DBTenant identity unique and DBTenancy history per property
        try:
            tg = updates.get("acf", {}).get("tenants_group")
            if isinstance(tg, dict):
                await _upsert_tenant_and_tenancy_from_acf(db, property_id, tg)
        except Exception:
            # Non-blocking: tenant sync should never break property update
            pass

    # Update top-level fields
    for key, value in updates.items():
        if key != "acf":
            setattr(db_property, key, value)

    db_property.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(db_property)

    # Trigger outbound sync via adapter (adapter-only)
    try:
        adapter = get_adapter("wordpress_acf")
        if adapter:
            result = await db.execute(
                select(IntegrationConfig).where(
                    IntegrationConfig.integration_type == "wordpress_acf",
                    IntegrationConfig.enabled == True,
                )
            )
            config = result.scalars().first()
            # Only proceed if config allows outbound
            if config and (config.direction in ("outbound", "bidirectional")):
                send_result = await adapter.send_outbound_property(db_property, config, db)
                if not send_result:
                    try:
                        payload = await adapter.prepare_outbound_property(db_property, config)
                    except Exception:
                        payload = {"title": db_property.title, "content": db_property.content, "acf": db_property.acf}
                    dlq = DeadLetter(
                        entity_type="property",
                        property_id=db_property.id,
                        config_id=config.id,
                        integration_type=config.integration_type,
                        operation="outbound",
                        payload=payload,
                        error_message="Adapter returned no result",
                        attempt_count=0,
                    )
                    db.add(dlq)
                await db.commit()
                await db.refresh(db_property)
            else:
                print("No enabled wordpress_acf integration config; skipping outbound sync.")
        else:
            print("WordPress adapter not registered; skipping outbound sync.")
    except Exception as e:
        try:
            payload = {"title": db_property.title, "content": db_property.content, "acf": db_property.acf}
            dlq = DeadLetter(
                entity_type="property",
                property_id=db_property.id,
                integration_type="wordpress_acf",
                operation="outbound",
                payload=payload,
                error_message=str(e),
                attempt_count=0,
            )
            db.add(dlq)
            await db.commit()
        except Exception:
            pass
        print(f"Failed to sync to WordPress via adapter on update: {e}")

    return db_property


# --- Tenant/Tenancy helpers ---
def _normalize_name(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    return re.sub(r"\s+", " ", name.strip()).lower()


async def _upsert_tenant_and_tenancy_from_acf(db: AsyncSession, property_id: int, tg: Dict[str, Any]) -> None:
    # Map common fields from ACF TenantsGroup
    raw_name = tg.get("tenants_name") or tg.get("name")
    email = tg.get("email")
    phone = tg.get("phone")
    dob = tg.get("date_of_birth")
    employment_status = tg.get("employment_status")

    name = raw_name or "Unknown Tenant"
    name_key = _normalize_name(name)

    # Find or create unique tenant by email OR name+dob
    tenant: Optional[DBTenant] = None
    if email:
        result = await db.execute(select(DBTenant).where(DBTenant.email == email))
        tenant = result.scalars().first()
    if not tenant and name_key and dob:
        result = await db.execute(
            select(DBTenant).where(DBTenant.name_key == name_key).where(DBTenant.date_of_birth == dob)
        )
        tenant = result.scalars().first()

    if not tenant:
        tenant = DBTenant(
            name=name,
            name_key=name_key,
            email=email,
            phone=phone,
            date_of_birth=dob,
            employment_status=employment_status,
        )
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)
    else:
        # Update canonical fields if changed (non-destructive)
        changed = False
        if phone and tenant.phone != phone:
            tenant.phone = phone
            changed = True
        if employment_status and tenant.employment_status != employment_status:
            tenant.employment_status = employment_status
            changed = True
        if name and tenant.name != name:
            tenant.name = name
            tenant.name_key = name_key
            changed = True
        if dob and tenant.date_of_birth != dob:
            tenant.date_of_birth = dob
            changed = True
        if email and tenant.email != email:
            tenant.email = email
            changed = True
        if changed:
            await db.commit()
            await db.refresh(tenant)

    # Determine status from available docs
    status = None
    if tg.get("proof_of_id") or tg.get("right_to_rent"):
        status = "Verified"
    elif any([name, phone, dob]):
        status = "Pending"
    else:
        status = "Unknown"

    # Active tenancy on property?
    result = await db.execute(
        select(DBTenancy).where(DBTenancy.property_id == property_id).where(DBTenancy.end_date.is_(None))
    )
    active: Optional[DBTenancy] = result.scalars().first()

    # If changing occupant, end previous tenancy
    if active and active.tenant_id != tenant.id:
        active.end_date = datetime.now(timezone.utc)
        await db.commit()
        active = None

    # Attach or update tenancy
    if not active:
        tenancy = DBTenancy(
            tenant_id=tenant.id,
            property_id=property_id,
            start_date=datetime.now(timezone.utc),
            status=status,
            meta={
                "agreement_signed_date": tg.get("agreement_signed_date"),
                "right_to_rent": tg.get("right_to_rent"),
                "proof_of_id": tg.get("proof_of_id"),
                "emergency_contact": tg.get("emergency_contact"),
                "guarantor": tg.get("guarantor"),
            },
        )
        db.add(tenancy)
        await db.commit()
    else:
        # Update status/meta on the active tenancy
        active.status = status
        meta = active.meta or {}
        for k in ("agreement_signed_date", "right_to_rent", "proof_of_id", "emergency_contact", "guarantor"):
            v = tg.get(k)
            if v is not None:
                meta[k] = v
        active.meta = meta
        await db.commit()


# ==================== Tenancy CRUD Helpers ====================
async def get_tenancies_for_property(
    db: AsyncSession,
    property_id: int,
) -> List[TenancyWithTenantResponse]:
    result = await db.execute(
        select(DBTenancy)
        .options(selectinload(DBTenancy.tenant))
        .where(DBTenancy.property_id == property_id)
        .order_by(DBTenancy.start_date.desc(), DBTenancy.created_at.desc())
    )
    tenancies = result.scalars().all()
    responses: List[TenancyWithTenantResponse] = []
    for t in tenancies:
        tenant_resp: TenantResponse | None = None
        if t.tenant:
            tenant_resp = TenantResponse(
                id=t.tenant.id,
                user_id=t.tenant.user_id,
                name=t.tenant.name,
                email=t.tenant.email,
                phone=t.tenant.phone,
                date_of_birth=t.tenant.date_of_birth,
                employment_status=t.tenant.employment_status,
                created_at=t.tenant.created_at,
                updated_at=t.tenant.updated_at,
            )
        responses.append(
            TenancyWithTenantResponse(
                id=t.id,
                tenant_id=t.tenant_id,
                property_id=t.property_id,
                start_date=t.start_date,
                end_date=t.end_date,
                status=t.status,
                meta=t.meta or {},
                tenant=tenant_resp,
            )
        )
    return responses


async def _find_or_create_tenant(db: AsyncSession, payload: TenantCreate) -> DBTenant:
    name = (payload.name or "").strip() or None
    email = (payload.email or "").strip().lower() or None
    phone = (payload.phone or "").strip() or None
    dob = payload.date_of_birth

    # Normalize name
    def _normalize_name(name: Optional[str]) -> Optional[str]:
        if not name:
            return None
        s = re.sub(r"\s+", " ", name).strip().lower()
        s = re.sub(r"[^a-z\s]", "", s)
        return s or None

    name_key = _normalize_name(name)

    # Try email
    tenant: DBTenant | None = None
    if email:
        res = await db.execute(select(DBTenant).where(DBTenant.email == email))
        tenant = res.scalars().first()

    # Try name + dob
    if not tenant and name_key and dob:
        res = await db.execute(
            select(DBTenant).where(DBTenant.name_key == name_key, DBTenant.date_of_birth == dob)
        )
        tenant = res.scalars().first()

    # Try phone
    if not tenant and phone:
        res = await db.execute(select(DBTenant).where(DBTenant.phone == phone))
        tenant = res.scalars().first()

    # Create if not found
    if not tenant:
        tenant = DBTenant(name=name, name_key=name_key, email=email, phone=phone, date_of_birth=dob)
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)
    else:
        changed = False
        if name and tenant.name != name:
            tenant.name = name
            tenant.name_key = name_key
            changed = True
        if email and tenant.email != email:
            tenant.email = email
            changed = True
        if phone and tenant.phone != phone:
            tenant.phone = phone
            changed = True
        if dob and tenant.date_of_birth != dob:
            tenant.date_of_birth = dob
            changed = True
        if changed:
            await db.commit()
            await db.refresh(tenant)
    return tenant


async def create_property_tenancy(
    db: AsyncSession,
    property_id: int,
    payload: TenancyCreateInput,
) -> TenancyWithTenantResponse | None:
    # Resolve tenant
    tenant_id = payload.tenant_id
    tenant: DBTenant | None = None
    if not tenant_id and payload.tenant is not None:
        tenant = await _find_or_create_tenant(db, payload.tenant)
        tenant_id = tenant.id
    elif tenant_id:
        tenant = await db.get(DBTenant, tenant_id)
    if not tenant_id or not tenant:
        return None

    # End current active tenancy if occupant changes
    result = await db.execute(
        select(DBTenancy)
        .where(DBTenancy.property_id == property_id)
        .where(DBTenancy.end_date.is_(None))
    )
    active = result.scalars().first()
    if active and active.tenant_id != tenant_id:
        active.end_date = datetime.now(timezone.utc)
        await db.commit()

    status = payload.status or "Pending"
    tenancy = DBTenancy(
        tenant_id=tenant_id,
        property_id=property_id,
        start_date=payload.start_date or datetime.now(timezone.utc),
        end_date=payload.end_date,
        status=status,
        meta=payload.meta or {},
    )
    db.add(tenancy)
    await db.commit()
    await db.refresh(tenancy)

    return TenancyWithTenantResponse(
        id=tenancy.id,
        tenant_id=tenancy.tenant_id,
        property_id=tenancy.property_id,
        start_date=tenancy.start_date,
        end_date=tenancy.end_date,
        status=tenancy.status,
        meta=tenancy.meta or {},
        tenant=TenantResponse(
            id=tenant.id,
            user_id=tenant.user_id,
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            date_of_birth=tenant.date_of_birth,
            employment_status=tenant.employment_status,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at,
        ),
    )


async def update_tenancy_by_id(
    db: AsyncSession,
    tenancy_id: int,
    payload: TenancyUpdateInput,
) -> TenancyWithTenantResponse | None:
    tenancy = await db.get(DBTenancy, tenancy_id)
    if not tenancy:
        return None
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key == "meta" and value is not None:
            merged = tenancy.meta or {}
            merged.update(value)
            tenancy.meta = merged
        else:
            setattr(tenancy, key, value)
    await db.commit()
    await db.refresh(tenancy)

    # Load tenant
    res = await db.execute(
        select(DBTenant).where(DBTenant.id == tenancy.tenant_id)
    )
    tenant = res.scalars().first()
    tenant_resp: TenantResponse | None = None
    if tenant:
        tenant_resp = TenantResponse(
            id=tenant.id,
            user_id=tenant.user_id,
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            date_of_birth=tenant.date_of_birth,
            employment_status=tenant.employment_status,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at,
        )

    return TenancyWithTenantResponse(
        id=tenancy.id,
        tenant_id=tenancy.tenant_id,
        property_id=tenancy.property_id,
        start_date=tenancy.start_date,
        end_date=tenancy.end_date,
        status=tenancy.status,
        meta=tenancy.meta or {},
        tenant=tenant_resp,
    )
    
async def create_event(db: AsyncSession, event: EventCreate):
    db_event = Event(**event.model_dump())
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_events(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Event).offset(skip).limit(limit))
    return result.scalars().all()
    

async def create_payment(db: AsyncSession, payment: PaymentCreate):
    db_payment = Payment(**payment.model_dump())
    db.add(db_payment)
    await db.commit()
    await db.refresh(db_payment)
    return db_payment

async def get_payments(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Payment).offset(skip).limit(limit))
    return result.scalars().all()
    
async def create_inventory_with_rooms(db: AsyncSession, inventory_data: dict):
    # Create inventory
    inventory = Inventory(
        property_id=inventory_data["property_id"],
        property_name=inventory_data["property_name"]
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)

    # Create rooms and items
    for room_data in inventory_data.get("rooms", []):
        room = Room(room_name=room_data["room_name"], inventory_id=inventory.id)
        db.add(room)
        await db.commit()
        await db.refresh(room)

        for item_data in room_data.get("items", []):
            item = Item(room_id=room.id, **item_data)
            db.add(item)

    await db.commit()
    return inventory
    
    
async def update_inventory_with_rooms(db: AsyncSession, inventory_id: int, inventory_data: dict):
    """
    Update inventory by deleting old rooms/items and recreating from new data
    """
    # Get existing inventory
    result = await db.execute(
        select(Inventory).where(Inventory.id == inventory_id)
    )
    inventory = result.scalar()
    if not inventory:
        return None

    # Update inventory basic data
    inventory.property_name = inventory_data.get("property_name", inventory.property_name)
    await db.commit()

    # Delete all rooms and items (cascade would handle this, but explicit for clarity)
    await db.execute(
        delete(Item).where(Item.room_id.in_(
            select(Room.id).where(Room.inventory_id == inventory_id)
        ))
    )
    await db.execute(
        delete(Room).where(Room.inventory_id == inventory_id)
    )
    await db.commit()

    # Recreate rooms and items
    for room_data in inventory_data.get("rooms", []):
        room = Room(
            room_name=room_data["room_name"],
            inventory_id=inventory.id
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)

        for item_data in room_data.get("items", []):
            item = Item(
                room_id=room.id,
                name=item_data["name"],
                brand=item_data.get("brand"),
                purchase_date=item_data.get("purchase_date"),
                value=item_data.get("value"),
                condition=item_data.get("condition"),
                owner=item_data.get("owner"),
                notes=item_data.get("notes"),
                photos=item_data.get("photos", [])
            )
            db.add(item)

    await db.commit()
    return inventory
    
    
async def get_inventory(db: AsyncSession, property_id: int):
    result = await db.execute(
        select(Inventory).where(Inventory.property_id == property_id)
    )
    return result.scalars().first()
    
    
async def get_inventories(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Inventory).offset(skip).limit(limit))
    return result.scalars().all()


# ==================== Clients ====================
async def create_client(db: AsyncSession, client: ClientCreate):
    db_client = Client(name=client.name)
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    return db_client


async def get_clients(db: AsyncSession):
    result = await db.execute(select(Client))
    return result.scalars().all()


# ==================== Integration Configs ====================
async def create_integration_config(db: AsyncSession, config: IntegrationConfigCreate):
    db_config = IntegrationConfig(
        client_id=config.client_id,
        integration_type=config.integration_type,
        direction=config.direction,
        source_of_truth=config.source_of_truth,
        endpoint_url=config.endpoint_url,
        auth_type=config.auth_type,
        auth_config=config.auth_config,
        field_mappings=config.field_mappings,
        transforms=config.transforms,
        enabled=config.enabled,
    )
    db.add(db_config)
    await db.commit()
    await db.refresh(db_config)
    return db_config


# ==================== Branding Settings ====================
async def get_or_seed_brand_settings(db: AsyncSession) -> BrandSettings:
    result = await db.execute(select(BrandSettings))
    settings = result.scalars().first()
    if settings:
        return settings
    # Create with defaults from model
    settings = BrandSettings()
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return settings


async def update_brand_settings(db: AsyncSession, payload: BrandSettingsUpdate) -> BrandSettings:
    settings = await get_or_seed_brand_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings


async def get_integration_configs(db: AsyncSession, client_id: int | None = None):
    query = select(IntegrationConfig)
    if client_id is not None:
        query = query.where(IntegrationConfig.client_id == client_id)
    result = await db.execute(query)
    return result.scalars().all()


async def update_integration_config(db: AsyncSession, config_id: int, payload: IntegrationConfigUpdate):
    db_config = await db.get(IntegrationConfig, config_id)
    if not db_config:
        return None

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_config, key, value)

    await db.commit()
    await db.refresh(db_config)
    return db_config


# ==================== Inbound Import (External -> Dashboard) ====================
async def import_property_from_external(
    db: AsyncSession,
    config_id: int,
    external_id: int,
    owner_id: int,
) -> Optional[DBProperty]:
    # Find enabled integration config
    result = await db.execute(
        select(IntegrationConfig).where(
            IntegrationConfig.id == config_id,
            IntegrationConfig.enabled == True,
        )
    )
    config = result.scalars().first()
    if not config:
        return None

    adapter = get_adapter(config.integration_type)
    if not adapter:
        return None

    item = await adapter.fetch_inbound_by_id(external_id, config)
    if not item:
        return None

    canonical = await adapter.map_inbound_item(item, config)
    now = datetime.now(timezone.utc)

    # Upsert by source + source_id
    existing_q = await db.execute(
        select(DBProperty).where(
            DBProperty.source == config.integration_type,
            DBProperty.source_id == str(external_id),
        )
    )
    db_property = existing_q.scalars().first()

    if db_property:
        # Update fields if present
        for key in ("title", "content", "address", "description"):
            val = canonical.get(key)
            if val is not None:
                setattr(db_property, key, val)
        if canonical.get("acf") is not None:
            db_property.acf = canonical["acf"]
        db_property.source_last_sync_at = now
        if config.integration_type == "wordpress_acf":
            db_property.wordpress_id = external_id
        await db.commit()
        await db.refresh(db_property)
        return db_property
    else:
        db_property = DBProperty(
            title=canonical.get("title") or "Imported Property",
            content=canonical.get("content") or "Imported from external",
            address=canonical.get("address") or "Unknown",
            description=canonical.get("description") or canonical.get("content") or "Imported from external",
            owner_id=owner_id,
            acf=canonical.get("acf") or {},
            source=config.integration_type,
            source_id=str(external_id),
            source_last_sync_at=now,
            wordpress_id=external_id if config.integration_type == "wordpress_acf" else None,
            published=True,
        )
        db.add(db_property)
        await db.commit()
        await db.refresh(db_property)
        return db_property


async def bulk_import_properties_from_external(
    db: AsyncSession,
    config_id: int,
    owner_id: int,
    page: int = 1,
    per_page: int = 20,
) -> List[DBProperty]:
    # Find enabled integration config
    result = await db.execute(
        select(IntegrationConfig).where(
            IntegrationConfig.id == config_id,
            IntegrationConfig.enabled == True,
        )
    )
    config = result.scalars().first()
    if not config:
        return []

    adapter = get_adapter(config.integration_type)
    if not adapter:
        return []

    items = await adapter.fetch_inbound(config, db, page=page, per_page=per_page)
    properties: List[DBProperty] = []

    for item in items:
        external_id_any = item.get("id") or item.get("ID")
        if external_id_any is None:
            # Skip items without an external identifier
            continue
        external_id_str = str(external_id_any)
        canonical = await adapter.map_inbound_item(item, config)

        existing_q = await db.execute(
            select(DBProperty).where(
                DBProperty.source == config.integration_type,
                DBProperty.source_id == external_id_str,
            )
        )
        db_property = existing_q.scalars().first()
        now = datetime.now(timezone.utc)

        if db_property:
            for key in ("title", "content", "address", "description"):
                val = canonical.get(key)
                if val is not None:
                    setattr(db_property, key, val)
            if canonical.get("acf") is not None:
                db_property.acf = canonical["acf"]
            db_property.source_last_sync_at = now
            if config.integration_type == "wordpress_acf":
                try:
                    db_property.wordpress_id = int(external_id_str)
                except Exception:
                    db_property.wordpress_id = None
        else:
            wp_id_int: Optional[int] = None
            try:
                wp_id_int = int(external_id_str)
            except Exception:
                wp_id_int = None

            db_property = DBProperty(
                title=canonical.get("title") or "Imported Property",
                content=canonical.get("content") or "Imported from external",
                address=canonical.get("address") or "Unknown",
                description=canonical.get("description") or canonical.get("content") or "Imported from external",
                owner_id=owner_id,
                acf=canonical.get("acf") or {},
                source=config.integration_type,
                source_id=external_id_str,
                source_last_sync_at=now,
                wordpress_id=wp_id_int if config.integration_type == "wordpress_acf" else None,
                published=True,
            )
            db.add(db_property)

        properties.append(db_property)

    await db.commit()
    for p in properties:
        try:
            await db.refresh(p)
        except Exception:
            pass
    return properties


# ==================== Ingestion (Webhook push -> Dashboard) ====================
async def ingest_property_from_external_payload(
    db: AsyncSession,
    config_id: int,
    payload: Dict[str, Any],
    owner_id_fallback: int | None = None,
) -> Optional[DBProperty]:
    """Upsert a property from an external push payload using adapter mapping.

    - Finds config by id and adapter by type.
    - Extracts external id from payload (id/ID).
    - Maps to canonical fields via adapter.map_inbound_item.
    - Upserts by (source, source_id). If creating, uses provided owner or fallback.
    """
    result = await db.execute(
        select(IntegrationConfig).where(
            IntegrationConfig.id == config_id,
            IntegrationConfig.enabled == True,
        )
    )
    config = result.scalars().first()
    if not config:
        return None

    adapter = get_adapter(config.integration_type)
    if not adapter:
        return None

    external_id_any = payload.get("id") or payload.get("ID")
    if external_id_any is None:
        return None
    external_id_str = str(external_id_any)

    canonical = await adapter.map_inbound_item(payload, config)
    now = datetime.now(timezone.utc)

    existing_q = await db.execute(
        select(DBProperty).where(
            DBProperty.source == config.integration_type,
            DBProperty.source_id == external_id_str,
        )
    )
    db_property = existing_q.scalars().first()

    if db_property:
        for key in ("title", "content", "address", "description"):
            val = canonical.get(key)
            if val is not None:
                setattr(db_property, key, val)
        if canonical.get("acf") is not None:
            db_property.acf = canonical["acf"]
        db_property.source_last_sync_at = now
        if config.integration_type == "wordpress_acf":
            try:
                db_property.wordpress_id = int(external_id_str)
            except Exception:
                db_property.wordpress_id = None
        await db.commit()
        await db.refresh(db_property)
        return db_property
    else:
        # Determine owner id for new record
        owner_id = owner_id_fallback
        if owner_id is None:
            # Try to inherit from any existing property with same wordpress_id
            inherit_q = await db.execute(
                select(DBProperty).where(DBProperty.wordpress_id == cast(Integer, external_id_any))
            )
            inherit = inherit_q.scalars().first()
            if inherit:
                owner_id = inherit.owner_id
        if owner_id is None:
            # Last resort: pick first propertyadmin user
            user_q = await db.execute(
                select(DBUser).where(DBUser.role == "propertyadmin", DBUser.is_active == True)
            )
            user = user_q.scalars().first()
            if user:
                owner_id = user.id
        if owner_id is None:
            return None  # cannot create without owner

        wp_id_int: Optional[int] = None
        try:
            wp_id_int = int(external_id_str)
        except Exception:
            wp_id_int = None

        db_property = DBProperty(
            title=canonical.get("title") or "Imported Property",
            content=canonical.get("content") or "Imported from external",
            address=canonical.get("address") or "Unknown",
            description=canonical.get("description") or canonical.get("content") or "Imported from external",
            owner_id=owner_id,
            acf=canonical.get("acf") or {},
            source=config.integration_type,
            source_id=external_id_str,
            source_last_sync_at=now,
            wordpress_id=wp_id_int if config.integration_type == "wordpress_acf" else None,
            published=True,
        )
        db.add(db_property)
        await db.commit()
        await db.refresh(db_property)
        return db_property


# ==================== Dead-Letter Queue Helpers ====================
async def list_dead_letters(db: AsyncSession, resolved: Optional[bool] = None, integration_type: Optional[str] = None):
    query = select(DeadLetter)
    if resolved is not None:
        if resolved:
            query = query.where(DeadLetter.resolved_at.isnot(None))
        else:
            query = query.where(DeadLetter.resolved_at.is_(None))
    if integration_type:
        query = query.where(DeadLetter.integration_type == integration_type)
    result = await db.execute(query)
    return result.scalars().all()


async def resync_dead_letter(db: AsyncSession, dlq_id: int) -> Optional[DeadLetter]:
    dlq = await db.get(DeadLetter, dlq_id)
    if not dlq:
        return None
    adapter = get_adapter(dlq.integration_type)
    if not adapter:
        # No adapter; increment attempts
        dlq.attempt_count = (dlq.attempt_count or 0) + 1
        dlq.last_attempt_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(dlq)
        return dlq

    # Load config
    config = None
    if dlq.config_id:
        config = await db.get(IntegrationConfig, dlq.config_id)
    if not config:
        # fallback: first enabled config for type
        result = await db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.integration_type == dlq.integration_type,
                IntegrationConfig.enabled == True,
            )
        )
        config = result.scalars().first()

    if dlq.entity_type == "property" and dlq.property_id:
        db_property = await db.get(DBProperty, dlq.property_id)
        if not db_property or not config or not (config.direction in ("outbound", "bidirectional")):
            dlq.attempt_count = (dlq.attempt_count or 0) + 1
            dlq.last_attempt_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(dlq)
            return dlq

        result = await adapter.send_outbound_property(db_property, config, db)
        dlq.attempt_count = (dlq.attempt_count or 0) + 1
        dlq.last_attempt_at = datetime.now(timezone.utc)
        if result:
            dlq.resolved_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(dlq)
        return dlq

    # Unsupported entity types
    dlq.attempt_count = (dlq.attempt_count or 0) + 1
    dlq.last_attempt_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dlq)
    return dlq


