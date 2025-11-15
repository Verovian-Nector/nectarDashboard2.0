from typing import Dict, List, Optional
from .base import IntegrationAdapter

_registry: Dict[str, IntegrationAdapter] = {}


def register_adapter(adapter: IntegrationAdapter) -> None:
    """Register an adapter instance keyed by its `integration_type`."""
    if not adapter.integration_type:
        raise ValueError("Adapter must define a non-empty integration_type")
    _registry[adapter.integration_type] = adapter


def get_adapter(integration_type: str) -> Optional[IntegrationAdapter]:
    """Retrieve a registered adapter by type."""
    return _registry.get(integration_type)


def list_adapters() -> List[str]:
    """List available adapter types."""
    return list(_registry.keys())