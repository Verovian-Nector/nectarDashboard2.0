from .registry import register_adapter, get_adapter, list_adapters
from .base import IntegrationAdapter

__all__ = [
    "IntegrationAdapter",
    "register_adapter",
    "get_adapter",
    "list_adapters",
]

# Ensure adapters are registered on package import
from . import wordpress