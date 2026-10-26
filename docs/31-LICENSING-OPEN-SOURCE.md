# Licensing and Open-Source Compliance

## Principle

Umanah can confidently use open source while preserving independent Umanah IP where license boundaries legitimately allow it. Compliance is a design requirement, not paperwork added at the end.

## Chatty-EDU / AGPLv3

Chatty-EDU identifies itself as AGPLv3. If Umanah modifies an AGPL-covered program and users interact with that modified program over a network—including a school LAN—AGPL network-source obligations may apply. Distributing an appliance containing covered binaries also triggers distribution/source obligations according to the license.

### Practical posture

- Preserve notices and license text.
- Provide corresponding source where required.
- Do not strip attribution.
- Keep independent programs architecturally separable where that matches the technical design.
- Do not assume “local” means “not networked.”
- Obtain open-source counsel review before broad production/commercial posture.

## Other dependencies

Maintain a license inventory for every bundled component, model, font, icon pack, curriculum source, and dataset.

## Model licenses

Weights can have usage, redistribution, attribution, or field restrictions separate from the runtime license. Record per-model terms before bundling.

## Curriculum licenses

NonCommercial and ShareAlike rules for Harvard CS50, MIT OpenCourseWare, Khan Academy, Wikipedia and others are in `47`. NC/SA content lives in separate content packs and never ships in a commercial product.

Public availability is not permission to redistribute/adapt. Track source URL, author/institution, license, attribution text, modification permission, and version/date.

## Product UI

Provide an Open Source / Third-Party Notices area with component notices and source links where required. Attribution can be professional and unobtrusive; it need not dominate the student dashboard.

## Legal disclaimer

This engineering document is not legal advice. Final high-stakes licensing and nonprofit/commercial boundary decisions should be reviewed by qualified counsel.
