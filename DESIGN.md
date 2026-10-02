# Space Attack design direction

Design read: a browser arcade cabinet for keyboard players, in the approved formation-shooter visual language. ENERGY 2 / RHYTHM 1 / MOTION 2. Screen layouts stay consistent; combat provides the purposeful movement.

The page is a small arcade cabinet: the playfield is the focal point, with status above and controls below. Its dark field follows the approved reference and keeps projectiles distinct. Kenney's blue ship gives the default accent its purpose; muted fleet sprites leave blue shots readable. Phosphor and Solar are alternate cabinet palettes in the tuning panel.

Use Segoe UI/system sans for readable screen controls and large compact headings; tabular numbers keep changing scores aligned. Solid surfaces and thin borders separate the arena, HUD and controls. One strong accent identifies the launch action, health meter and keyboard focus. No gradients, decorative dashboard panels or imported fonts are needed.

Gameplay motion communicates enemy movement, shots and impacts. UI screens remain still. Reduced motion removes decorative star scrolling, flame animation, particle travel and invulnerability flashing. The native tuning dialog traps focus and pauses the game; closing restores focus and leaves combat paused until the player resumes.

The canvas keeps fixed logical coordinates and scales proportionally. The cabinet fits typical desktop viewports; narrower screens stack toolbar controls and allow vertical scrolling, while keeping keyboard controls visible below the field. This is a keyboard game; touch movement is outside the approved scope.
