#!/bin/bash
pkill -f "mod-mono-server4" 2>/dev/null
sleep 1
rm -f /tmp/mod_mono_socket /tmp/modmono.log
exec setsid nohup /usr/bin/mod-mono-server4 \
  --applications /:/home/yasser/BSS_Project/development-demo/EesassinErp/EesassinErp \
  --filename /tmp/mod_mono_socket --nonstop \
  </dev/null >/tmp/modmono.log 2>&1 &