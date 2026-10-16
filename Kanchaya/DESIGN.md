# KanchaYA interface system

Use this guide for account, profile, and booking interfaces. Keep the existing KanchaYA identity: a grounded court green, a warm near-white canvas, clear Spanish copy, and direct actions. The visual language is based on the product's current interface tokens; it is not copied from another brand.

## Atmosphere and color roles

- Court green `#173b2d` anchors identity and large brand surfaces.
- Deep court `#102f25` is reserved for contrast within the brand mark.
- Lime `#c4e88a` is the restrained signature accent for marks and decorative court lines.
- Canvas `#f2f4ef` and white `#ffffff` keep forms calm and readable.
- Foreground `#18271f` carries primary copy; muted `#59675d` is for explanatory text.
- Use green for primary actions, red only for errors, and pale green for confirmations.
- Avoid gradients, glass effects, decorative shadows, and extra accent colors.

## Typography and spacing

- Use the app's system sans-serif stack and sentence case.
- Page titles are bold and compact; field labels remain distinct from values and hints.
- Use a consistent 8 px spacing rhythm, with larger gaps between sections than within a field.
- Keep forms to one clear column and keep explanatory copy to a readable line length.

## Controls and states

- Inputs are at least 52 px tall, have persistent labels, and use a visible 3 px focus outline.
- Buttons are at least 48 px tall. Use filled court green for the main action and muted green for secondary actions.
- Show saving state in the submit label, prevent duplicate submission, and keep cancel available until saving begins.
- Announce success and validation errors with live regions; pair color with plain-language text.
- Read-only account data should look clearly distinct from editable fields and explain restrictions.
- Use semantic labels, buttons for actions, links for navigation, and preserve keyboard focus.

## Layout and motion

- On wide screens, use the brand panel beside the form; below 1024 px, stack content in one column.
- At 560 px and below, reduce panel and form padding, allow long names and emails to wrap, and keep actions touch friendly.
- Keep data screens sparse: identity first, editable personal fields next, account metadata last.
- Limit transitions to brief color and press feedback. Respect reduced-motion preferences.

## Profile editing

- Let a signed-in person update their display name and city from their own profile.
- Keep email, role, account status, and membership date read-only on this screen.
- Return to the saved profile after success and preserve typed values after a recoverable error.
