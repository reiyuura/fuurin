<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Fuurin no Class design contract

The website feels like opening an old Japanese memory album on a spring afternoon: nostalgic, warm, calm, elegant, emotionally comforting. Never use SaaS dashboard or black-and-white corporate aesthetics.

- Washi paper background is dominant: `#FAF7F3`; never pure white as page background.
- Sakura is accent only, not dominant: primary `#C87C8D`, hover `#FFF1F4`.
- Surface: `#FFFFFF`; text: `#2F3542`; border: `#E9E2DA`.
- Matcha secondary: `#7A9E7E`; rare gold accent: `#D9A441`; info `#5D86C5`; error `#D75A5A`.
- Hero gradient: `linear-gradient(135deg, #FAF7F3, #FFF7F8, #F7F5F2)`.
- Use only soft warm shadows, e.g. `shadow-lg shadow-pink-100/20`; no black shadow.
- Radius: card `24px`, button `16px`, input `14px`, avatar full-pill.
- Glass: `rgba(255,255,255,.6)` plus `backdrop-filter: blur(20px)`.
- Dark palette stays warm: bg `#1F2023`, card `#2A2D31`, primary `#D89AA8`, secondary `#9BB89D`, accent `#E5C56A`, text `#F4F2EE`.
- Visual references: sakura petals, washi paper, wooden classroom floors, matcha tea, sunset light, wind chimes.

