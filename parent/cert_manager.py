#!/usr/bin/env python3
"""
SSL Certificate Management for Multi-Tenant System
Integrates with Let's Encrypt and Cloudflare DNS for automated certificate provisioning
"""

import os
import subprocess
import logging
import json
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CertificateManager:
    """Manages SSL certificates for tenant subdomains using Let's Encrypt."""
    
    def __init__(self, email: str, domain: str, cloudflare_api_key: str):
        self.email = email
        self.domain = domain
        self.cloudflare_api_key = cloudflare_api_key
        self.certbot_path = "/usr/bin/certbot" if os.path.exists("/usr/bin/certbot") else "certbot"
    
    def _run_command(self, cmd: list, timeout: int = 300) -> Tuple[bool, str]:
        """Run a command and return success status and output."""
        try:
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=timeout,
                env={**os.environ, 'CF_API_KEY': self.cloudflare_api_key}
            )
            
            if result.returncode == 0:
                logger.info("Command executed successfully")
                return True, result.stdout
            else:
                logger.error(f"Command failed: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            logger.error("Command timed out")
            return False, "Command timed out"
        except Exception as e:
            logger.error(f"Error running command: {str(e)}")
            return False, str(e)
    
    def _create_cloudflare_credentials(self) -> bool:
        """Create Cloudflare credentials file for certbot."""
        try:
            os.makedirs("/etc/letsencrypt", exist_ok=True)
            
            ini_content = f"dns_cloudflare_api_token = {self.cloudflare_api_key}\n"
            
            credentials_path = "/etc/letsencrypt/cloudflare.ini"
            with open(credentials_path, "w") as f:
                f.write(ini_content)
            
            # Set restrictive permissions (owner read/write only)
            os.chmod(credentials_path, 0o600)
            
            logger.info("Cloudflare credentials file created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create Cloudflare credentials file: {str(e)}")
            return False
    
    def issue_certificate(self, subdomain: str) -> Tuple[bool, str]:
        """Issue a new SSL certificate for a subdomain."""
        full_domain = f"{subdomain}.{self.domain}"
        logger.info(f"Issuing SSL certificate for {full_domain}")
        
        # Create Cloudflare credentials
        if not self._create_cloudflare_credentials():
            return False, "Failed to create Cloudflare credentials"
        
        # Issue certificate using DNS challenge
        cmd = [
            self.certbot_path, "certonly",
            "--dns-cloudflare",
            "--dns-cloudflare-credentials", "/etc/letsencrypt/cloudflare.ini",
            "--dns-cloudflare-propagation-seconds", "30",
            "--email", self.email,
            "--agree-tos",
            "--non-interactive",
            "--preferred-challenges", "dns",
            "-d", full_domain
        ]
        
        success, output = self._run_command(cmd)
        
        if success:
            logger.info(f"SSL certificate issued successfully for {full_domain}")
            return True, "Certificate issued successfully"
        else:
            logger.error(f"Failed to issue certificate for {full_domain}: {output}")
            return False, output
    
    def issue_wildcard_certificate(self) -> Tuple[bool, str]:
        """Issue a wildcard certificate for all tenant subdomains."""
        wildcard_domain = f"*.{self.domain}"
        logger.info(f"Issuing wildcard SSL certificate for {wildcard_domain}")
        
        # Create Cloudflare credentials
        if not self._create_cloudflare_credentials():
            return False, "Failed to create Cloudflare credentials"
        
        # Issue wildcard certificate
        cmd = [
            self.certbot_path, "certonly",
            "--dns-cloudflare",
            "--dns-cloudflare-credentials", "/etc/letsencrypt/cloudflare.ini",
            "--dns-cloudflare-propagation-seconds", "30",
            "--email", self.email,
            "--agree-tos",
            "--non-interactive",
            "--preferred-challenges", "dns",
            "-d", self.domain,  # Base domain
            "-d", wildcard_domain  # Wildcard subdomain
        ]
        
        success, output = self._run_command(cmd)
        
        if success:
            logger.info(f"Wildcard SSL certificate issued successfully for {wildcard_domain}")
            return True, "Wildcard certificate issued successfully"
        else:
            logger.error(f"Failed to issue wildcard certificate: {output}")
            return False, output
    
    def renew_certificate(self, subdomain: str) -> Tuple[bool, str]:
        """Renew an existing SSL certificate."""
        full_domain = f"{subdomain}.{self.domain}"
        logger.info(f"Renewing SSL certificate for {full_domain}")
        
        # Create Cloudflare credentials
        if not self._create_cloudflare_credentials():
            return False, "Failed to create Cloudflare credentials"
        
        # Renew certificate
        cmd = [
            self.certbot_path, "renew",
            "--dns-cloudflare",
            "--dns-cloudflare-credentials", "/etc/letsencrypt/cloudflare.ini",
            "--dns-cloudflare-propagation-seconds", "30",
            "--non-interactive",
            "--cert-name", full_domain
        ]
        
        success, output = self._run_command(cmd)
        
        if success:
            logger.info(f"SSL certificate renewed successfully for {full_domain}")
            return True, "Certificate renewed successfully"
        else:
            logger.error(f"Failed to renew certificate for {full_domain}: {output}")
            return False, output
    
    def get_certificate_status(self, subdomain: str) -> Dict[str, Any]:
        """Get the status of an SSL certificate for a subdomain."""
        full_domain = f"{subdomain}.{self.domain}"
        cert_path = f"/etc/letsencrypt/live/{full_domain}/cert.pem"
        
        status = {
            "domain": full_domain,
            "exists": os.path.exists(cert_path),
            "needs_renewal": False,
            "expiry_date": None,
            "days_until_expiry": None
        }
        
        if status["exists"]:
            try:
                # Get certificate expiry date
                cmd = ["openssl", "x509", "-enddate", "-noout", "-in", cert_path]
                success, output = self._run_command(cmd, timeout=30)
                
                if success:
                    expiry_str = output.strip().split("=", 1)[1]
                    expiry_date = datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
                    status["expiry_date"] = expiry_date.isoformat()
                    status["days_until_expiry"] = (expiry_date - datetime.now()).days
                    status["needs_renewal"] = status["days_until_expiry"] <= 30
                    
            except Exception as e:
                logger.error(f"Error getting certificate info: {str(e)}")
        
        return status
    
    def revoke_certificate(self, subdomain: str) -> Tuple[bool, str]:
        """Revoke an SSL certificate."""
        full_domain = f"{subdomain}.{self.domain}"
        logger.info(f"Revoking SSL certificate for {full_domain}")
        
        # Check if certificate exists
        cert_path = f"/etc/letsencrypt/live/{full_domain}/cert.pem"
        if not os.path.exists(cert_path):
            logger.info(f"Certificate does not exist for {full_domain}")
            return True, "Certificate does not exist"
        
        # Revoke certificate
        cmd = [
            self.certbot_path, "revoke",
            "--non-interactive",
            "--cert-name", full_domain
        ]
        
        success, output = self._run_command(cmd)
        
        if success:
            logger.info(f"SSL certificate revoked successfully for {full_domain}")
            return True, "Certificate revoked successfully"
        else:
            logger.error(f"Failed to revoke certificate for {full_domain}: {output}")
            return False, output

def create_certificate_manager() -> Optional[CertificateManager]:
    """Create a certificate manager instance from environment variables."""
    email = os.getenv('CERTBOT_EMAIL')
    domain = os.getenv('DOMAIN_NAME')
    api_key = os.getenv('CLOUDFLARE_API_KEY')
    
    if not all([email, domain, api_key]):
        logger.warning("Missing SSL certificate manager environment variables")
        return None
    
    return CertificateManager(email, domain, api_key)

def main():
    """Main function for testing certificate management."""
    manager = create_certificate_manager()
    
    if not manager:
        logger.error("Failed to create certificate manager")
        return
    
    # Test certificate status
    status = manager.get_certificate_status("admin")
    print(f"Certificate status: {json.dumps(status, indent=2)}")
    
    # Issue wildcard certificate for all tenants
    success, message = manager.issue_wildcard_certificate()
    if success:
        logger.info(f"Wildcard certificate issued: {message}")
    else:
        logger.error(f"Failed to issue wildcard certificate: {message}")

if __name__ == "__main__":
    main()