#!/bin/bash
# SSL Certificate Provisioning Script

set -e

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-"yourdomain.com"}
CERTBOT_EMAIL=${CERTBOT_EMAIL:-"admin@yourdomain.com"}
CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Install certbot and cloudflare plugin
install_certbot() {
    log_info "Installing certbot and Cloudflare plugin..."
    
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-dns-cloudflare
    elif command -v yum &> /dev/null; then
        yum install -y epel-release
        yum install -y certbot python3-certbot-dns-cloudflare
    else
        log_error "Unsupported package manager. Please install certbot manually."
        exit 1
    fi
}

# Create Cloudflare credentials file
create_cloudflare_credentials() {
    log_info "Creating Cloudflare credentials file..."
    
    mkdir -p /etc/letsencrypt
    
    cat > /etc/letsencrypt/cloudflare.ini << EOF
# Cloudflare API credentials for certbot
dns_cloudflare_api_token = ${CLOUDFLARE_API_KEY}
EOF
    
    chmod 600 /etc/letsencrypt/cloudflare.ini
    log_info "Cloudflare credentials file created with secure permissions"
}

# Issue admin subdomain certificate
issue_admin_certificate() {
    log_info "Issuing SSL certificate for admin.${DOMAIN_NAME}..."
    
    certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
        --dns-cloudflare-propagation-seconds 30 \
        --email "${CERTBOT_EMAIL}" \
        --agree-tos \
        --non-interactive \
        --preferred-challenges dns \
        -d "admin.${DOMAIN_NAME}"
    
    if [ $? -eq 0 ]; then
        log_info "Admin SSL certificate issued successfully"
        return 0
    else
        log_error "Failed to issue admin SSL certificate"
        return 1
    fi
}

# Issue wildcard certificate for tenant subdomains
issue_wildcard_certificate() {
    log_info "Issuing wildcard SSL certificate for *.${DOMAIN_NAME}..."
    
    certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
        --dns-cloudflare-propagation-seconds 30 \
        --email "${CERTBOT_EMAIL}" \
        --agree-tos \
        --non-interactive \
        --preferred-challenges dns \
        -d "${DOMAIN_NAME}" \
        -d "*.${DOMAIN_NAME}"
    
    if [ $? -eq 0 ]; then
        log_info "Wildcard SSL certificate issued successfully"
        return 0
    else
        log_error "Failed to issue wildcard SSL certificate"
        return 1
    fi
}

# Setup automatic renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/certbot-renew.sh << 'EOF'
#!/bin/bash
/usr/bin/certbot renew --quiet --dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini
systemctl reload nginx
EOF
    
    chmod +x /usr/local/bin/certbot-renew.sh
    
    # Add cron job for renewal
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/certbot-renew.sh") | crontab -
    
    log_info "Automatic renewal configured to run daily at 2 AM"
}

# Test nginx configuration
test_nginx() {
    log_info "Testing nginx configuration..."
    
    nginx -t
    
    if [ $? -eq 0 ]; then
        log_info "Nginx configuration is valid"
        systemctl reload nginx
        log_info "Nginx reloaded successfully"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

# Main function
main() {
    log_info "Starting SSL certificate provisioning for multi-tenant system..."
    
    # Check required environment variables
    if [[ -z "$DOMAIN_NAME" ]] || [[ -z "$CERTBOT_EMAIL" ]] || [[ -z "$CLOUDFLARE_API_KEY" ]]; then
        log_error "Missing required environment variables: DOMAIN_NAME, CERTBOT_EMAIL, CLOUDFLARE_API_KEY"
        exit 1
    fi
    
    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        install_certbot
    fi
    
    # Create Cloudflare credentials
    create_cloudflare_credentials
    
    # Issue certificates
    issue_admin_certificate
    issue_wildcard_certificate
    
    # Setup automatic renewal
    setup_renewal
    
    # Test nginx configuration
    test_nginx
    
    log_info "SSL certificate provisioning completed successfully!"
    log_info "Admin dashboard: https://admin.${DOMAIN_NAME}"
    log_info "Tenant dashboards: https://tenant-name.${DOMAIN_NAME}"
}

# Run main function
main "$@"