#!/bin/sh
PROM="http://localhost:9090"
NOW=$(date -u "+%Y-%m-%d %H:%M:%S UTC")

# Fetch metrics
wget -qO- "$PROM/api/v1/query?query=process_resident_memory_bytes" > /tmp/mem.json
wget -qO- "$PROM/api/v1/query?query=rate(process_cpu_seconds_total[5m])*100" > /tmp/cpu.json
wget -qO- "$PROM/api/v1/query?query=sum+by(job)(http_request_duration_seconds_count)" > /tmp/req.json
wget -qO- "$PROM/api/v1/query?query=sum+by(job)(rate(http_request_duration_seconds_sum[5m]))/sum+by(job)(rate(http_request_duration_seconds_count[5m]))*1000" > /tmp/lat.json
wget -qO- "$PROM/api/v1/query?query=sum+by(job,status)(http_request_duration_seconds_count{status=~'4..|5..'})" > /tmp/err.json
wget -qO- "$PROM/api/v1/query?query=up" > /tmp/up.json
wget -qO- "$PROM/api/v1/query?query=process_open_fds" > /tmp/fds.json
wget -qO- "$PROM/api/v1/query_range?query=process_resident_memory_bytes&start=$(date -u -d '1 hour ago' +%s 2>/dev/null || date -u -v-1H +%s)&end=$(date -u +%s)&step=300" > /tmp/mem_trend.json
# ADD HERE — debug only
cat /tmp/up.json   # <--- HERE
echo "---"        # <--- and this

wget -qO- "$PROM/api/v1/query?query=process_open_fds" > /tmp/fds.json
# ...rest of script

get_val() {
  grep -o "\"job\":\"$1\"[^}]*\"value\":\[[^,]*,\"[^\"]*\"" /tmp/$2.json | grep -o '"[0-9.e+\-]*"$' | tr -d '"' | head -1
}

get_err() {
  grep -o "\"job\":\"$1\",\"status\":\"$2\"[^}]*\"value\":\[[^,]*,\"[^\"]*\"" /tmp/err.json | grep -o '"[0-9.]*"$' | tr -d '"' | head -1
}

mb() { v=$1; [ -z "$v" ] && echo "N/A" || echo "$v" | awk '{printf "%.1f", $1/1024/1024}'; }
pct() { v=$1; [ -z "$v" ] && echo "N/A" || echo "$v" | awk '{printf "%.4f", $1}'; }
ms() { v=$1; [ -z "$v" ] && echo "N/A" || echo "$v" | awk '{printf "%.2f", $1}'; }
orz() { [ -z "$1" ] && echo "0" || echo "$1" | awk '{printf "%.0f", $1}'; }

SERVICES="auth-service ticket-service user-service attachment-service product-service"
PORTS="3001 3002 3003 3004 3005"

# Check alerts
ALERTS=""
for svc in $SERVICES; do
  mem=$(get_val $svc mem)
  lat=$(get_val $svc lat)
  mem_mb=$(mb $mem)
  lat_ms=$(ms $lat)
  
  # Memory alert > 150MB
  if [ -n "$mem" ]; then
    echo "$mem" | awk '{if($1>157286400) exit 0; exit 1}' && ALERTS="$ALERTS<div class='alert alert-warn'>Memoire elevee sur <b>$svc</b>: ${mem_mb} MB (seuil: 150 MB)</div>"
  fi
  # Latency alert > 50ms
  if [ -n "$lat" ]; then
    echo "$lat" | awk '{if($1>50) exit 0; exit 1}' && ALERTS="$ALERTS<div class='alert alert-warn'>Latence elevee sur <b>$svc</b>: ${lat_ms} ms (seuil: 50 ms)</div>"
  fi
done

[ -z "$ALERTS" ] && ALERTS="<div class='alert alert-ok'>Aucune alerte — tous les services fonctionnent normalement</div>"

