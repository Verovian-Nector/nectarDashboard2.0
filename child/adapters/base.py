from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

# Import for type hints only; avoid heavy usage to prevent cycles
try:
    from database import DBProperty, IntegrationConfig  # type: ignore
except Exception:
    DBProperty = object  # fallback for type hints in isolated contexts
    IntegrationConfig = object


class IntegrationAdapter:
    """
    Base interface for external integration adapters.

    Adapters should implement outbound (to external) and/or inbound (from external)
    flows, depending on their configured direction. The registry will look them up
    by `integration_type`.
    """

    integration_type: str = ""
    direction: str = "outbound"  # 'inbound' | 'outbound' | 'bidirectional'

    async def prepare_outbound_property(
        self,
        property_obj: "DBProperty",
        config: "IntegrationConfig",
    ) -> Dict[str, Any]:
        """Map an internal property to the external payload shape."""
        raise NotImplementedError

    async def send_outbound_property(
        self,
        property_obj: "DBProperty",
        config: "IntegrationConfig",
        db: AsyncSession,
    ) -> Optional[Dict[str, Any]]:
        """Send the prepared payload to the external system (create/update)."""
        raise NotImplementedError

    async def fetch_inbound(
        self,
        config: "IntegrationConfig",
        db: AsyncSession,
        page: Optional[int] = None,
        per_page: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch inbound records from the external system (if supported)."""
        return []

    async def fetch_inbound_by_id(
        self,
        external_id: int,
        config: "IntegrationConfig",
    ) -> Optional[Dict[str, Any]]:
        """Fetch a single inbound record by external identifier (if supported)."""
        return None

    async def map_inbound_item(
        self,
        item: Dict[str, Any],
        config: "IntegrationConfig",
    ) -> Dict[str, Any]:
        """Map a single inbound item into canonical property dict for creation/update."""
        return item