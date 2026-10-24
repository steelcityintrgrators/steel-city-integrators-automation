# GatherBeam Remote Operations Standard

## Purpose
This standard governs the founding-pilot workflow for GatherBeam Remote Ready qualification, Remote Technician sessions, Managed Support, and Onsite escalation.

## Operating sequence
DIAGNOSE → QUALIFY → AUTHORIZE → SNAPSHOT → CONNECT → ADJUST → VERIFY → DOCUMENT → MONITOR → ESCALATE.

## Remote Ready classification
A church is classified only after a technician reviews the environment.

### REMOTE READY
Use when:
- reliable internet and local network are documented;
- target devices are supported and reachable through an approved secure access path;
- an authorized church representative can approve access;
- technician identity and MFA are enforced;
- pre-change state can be captured where practical;
- rollback is possible or the change risk is otherwise acceptable;
- no direct public exposure or shared-password workaround is required.

### REMOTE READY WITH MODIFICATIONS
Use when the environment can qualify after limited remediation such as:
- dedicated support computer or gateway;
- managed switch or firewall configuration;
- documented IP plan;
- supported remote-management software;
- firmware/software standardization;
- backup/export procedure;
- secure outbound tunnel.

### PARTIALLY REMOTE
Use when some systems can be managed remotely but physical or inaccessible components still require onsite work.

### ONSITE REQUIRED
Use when safe remote access is unavailable or the work inherently requires physical intervention.

## Approved remote-access architecture
GatherBeam uses a layered access model rather than one universal remote-desktop product.

1. Identity layer
   - named technician identity;
   - MFA;
   - role-based access;
   - tenant assignment.

2. Session authorization layer
   - church;
   - campus;
   - room/system;
   - ticket;
   - approved device set;
   - approved work scope;
   - access window;
   - customer approver.

3. Secure transport layer
   - outbound zero-trust tunnel or approved managed remote-access agent;
   - no inbound public port-forwarding;
   - no shared generic passwords.

4. Control layer
   - manufacturer-native control software where available;
   - remote desktop only when needed;
   - network-level access limited to approved segments/devices.

5. Audit layer
   - session start/end;
   - technician identity;
   - devices accessed;
   - configuration before/after;
   - changes;
   - verification result;
   - rollback event if any.

## Session gate
A technician must not connect unless ALL are true:
- ticket exists;
- customer authorization exists;
- church/system identity is verified;
- Remote Ready status is valid;
- assigned technician is authenticated;
- approved devices/scope are documented;
- access window is active;
- pre-change snapshot requirement is satisfied or explicitly documented as unavailable.

## Change control
Before material changes, capture an export, show file, scene, DSP file, profile, screenshot, configuration export, camera preset state, network configuration, or equivalent baseline where practical.

After changes:
- verify intended behavior;
- record test performed;
- record customer-observed outcome when available;
- document rollback path;
- close access when session ends.

## Prohibited practices
- direct exposure of church devices to the public internet solely for GatherBeam access;
- sending credentials by email, text, or intake form;
- shared technician accounts;
- bypassing MFA;
- unauthorized firmware updates;
- undocumented production changes;
- technician access to a second church merely because the technician is already connected to GatherBeam.

## Vendor selection gate
Before production remote control is enabled, the selected stack must be verified for:
- MFA/SSO;
- RBAC;
- tenant isolation;
- just-in-time or revocable access;
- audit events;
- session expiration;
- unattended access controls;
- API/automation support;
- device inventory;
- remote desktop capability when required;
- network-level access without inbound exposure;
- support for customer-owned systems;
- commercial terms that scale with technicians and managed endpoints.

The provider choice remains replaceable behind the GatherBeam Access control plane.

## Data model
Each service record is attached to:
Customer → Campus → Room → System → Device → Ticket → Session → Change → Result.

Required service-session fields:
- customer_id
- campus_id
- room_id
- system_id
- ticket_id
- session_id
- technician_id
- approver_name
- authorization_timestamp
- access_start
- access_end
- approved_devices
- approved_scope
- pre_change_artifact
- changes
- verification_test
- verification_result
- rollback_performed
- customer_summary
- follow_up
- escalation_type

## Onsite escalation
Escalate when:
- remote access cannot be established safely;
- physical installation/cabling/replacement is required;
- rigging/mounting/electrical coordination is required;
- network hardware must be physically changed;
- diagnostics remain inconclusive after reasonable remote work;
- customer specifically requests onsite work.

## Travel-cost model
Do not publish a flat nationwide travel price.

Onsite quote = technician labor + travel labor + transportation + lodging + local transportation + parking/tolls + per diem + shipping/freight + special tools + additional technicians + after-hours/overtime + approved contingency.

Use the assigned technician's actual origin, not an assumed national origin.

### Service categories
Local: drive-in service with normal same-day travel.
Regional: extended drive that may require travel labor, lodging, or per diem.
Fly-in: airfare plus ground transport, lodging, per diem, travel-day labor, onsite labor, and reasonable contingency.

Thresholds remain operating hypotheses until GatherBeam has enough completed jobs to calibrate them.

## Initial fulfillment
Steel City Integrators LLC may fulfill Alabama/regional onsite work when appropriate. GatherBeam should retain the customer relationship, scope, documentation, quality standard, and support history.

## Pilot metrics
Track:
- Health Check → Remote Ready conversion
- Health Check → Remote Technician conversion
- remote session duration
- time to resolution
- technical success
- customer satisfaction
- equipment compatibility
- access friction
- recurring support interest
- onsite escalation rate
- founder hours per customer
- technician labor cost
- gross margin by service type

## Commercial rule
SELL → DELIVER MANUALLY → DOCUMENT → STANDARDIZE → AUTOMATE → PRODUCTIZE.

Do not build a proprietary remote-control stack before repeated paid sessions prove what the control plane must automate.
