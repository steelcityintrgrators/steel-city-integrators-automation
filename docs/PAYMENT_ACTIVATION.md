# Payment activation

Square is the intended primary processor for Release 1.3. The provider layer remains disabled until Square approves the account and the owner completes a controlled live test.

See SQUARE_ACTIVATION.md for the production workflow.

The repository also retains an optional legacy Stripe adapter so working components are not destroyed. Stripe is not selected by default and must not be activated without a verified account and explicit owner decision.

Public marketing does not center payment-first language. When payment applies, it is handled inside the reservation or proposal workflow. No credentials belong in GitHub.

