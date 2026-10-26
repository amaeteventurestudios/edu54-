# ai.umanah.org — VPS nginx (owner runs these; the agent's account on the VPS has no sudo)

Route: `Internet → ai.umanah.org (DNS → 2.29.28.125) → nginx on the VPS → Tailscale (100.127.44.118) → ai-node-01:8130`.

> ai-node-01 serves the web on **8130**, not the default 8100: HUNGREE Goat already holds 127.0.0.1:8100 and rootless Docker claims the loopback port too (docs/40-DECISION-LOG.md). A school box uses 8100.
The VPS is already on the tailnet as `umanah-dataroom` (100.99.107.27). Nothing else on the VPS is changed: one new site file, one static folder.
Files in this repo: `infrastructure/vps/`. If sudo on the VPS becomes available to the agent, it can run these itself.

## 1. Copy the files (from ai-node-01)
```bash
scp ~/projects/umanah-ai-lab/infrastructure/vps/ai.umanah.org.http.conf ~/projects/umanah-ai-lab/infrastructure/vps/ai.umanah.org.conf you@2.29.28.125:/tmp/
scp -r ~/projects/umanah-ai-lab/infrastructure/vps/ai-resting you@2.29.28.125:/tmp/
```

## 2. On the VPS (as a sudo user)
```bash
sudo mkdir -p /var/www/ai-resting && sudo cp /tmp/ai-resting/index.html /var/www/ai-resting/index.html
# certificate first, over plain HTTP
sudo cp /tmp/ai.umanah.org.http.conf /etc/nginx/sites-available/ai.umanah.org
sudo ln -sf /etc/nginx/sites-available/ai.umanah.org /etc/nginx/sites-enabled/ai.umanah.org
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/html -d ai.umanah.org      # existing certbot account; no other site is touched
# then the real site
sudo cp /tmp/ai.umanah.org.conf /etc/nginx/sites-available/ai.umanah.org
sudo nginx -t && sudo systemctl reload nginx
```
Roll back: `sudo rm /etc/nginx/sites-enabled/ai.umanah.org && sudo nginx -t && sudo systemctl reload nginx`.

## 3. Verify
```bash
curl -sI https://ai.umanah.org/ | head -3                      # 200 when the stack runs; 502/503 -> the "resting" page body below
curl -s https://ai.umanah.org/ | grep -o "demo is resting"     # when ai-node-01's stack is stopped
curl -s -o /dev/null -w '%{http_code}\n' https://ai.umanah.org/api/safety/alerts   # 404 (never exposed publicly)
```
On ai-node-01: `umanah-lab start core` makes `:8130` answer on the Tailscale address; `umanah-lab stop` brings the resting page back.

## Rules kept
Never a Tailscale `100.x` address in public DNS · SSH is never exposed · Moodle/Kolibri/Kiwix/JupyterHub/Open WebUI are never routed here · Safety Alerts are blocked on the public host.
