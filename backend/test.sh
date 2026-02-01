#!/bin/bash
curl -s http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"粤A12345的车突然不走，发动机听起来好像有异响","stage":"perception"}' \
  --max-time 15
