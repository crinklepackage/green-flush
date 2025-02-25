#!/bin/bash

# Simple script to check for stalled summaries every 30 minutes
# Usage: nohup ./run-timeout-check.sh &

WAVENOTES_ROOT=$(dirname "$(dirname "$(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")")")
LOG_DIR="/var/log/wavenotes"

# Create log directory if it doesn't exist
mkdir -p $LOG_DIR

echo "Starting timeout check loop. Logs will be written to $LOG_DIR/timeouts.log"
echo "Started at $(date)" >> $LOG_DIR/timeouts.log

while true; do
  echo "Running timeout check at $(date)" >> $LOG_DIR/timeouts.log
  cd $WAVENOTES_ROOT && yarn workspace @wavenotes-new/api check-timeouts >> $LOG_DIR/timeouts.log 2>&1
  echo "Sleeping for 30 minutes..." >> $LOG_DIR/timeouts.log
  sleep 1800  # 30 minutes in seconds
done 