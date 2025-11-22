import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
import hashlib
import hmac
import os

logger = logging.getLogger(__name__)

class SecurityUtils:
    """Security utilities for multi-tenant application protection"""
    
    def __init__(self):
        self.secret_key = os.getenv("SECURITY_SECRET_KEY", "your-secret-key-change-this")
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB default
        self.rate_limit_window = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 60 seconds
        self.max_requests_per_window = int(os.getenv("MAX_REQUESTS_PER_WINDOW", "100"))
        
        # Request tracking for rate limiting (in production, use Redis)
        self.request_tracker = {}
    
    def validate_request_size(self, request: Request) -> bool:
        """Validate request size to prevent DoS attacks"""
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    logger.warning(f"Request size {size} exceeds maximum {self.max_request_size}")
                    return False
            except ValueError:
                logger.warning(f"Invalid content-length header: {content_length}")
                return False
        return True
    
    def validate_subdomain_format(self, subdomain: str) -> bool:
        """Validate subdomain format to prevent injection attacks"""
        if not subdomain:
            return False
        
        # RFC 1123 compliant subdomain validation
        # - Only lowercase letters, numbers, and hyphens
        # - Cannot start or end with hyphen
        # - 1-63 characters
        subdomain_pattern = r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
        
        if not re.match(subdomain_pattern, subdomain):
            logger.warning(f"Invalid subdomain format: {subdomain}")
            return False
        
        # Additional security checks
        if len(subdomain) > 63:
            logger.warning(f"Subdomain too long: {len(subdomain)} characters")
            return False
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\.\.',  # Double dots
            r'\.\.',  # Double dots (escaped)
            r'\.$',   # Ending with dot
            r'^\.',   # Starting with dot
            r'--',    # Double hyphens
            r'-$',    # Ending with hyphen
            r'^-',    # Starting with hyphen
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, subdomain):
                logger.warning(f"Suspicious pattern in subdomain '{subdomain}': {pattern}")
                return False
        
        return True
    
    def sanitize_tenant_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize tenant data to prevent injection attacks"""
        sanitized = {}
        
        for key, value in data.items():
            # Only allow alphanumeric keys with underscores
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
                logger.warning(f"Invalid key name in tenant data: {key}")
                continue
            
            # Sanitize string values
            if isinstance(value, str):
                # Remove potential SQL injection patterns
                value = re.sub(r'[\'";\\]', '', value)
                # Limit length
                if len(value) > 1000:
                    value = value[:1000]
            
            sanitized[key] = value
        
        return sanitized
    
    def detect_sql_injection(self, value: str) -> bool:
        """Basic SQL injection detection"""
        sql_patterns = [
            r'(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|declare)\b)',
            r'(\b(or|and)\b.*=.*\b(or|and)\b)',
            r'(\bunion\b.*\bselect\b)',
            r'(\bselect\b.*\bfrom\b)',
            r'(\binsert\b.*\binto\b)',
            r'(\bdelete\b.*\bfrom\b)',
            r'(\bdrop\b.*\btable\b)',
            r'(\bexec\b.*\()',
            r'(\bscript\b.*\()',
            r'(--|#|/\*|\*/)',  # SQL comments
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {pattern}")
                return True
        
        return False
    
    def generate_request_signature(self, request: Request, tenant_id: str) -> str:
        """Generate HMAC signature for request integrity"""
        # Create signature from key request components
        signature_data = f"{request.method}:{request.url.path}:{tenant_id}:{request.headers.get('x-request-id', '')}"
        
        return hmac.new(
            self.secret_key.encode(),
            signature_data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def validate_request_signature(self, request: Request, tenant_id: str, signature: str) -> bool:
        """Validate request signature"""
        expected_signature = self.generate_request_signature(request, tenant_id)
        return hmac.compare_digest(expected_signature, signature)
    
    def check_rate_limit(self, client_ip: str, tenant_id: str) -> bool:
        """Check rate limiting for requests"""
        key = f"{client_ip}:{tenant_id}"
        now = datetime.utcnow()
        
        # Clean old entries
        cutoff = now - timedelta(seconds=self.rate_limit_window)
        self.request_tracker = {
            k: v for k, v in self.request_tracker.items()
            if v['timestamp'] > cutoff
        }
        
        # Count recent requests
        recent_requests = [
            req for req in self.request_tracker.values()
            if req['client_ip'] == client_ip and req['tenant_id'] == tenant_id
            and req['timestamp'] > cutoff
        ]
        
        if len(recent_requests) >= self.max_requests_per_window:
            logger.warning(f"Rate limit exceeded for {client_ip}:{tenant_id}")
            return False
        
        # Record this request
        self.request_tracker[key] = {
            'client_ip': client_ip,
            'tenant_id': tenant_id,
            'timestamp': now
        }
        
        return True
    
    def log_security_event(self, event_type: str, details: Dict[str, Any], tenant_id: Optional[str] = None):
        """Log security events for monitoring"""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': event_type,
            'tenant_id': tenant_id,
            'details': details
        }
        
        logger.warning(f"Security event: {event}")
    
    def validate_admin_access(self, request: Request) -> bool:
        """Validate admin access requests"""
        # Check if request is for admin endpoints
        if request.url.path.startswith('/admin'):
            # Additional validation for admin access
            admin_token = request.headers.get('X-Admin-Token')
            if not admin_token:
                self.log_security_event('admin_access_without_token', {'path': request.url.path})
                return False
            
            # Validate admin token (in production, use proper token validation)
            expected_token = os.getenv('ADMIN_TOKEN', 'admin-secret-token')
            if admin_token != expected_token:
                self.log_security_event('admin_access_invalid_token', {'path': request.url.path})
                return False
        
        return True

# Global security utilities instance
security_utils = SecurityUtils()