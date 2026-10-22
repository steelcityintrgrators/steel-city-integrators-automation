# Security Policy

## Supported version
Only the current production branch and the latest published release are supported.

## Report a vulnerability
Email **steelcityintegrators@gmail.com** with the subject `SECURITY REPORT`. Do not post credentials, customer records, access tokens, private URLs, or exploit details in a public issue.

Include:
- affected page, file, or workflow;
- steps to reproduce;
- potential impact;
- screenshots with personal information removed.

## Data rules
This repository must never contain:
- passwords, API keys, OAuth tokens, private keys, or production `.env` files;
- customer consultation responses, phone numbers, emails, payment data, or recordings;
- Google service-account files or exported authentication data;
- unencrypted database or CRM exports;
- AMW Family Trust, custody, court, or nonprofit records.

Production secrets belong only in the authorized deployment secret store. Revoke and rotate any exposed credential immediately.
