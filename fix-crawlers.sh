#!/bin/bash
# fix-crawlers.sh — Block aggressive bots and reduce outbound traffic
# Run with: sudo bash fix-crawlers.sh

set -euo pipefail

DIST_DIR="/home/dave/repos/sharpee/website/dist"
APACHE_CONF="/etc/apache2/sites-enabled/sharpee.net-le-ssl.conf"
APACHE_CONF_HTTP="/etc/apache2/sites-enabled/sharpee.net.conf"

echo "=== Sharpee Crawler Mitigation ==="
echo ""

# 1. Create robots.txt
echo "[1/4] Creating robots.txt..."
cat > "$DIST_DIR/robots.txt" << 'EOF'
# Block known aggressive crawlers
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: YandexBot
Disallow: /

User-agent: Sogou
Disallow: /

User-agent: MegaIndex
Disallow: /

# Allow legitimate search engines, restrict heavy directories
User-agent: *
Disallow: /_astro/
Disallow: /data/
Disallow: /downloads/
Disallow: /fonts/
Disallow: /web/
Disallow: /walkthrough/
Crawl-delay: 2

# Sitemap (update if you have one)
# Sitemap: https://sharpee.net/sitemap.xml
EOF
echo "  -> Created $DIST_DIR/robots.txt"

# 2. Create .htaccess with bot blocking
echo "[2/4] Creating .htaccess..."
cat > "$DIST_DIR/.htaccess" << 'EOF'
# --- Bot blocking by User-Agent ---
RewriteEngine On

# Block aggressive crawlers that ignore robots.txt
RewriteCond %{HTTP_USER_AGENT} (AhrefsBot|SemrushBot|MJ12bot|DotBot|BLEXBot|PetalBot|Bytespider|Baiduspider|YandexBot|Sogou|MegaIndex|CCBot) [NC]
RewriteRule .* - [F,L]

# --- Block known bad IP ranges ---
# Chinese cloud/datacenter crawlers
# Tencent Cloud
Require not ip 43.154.0.0/16
Require not ip 43.157.0.0/16
Require not ip 43.164.0.0/16
Require not ip 101.42.0.0/16
# Huawei Cloud crawlers
Require not ip 114.119.0.0/16
# Chinese academic (aggressive scraping)
Require not ip 202.122.0.0/16

# --- Rate limiting (requires mod_ratelimit) ---
<IfModule mod_ratelimit.c>
    # Limit bandwidth to 512KB/s per connection
    SetOutputFilter RATE_LIMIT
    SetEnv rate-limit 512
</IfModule>

# --- Disable directory listing ---
Options -Indexes

# --- Security headers ---
Header set X-Robots-Tag "noai, noimageai" env=!is_search_engine
EOF
echo "  -> Created $DIST_DIR/.htaccess"

# 3. Fix Apache config — remove Options +Indexes
echo "[3/4] Updating Apache config (removing Options +Indexes)..."
for conf in "$APACHE_CONF" "$APACHE_CONF_HTTP"; do
    if [ -f "$conf" ]; then
        if grep -q "Options +Indexes" "$conf"; then
            sed -i 's/Options +Indexes/Options -Indexes/' "$conf"
            echo "  -> Fixed $conf"
        else
            echo "  -> $conf already OK"
        fi
    fi
done

# Enable required Apache modules
echo "[4/4] Enabling Apache modules..."
a2enmod ratelimit 2>/dev/null && echo "  -> Enabled mod_ratelimit" || echo "  -> mod_ratelimit already enabled or not available"
a2enmod headers 2>/dev/null && echo "  -> Enabled mod_headers" || echo "  -> mod_headers already enabled or not available"
a2enmod rewrite 2>/dev/null && echo "  -> Enabled mod_rewrite" || echo "  -> mod_rewrite already enabled or not available"

# Test config before restart
echo ""
echo "Testing Apache config..."
if apache2ctl configtest 2>&1; then
    echo ""
    read -p "Config OK. Restart Apache now? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        systemctl restart apache2
        echo "Apache restarted."
    else
        echo "Skipped restart. Run 'sudo systemctl restart apache2' when ready."
    fi
else
    echo ""
    echo "ERROR: Apache config test failed. NOT restarting."
    echo "Fix the config and run: sudo apache2ctl configtest"
    exit 1
fi

echo ""
echo "=== Done ==="
echo "Monitor traffic with: watch -n5 'cat /proc/net/dev | grep eth0'"
echo "Check connections:    ss -tunp | grep -c ESTAB"
