# Square activation — Steel City Integrators

The production payment layer is disabled by default. Square is the intended primary processor after account approval. Credentials remain in Google Apps Script properties and are never committed to GitHub.

## Architecture

The website asks the Apps Script backend for payment status at runtime. While PAYMENT_PROVIDER is disabled, support buttons route customers into the project-request/CRM flow. After Square is verified and activated, the same buttons create Square-hosted payment links and then return the customer to verified scheduling. No public-site rebuild is required.

Square flow:

Website service selection → Apps Script creates Square Payment Link → Square-hosted checkout → Apps Script retrieves and verifies the completed Square order → Google Calendar scheduling → Gmail confirmation/reminders → CRM and Bookings ledger

The integration uses Square's Create Payment Link endpoint and verifies the returned order through Retrieve Order. A Square order must be COMPLETED, match the server-side service catalog and use USD before scheduling opens.

Official references:
- https://developer.squareup.com/reference/square/checkout/create-payment-link
- https://developer.squareup.com/reference/square/orders-api/retrieve-order
- https://developer.squareup.com/reference/square/enums/OrderState

## Owner-dependent activation steps

1. Wait for Square to approve the Steel City Integrators account and enable production processing.
2. In the Square Developer Dashboard, create or select the Steel City application and obtain:
   - production access token
   - active production location ID
3. In Google Apps Script Project Settings, add these Script properties:
   - SQUARE_ACCESS_TOKEN
   - SQUARE_LOCATION_ID
   - SQUARE_ENVIRONMENT = production
   - PAYMENT_PROVIDER = disabled
4. Deploy the v1.3 Apps Script bundle and run upgradeSystemV13().
5. Run verifySquareConfiguration_() from the editor and confirm the location is ACTIVE. Because the token and location were added directly as Script properties, there is no need to paste them into a function call, source file, chat or deployment log.
6. Run activatePaymentProvider("square"). This performs the verification again before changing PAYMENT_PROVIDER.
7. Run runDiagnostics() and confirm payment.provider is square and payment.configured is true.
8. Complete one controlled live booking:
   - use Phone Support ($40)
   - confirm Square shows a completed $40 order
   - confirm the booking page opens only after verification
   - create the appointment
   - confirm Bookings row, Calendar event, customer email, internal email, and reminder triggers
9. Refund the controlled transaction in Square if appropriate for the test.
10. Recheck the public Support page; its buttons should now route into Square without a website code change.

## Emergency disable

Run activatePaymentProvider("disabled"). The public site automatically falls back to the CRM request flow.

## Secret-handling rules

- Never store access tokens in GitHub, static JavaScript, HTML, documentation, email, screenshots or chat.
- Keep production and sandbox credentials separate.
- Rotate exposed credentials immediately in Square.
- Do not activate a sandbox account for public customers.

