import os
import subprocess
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class SSLCertificateManager:
    """Manages SSL certificates for tenant subdomains using Let's Encrypt."""
    
    def __init__(self, email: str, domain: str, cloudflare_api_key: str):
        self.email = email
        self.domain = domain
        self.cloudflare_api_key = cloudflare_api_key
    
    def issue_certificate(self, subdomain: str) -> tuple[bool, str]:
        """Issue a new SSL certificate for a subdomain."""
        full_domain = f"{subdomain}.{self.domain}"
        logger.info(f"Issuing SSL certificate for {full_domain}")
        
        try:
            # Create Cloudflare credentials file
            self._create_cloudflare_credentials()
            
            cmd = [
                "certbot", "certonly",
                "--dns-cloudflare",
                "--dns-cloudflare-credentials", "/etc/letsencrypt/cloudflare.ini",
                "--dns-cloudflare-propagation-seconds", "30",
                "--email", self.email,
                "--agree-tos",
                "--non-interactive",
                "--preferred-challenges", "dns",
                "-d", full_domain
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"SSL certificate issued successfully for {full_domain}")
                return True, "Certificate issued successfully"
            else:
                logger.error(f"Failed to issue certificate for {full_domain}: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            logger.error("Certificate issuance timed out")
            return False, "Certificate issuance timed out"
        except Exception as e:
            logger.error(f"Error issuing certificate: {str(e)}")
            return False, str(e)
    
    def issue_wildcard_certificate(self) -> tuple[bool, str]:
        """Issue a wildcard certificate for all tenant subdomains."""
        wildcard_domain = f"*.{self.domain}"
        logger.info(f"Issuing wildcard SSL certificate for {wildcard_domain}")
        
        try:
            # Create Cloudflare credentials file
            self._create_cloudflare_credentials()
            
            cmd = [
                "certbot", "certonly",
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
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"Wildcard SSL certificate issued successfully for {wildcard_domain}")
                return True, "Wildcard certificate issued successfully"
            else:
                logger.error(f"Failed to issue wildcard certificate: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            logger.error("Wildcard certificate issuance timed out")
            return False, "Wildcard certificate issuance timed out"
        except Exception as e:
            logger.error(f"Error issuing wildcard certificate: {str(e)}")
            return False, str(e)
    
    def renew_certificate(self, subdomain: str) -> tuple[bool, str]:
        """Renew an existing SSL certificate."""
        full_domain = f"{subdomain}.{self.domain}"
        logger.info(f"Renewing SSL certificate for {full_domain}")
        
        try:
            # Create Cloudflare credentials file
            self._create_cloudflare_credentials()
            
            cmd = [
                "certbot", "renew",
                "--dns-cloudflare",
                "--dns-cloudflare-credentials", "/etc/letsencrypt/cloudflare.ini",
                "--dns-cloudflare-propagation-seconds", "30",
                "--non-interactive",
                "--cert-name", full_domain
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"SSL certificate renewed successfully for {full_domain}")
                return True, "Certificate renewed successfully"
            else:
                logger.error(f"Failed to renew certificate for {full_domain}: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            logger.error("Certificate renewal timed out")
            return False, "Certificate renewal timed out"
        except Exception as e:
            logger.error(f"Error renewing certificate: {str(e)}")
            return False, str(e)
    
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
                result = subprocess.run(
                    ["openssl", "x509", "-enddate", "-noout", "-in", cert_path],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    expiry_str = result.stdout.strip().split("=", 1)[1]
                    expiry_date = datetime.strptime(expiry_str, "%b %d %H:%M:%S %Y %Z")
                    status["expiry_date"] = expiry_date.isoformat()
                    status["days_until_expiry"] = (expiry_date - datetime.now()).days
                    status["needs_renewal"] = status["days_until_expiry"] <= 30
                    
            except Exception as e:
                logger.error(f"Error getting certificate info: {str(e)}")
        
        return status
    
    def _create_cloudflare_credentials(self) -> bool:
        """Create Cloudflare credentials file for certbot."""
        try:
            os.makedirs("/etc/letsencrypt", exist_ok=True)
            
            ini_content = f"dns_cloudflare_api_token = {self.cloudflare_api_key}\n"
            
            with open("/etc/letsencrypt/cloudflare.ini", "w") as f:
                f.write(ini_content)
            
            # Set restrictive permissions
            os.chmod("/etc/letsencrypt/cloudflare.ini", 0o600)
            
            logger.info("Cloudflare credentials file created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create Cloudflare credentials file: {str(e)}")
            return False

def create_ssl_certificate_manager() -> Optional[SSLCertificateManager]:
    """Create an SSL certificate manager instance from environment variables."""
    email = os.getenv('CERTBOT_EMAIL')
    domain = os.getenv('DOMAIN_NAME')
    api_key = os.getenv('CLOUDFLARE_API_KEY')
    
    if not all([email, domain, api_key]):
        logger.warning("Missing SSL certificate manager environment variables")
        return None
    
    return SSLCertificateManager(email, domain, api_key)