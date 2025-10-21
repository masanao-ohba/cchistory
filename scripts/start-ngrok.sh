#!/bin/sh
set -e

# Build ngrok command
CMD="http --domain=${NGROK_DOMAIN} --oauth google"

# Add allowed emails
if [ -n "${NGROK_OAUTH_ALLOW_EMAILS}" ]; then
  OLD_IFS="$IFS"
  IFS=','
  set -- $NGROK_OAUTH_ALLOW_EMAILS
  for email in "$@"; do
    CMD="$CMD --oauth-allow-email $email"
  done
  IFS="$OLD_IFS"
fi

# Add allowed domains
if [ -n "${NGROK_OAUTH_ALLOW_DOMAINS}" ]; then
  OLD_IFS="$IFS"
  IFS=','
  set -- $NGROK_OAUTH_ALLOW_DOMAINS
  for domain in "$@"; do
    CMD="$CMD --oauth-allow-domain $domain"
  done
  IFS="$OLD_IFS"
fi

# Add target
CMD="$CMD nginx:80"

# Execute ngrok
exec ngrok $CMD
