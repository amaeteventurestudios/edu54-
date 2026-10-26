#!/bin/bash
# restart ollama + api of the Umanah core (rootless ai-data daemon only) and wait for the warm-up
cd ~/projects/umanah-ai-lab; set -a; . /srv/ai-node/storage/ssd/umanah-ai-lab/.env.local; set +a; export UMANAH_ROOT=/srv/ai-node/storage/ssd/umanah-ai-lab
docker --context ai-data compose -p umanah -f infrastructure/compose/compose.yaml --profile core up -d --build --force-recreate ollama api 2>&1 | tail -1
T0=$(date +%s); until docker --context ai-data logs umanah-api-1 2>&1 | grep -q "models warm"; do sleep 3; [ $(( $(date +%s)-T0 )) -gt 420 ] && break; done
echo "warm after $(( $(date +%s)-T0 ))s: $(docker --context ai-data logs umanah-api-1 2>&1 | grep 'models warm' | cut -c1-90)"
docker --context ai-data exec umanah-ollama-1 ollama ps; free -m | sed -n 2p