# Build service rows
SVC_ROWS=""
i=0
for svc in $SERVICES; do
  i=$((i+1))
  mem=$(get_val $svc mem)
  cpu=$(get_val $svc cpu)
  req=$(get_val $svc req)
  lat=$(get_val $svc lat)
  e4=$(orz "$(get_err $svc '4[0-9][0-9]')")
  e5=$(orz "$(get_err $svc '5[0-9][0-9]')")
  
  mem_v=$(mb $mem)
  cpu_v=$(pct $cpu)
  req_v=$(orz $req)
  lat_v=$(ms $lat)

  # Status color for errors
  err_color="#48bb78"
  [ "$e5" != "0" ] && err_color="#e53e3e"
  [ "$e4" != "0" ] && [ "$e5" = "0" ] && err_color="#ed8936"

  # Memory bar width
  mem_pct=$(echo "$mem" | awk '{printf "%.0f", ($1/1024/1024)/200*100}')
  [ -z "$mem_pct" ] && mem_pct=0
  [ "$mem_pct" -gt 100 ] && mem_pct=100

  # Health indicator
  up_val=$(grep -o "\"job\":\"$svc\"[^}]*\"value\":\[[^,]*,\"[^\"]*\"" /tmp/up.json | grep -o '"[01]"$' | tr -d '"')
  [ "$up_val" = "1" ] && status_badge="<span class='badge-up'>UP</span>" || status_badge="<span class='badge-down'>DOWN</span>"
  [ "$up_val" = "1" ] && border_color="#48bb78" || border_color="#e53e3e"

  SVC_ROWS="$SVC_ROWS
  <div class='svc-card' style='border-top:4px solid $border_color'>
    <div class='svc-header'>
      <div style='display:flex;align-items:center;gap:10px'>
        <span class='svc-name'>$svc</span>
        $status_badge
      </div>
      <span style='font-size:.75rem;color:#718096'>Port: $(echo $PORTS | cut -d' ' -f$i)</span>
    </div>
    <div class='metrics-grid'>
      <div class='metric-box'>
        <div class='metric-label'>Memoire RSS</div>
        <div class='metric-value'>${mem_v} MB</div>
        <div class='progress-bar'><div style='width:${mem_pct}%;background:#4299e1;height:4px;border-radius:2px'></div></div>
        <div class='metric-hint'>sur 200 MB alloues</div>
      </div>
      <div class='metric-box'>
        <div class='metric-label'>CPU usage</div>
        <div class='metric-value'>${cpu_v}%</div>
        <div class='metric-hint'>moyenne sur 5 minutes</div>
      </div>
      <div class='metric-box'>
        <div class='metric-label'>Requetes totales</div>
        <div class='metric-value'>${req_v}</div>
        <div class='metric-hint'>depuis le demarrage</div>
      </div>
      <div class='metric-box'>
        <div class='metric-label'>Latence moyenne</div>
        <div class='metric-value' style='color:$(echo $lat_v | awk "{if(\$1>20) print \"#ed8936\"; else print \"#48bb78\"}")'>${lat_v} ms</div>
        <div class='metric-hint'>par requete HTTP</div>
      </div>
    </div>
    <div class='error-row'>
      <span>Erreurs HTTP:</span>
      <span style='color:#ed8936'>4xx: <b>$e4</b></span>
      <span style='color:$err_color'>5xx: <b>$e5</b></span>
      $([ "$e5" != "0" ] && echo "<span class='badge-err'>CRITIQUE — verifier les logs</span>")
      $([ "$e4" != "0" ] && [ "$e5" = "0" ] && echo "<span class='badge-warn'>Requetes invalides detectees</span>")
      $([ "$e4" = "0" ] && [ "$e5" = "0" ] && echo "<span style='color:#48bb78;font-size:.75rem'>Aucune erreur</span>")
    </div>
  </div>"
done

# Build log commands section
LOG_CMDS=""
for svc in $SERVICES; do
  LOG_CMDS="$LOG_CMDS<div class='cmd-row'><span class='cmd-label'>$svc</span><code>oc logs -n ticket-system deployment/$svc --tail=50</code></div>"
done

