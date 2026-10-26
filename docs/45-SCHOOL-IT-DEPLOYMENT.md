# School IT Deployment

> Facts: `00-START-HERE.md`. Operations lifecycle: `29-DEPLOYMENT-OPERATIONS.md`. Remote support: `22-REMOTE-MANAGEMENT.md`.

## Why this exists

A box that works on our bench can still fail at a school: networks block device-to-device traffic, content filters block unknown addresses, Chromebooks are locked to approved sites, and IT staff may not allow unknown hardware on the network. This doc is the plan for getting a working connection on day one.

## Connection options

| Option | How | Best for |
|---|---|---|
| **A. Join the school network** | Ethernet to a school switch; IT gives it a fixed address (DHCP reservation) | schools with IT staff who approve it |
| **B. Own classroom Wi-Fi** | appliance plus a dedicated access point makes a small private network; students join it | libraries, community centers, schools where A is blocked |
| **C. Direct Ethernet** | small switch in the room | labs with wired desktops |

Every deployment records which option it uses. Option B must be ready as a fallback in the install kit.

## Name and HTTPS

Browsers restrict some features (offline app caching, clipboard, microphone later) on plain `http://` addresses and warn on self-signed certificates. Plan:

1. **Per-site name under umanah.org.** Each appliance gets a name like `demo-academy.lab.umanah.org` whose public DNS record points to the appliance's **private** school address. A real certificate is issued by DNS challenge (no inbound internet needed). The certificate must renew periodically, which needs internet now and then; the appliance renews early and warns the school admin well before expiry.
2. **Fallback: school-managed certificate.** Schools that manage Chromebooks centrally can push a Umanah-issued certificate authority to their devices, plus a local DNS entry.
3. Some DNS filters refuse answers that point to private addresses. Test this during the site check and use the local DNS entry if so.

Do not rely on `.local` names; they are unreliable on managed Chromebooks and school networks.

## What IT will be asked (one-page network sheet)

- **Inbound on the local network only:** TCP 443 to the appliance.
- **Outbound to internet (optional, for updates and support):** TCP 443 to Umanah update and support endpoints; the private support overlay (Tailscale uses UDP 41641 when allowed and falls back to TCP 443).
- **Nothing inbound from the internet.** No port forwarding, no public SSH.
- **Allowlist:** the appliance's hostname in the web filter and in the Chromebook allowed-URL policy.
- **Power:** one outlet, plus a small UPS.
- **Data:** student data stays on the appliance; see the privacy summary.

## Physical setup

- Locked or supervised location; ventilated; off the floor.
- Small UPS; appliance set to start automatically after a power failure (macOS setting "Start up automatically after a power failure"; BIOS equivalent on PCs).
- Full-disk encryption on (FileVault on Mac, LUKS on Linux), so a stolen box does not expose student data.
- Asset tag and serial recorded.

## Accounts on shared devices

- Local accounts are primary, so login works offline.
- Teachers create class rosters by CSV import or by hand.
- Younger students: class code + picture or short PIN login, set by the teacher.
- School SSO (Google, Microsoft) is a later option and must never be the only way to log in, because it needs internet.

## Site check before install (remote or visit)

1. Which connection option; get IT contact.
2. Test from a real student device: can it reach a test address on the appliance's network segment?
3. DNS test for private-address answers.
4. Web filter and Chromebook policy allowlist in place.
5. Power, UPS, location.
6. Designated safety contact named (`41`).

## Install day checklist

Appliance reachable from 3 student devices · HTTPS name works without warnings · teacher account created · roster loaded · safety contact configured and a test alert acknowledged · internet unplugged test passes · support overlay connected (if the school allows) · deployment report printed and signed.
