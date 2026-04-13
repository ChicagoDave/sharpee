# demos.sharpee.net

Playable Sharpee demos served from the Ubuntu server via Apache2.

## Architecture

```
demos.sharpee.net
├── /                  → Landing page (mockup.html)
├── /dungeo/           → Dungeo browser build
├── /cloak/            → Cloak of Darkness browser build
└── /zoo/              → Family Zoo browser build (future)
```

Each demo is a self-contained static bundle produced by `./build.sh -s {story} -c browser`.
The output lands in `dist/web/{story}/` and contains:
- `index.html` — entry point
- `game.js` — bundled game engine + story
- `styles.css` — browser client styles
- `audio/` — sound assets (if any)

No backend required. Apache serves static files.

## Apache Setup

### 1. DNS

Add a CNAME or A record for `demos.sharpee.net` pointing to the Ubuntu server.

### 2. VirtualHost

```apache
<VirtualHost *:80>
    ServerName demos.sharpee.net
    DocumentRoot /var/www/demos.sharpee.net

    <Directory /var/www/demos.sharpee.net>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Cache static assets
    <FilesMatch "\.(js|css|woff2?|png|jpg|svg)$">
        Header set Cache-Control "public, max-age=86400"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/demos-sharpee-error.log
    CustomLog ${APACHE_LOG_DIR}/demos-sharpee-access.log combined
</VirtualHost>
```

### 3. SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d demos.sharpee.net
```

### 4. Directory Structure on Server

```bash
sudo mkdir -p /var/www/demos.sharpee.net/{dungeo,cloak,zoo}
```

### 5. Deploy a Demo

From the dev machine after building:
```bash
./build.sh -s dungeo -c browser
rsync -avz --delete dist/web/dungeo/ user@server:/var/www/demos.sharpee.net/dungeo/
```

The landing page (`index.html` at the root) is deployed separately:
```bash
scp docs/work/demos/mockup.html user@server:/var/www/demos.sharpee.net/index.html
```

## Design Notes

- Matches main site's visual language: dark default, champagne gold (`#f2d280`) accent, system font stack
- Simpler layout than main site — no sidebar, just a header bar with links back to sharpee.net
- Card-based grid for demos with ASCII art previews, description, author, and play button
- Each card links to `/{story}/` which serves the browser build's `index.html`
- Tags indicate status: "In Progress", "Complete", "Tutorial"
- Responsive: single-column on mobile
- Theme toggle shares localStorage key with main site (`sharpee-theme`)

## Files

- `mockup.html` — self-contained mockup (open in browser to preview)
- `README.md` — this file