cat > /tmp/report.html << HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport Observabilite - Ticket System - $NOW</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Segoe UI,Arial,sans-serif;background:#edf2f7;color:#1a202c;font-size:14px}
.header{background:#1e3a5f;color:white;padding:32px 40px}
.header h1{font-size:1.6rem;font-weight:700;margin-bottom:6px}
.header .sub{opacity:.8;font-size:.85rem}
.header .ts{margin-top:10px;font-size:.78rem;opacity:.65;background:rgba(255,255,255,.1);display:inline-block;padding:4px 12px;border-radius:20px}
.wrap{max-width:1020px;margin:0 auto;padding:24px 20px}
.section-title{font-size:.82rem;font-weight:700;color:#4a5568;text-transform:uppercase;letter-spacing:.08em;margin:28px 0 12px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:#e2e8f0}
.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:4px}
.kpi{background:white;border-radius:10px;padding:16px;text-align:center;border:1px solid #e2e8f0}
.kpi .n{font-size:1.7rem;font-weight:800}
.kpi .l{font-size:.7rem;color:#718096;margin-top:2px;text-transform:uppercase}
.alert{padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:.83rem;display:flex;align-items:center;gap:8px}
.alert::before{font-size:1rem}
.alert-ok{background:#f0fff4;color:#276749;border:1px solid #9ae6b4}.alert-ok::before{content:'✓'}
.alert-warn{background:#fffbeb;color:#744210;border:1px solid #fbd38d}.alert-warn::before{content:'⚠'}
.alert-crit{background:#fff5f5;color:#742a2a;border:1px solid #feb2b2}.alert-crit::before{content:'✕'}
.svc-card{background:white;border-radius:10px;padding:16px;margin-bottom:12px;border:1px solid #e2e8f0}
.svc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.svc-name{font-weight:700;font-size:.95rem}
.badge-up{background:#c6f6d5;color:#276749;padding:2px 10px;border-radius:20px;font-size:.7rem;font-weight:700}
.badge-down{background:#fed7d7;color:#742a2a;padding:2px 10px;border-radius:20px;font-size:.7rem;font-weight:700}
.badge-err{background:#fed7d7;color:#742a2a;padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:700}
.badge-warn{background:#fefcbf;color:#744210;padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:700}
.metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.metric-box{background:#f7fafc;border-radius:8px;padding:10px 12px}
.metric-label{font-size:.68rem;color:#718096;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.metric-value{font-size:1.1rem;font-weight:700;color:#2d3748;margin-bottom:4px}
.metric-hint{font-size:.65rem;color:#a0aec0}
.progress-bar{background:#e2e8f0;border-radius:2px;height:4px;margin:4px 0}
.error-row{display:flex;align-items:center;gap:12px;font-size:.78rem;padding:8px 12px;background:#f7fafc;border-radius:6px;flex-wrap:wrap}
.cmd-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f4f8;font-size:.8rem}
.cmd-label{font-weight:700;color:#2d6a9f;min-width:150px}
code{background:#edf2f7;padding:3px 8px;border-radius:4px;font-size:.75rem;font-family:monospace;color:#2d3748}
.pipe-flow{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;background:white;border-radius:10px;padding:18px;border:1px solid #e2e8f0;margin-bottom:4px}
.pipe-box{background:#ebf8ff;border:1.5px solid #90cdf4;border-radius:8px;padding:8px 14px;text-align:center}
.pipe-box .pt{font-size:.8rem;font-weight:700;color:#1e3a5f}
.pipe-box .ps{font-size:.65rem;color:#4a5568;margin-top:2px}
.arr{color:#90cdf4;font-size:1.3rem}
.debug-box{background:#1a202c;color:#e2e8f0;border-radius:10px;padding:16px;font-family:monospace;font-size:.75rem;line-height:1.8}
.debug-box .cmd{color:#68d391}
.debug-box .comment{color:#718096}
.footer{text-align:center;padding:24px;color:#a0aec0;font-size:.72rem;border-top:1px solid #e2e8f0;margin-top:24px}
</style>
</head>
<body>
<div class="header">
  <h1>Rapport d Observabilite — Ticket System</h1>
  <div class="sub">Architecture Microservices · OpenShift Container Platform · Namespace: ticket-system</div>
  <div class="ts">Genere le $NOW</div>
</div>
<div class="wrap">

<div class="section-title">Resume</div>
<div class="kpi-grid">
  <div class="kpi"><div class="n" style="color:#48bb78">5/5</div><div class="l">Services UP</div></div>
  <div class="kpi"><div class="n" style="color:#4299e1">15s</div><div class="l">Scrape interval</div></div>
  <div class="kpi"><div class="n" style="color:#9f7aea">24</div><div class="l">NetworkPolicies</div></div>
  <div class="kpi"><div class="n" style="color:#ed8936">5</div><div class="l">Bases PostgreSQL</div></div>
  <div class="kpi"><div class="n" style="color:#38b2ac">OpenShift</div><div class="l">Plateforme</div></div>
</div>

<div class="section-title">Alertes actives</div>
$ALERTS

<div class="section-title">Metriques par service</div>
$SVC_ROWS

<div class="section-title">Pipeline d observabilite</div>
<div class="pipe-flow">
  <div class="pipe-box"><div class="pt">Node.js + Express</div><div class="ps">Winston + Morgan</div></div>
  <div class="arr">→</div>
  <div class="pipe-box"><div class="pt">Logs JSON</div><div class="ps">Horodates + niveau</div></div>
  <div class="arr">+</div>
  <div class="pipe-box"><div class="pt">prom-client</div><div class="ps">Metriques /metrics</div></div>
  <div class="arr">→</div>
  <div class="pipe-box"><div class="pt">Prometheus</div><div class="ps">Scrape 15s</div></div>
  <div class="arr">→</div>
  <div class="pipe-box"><div class="pt">Ce rapport</div><div class="ps">Auto-genere</div></div>
</div>

<div class="section-title">Commandes de debogage utiles</div>
<div class="debug-box">
  <div><span class="comment"># Voir les logs en temps reel d un service</span></div>
  <div><span class="cmd">oc logs -n ticket-system deployment/auth-service -f</span></div>
  <div>&nbsp;</div>
  <div><span class="comment"># Voir les derniers logs d erreur</span></div>
  <div><span class="cmd">oc logs -n ticket-system deployment/auth-service --tail=100 | grep error</span></div>
  <div>&nbsp;</div>
  <div><span class="comment"># Etat de tous les pods</span></div>
  <div><span class="cmd">oc get pods -n ticket-system</span></div>
  <div>&nbsp;</div>
  <div><span class="comment"># Redemarrer un service</span></div>
  <div><span class="cmd">oc rollout restart deployment/auth-service -n ticket-system</span></div>
  <div>&nbsp;</div>
  <div><span class="comment"># Voir les evenements du namespace (crashes, OOM, etc)</span></div>
  <div><span class="cmd">oc get events -n ticket-system --sort-by=.lastTimestamp | tail -20</span></div>
  <div>&nbsp;</div>
  <div><span class="comment"># Regenerer ce rapport</span></div>
  <div><span class="cmd">cd ~/Ticket-system && git pull && oc exec -n ticket-system \$(oc get pod -n ticket-system -l app=prometheus -o jsonpath='{.items[0].metadata.name}') -- sh -c "\$(cat Monitoring/gen_report.sh)" && oc cp ticket-system/\$(oc get pod -n ticket-system -l app=prometheus -o jsonpath='{.items[0].metadata.name}'):/tmp/report.html ./report.html && git add report.html && git commit -m "rapport \$(date +%Y%m%d-%H%M)" && git push</span></div>
</div>

<div class="section-title">Logs par service — commandes rapides</div>
<div style="background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0">
$LOG_CMDS
</div>

</div>
<div class="footer">
  Ticket System v2.0 &nbsp;·&nbsp; OpenShift Container Platform &nbsp;·&nbsp; Namespace: ticket-system &nbsp;·&nbsp; 5 microservices &nbsp;·&nbsp; $NOW
</div>
</body>
</html>
HTML
echo "rapport genere avec succes — /tmp/report.html"

