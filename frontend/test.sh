#!/bin/bash
timeout 8 curl -N http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"test","stage":"perception"}' 2>&1
