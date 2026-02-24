# The Commune

## Concept

A turn-based tactical management game set in a modern-day satirical world. You run a commune — an apartment building where society's misfits from every end of the spectrum end up living together. They disagree about everything, but unite against common enemies: the 1%, corrupt officials, and religious extremists.

Inspired by **Lale Savascilari (Tulip Warriors, 1994)** — a Turkish RPG where everyday people fight with slippers, insults, and slang in a comedic modern-day setting.

## Tone

- Comedy. Everyone is a caricature. Nobody is the "correct" one.
- The game makes fun of all archetypes equally.
- Absurdity IS the tone — nobody questions why a slipper is a weapon, just like nobody questions Kiryu fighting with a bicycle in Yakuza.
- Dark humor, satire, social commentary through comedy.

## Setting

- Modern-day city (not post-apocalyptic, not specifically Istanbul — generic modern urban)
- The world is a caricature of real life, not realistic
- The commune is a rundown apartment building where people who fell through the cracks end up

## Core Loop

1. **Manage the commune** — rooms, facilities, finances, residents, relationships
2. **Problems arrive** — corporate goons, corrupt inspectors, predatory landlords, religious zealots, gentrifiers
3. **Deploy your crew** in turn-based tactical social combat
4. **Deal with consequences** — win or lose, things change
5. **Recruit new residents, handle internal drama, upgrade the building**

---

## Combat System

### Inspiration
- **Into the Breach** for simplicity and tactical depth on a small grid
- **Tulip Warriors** for tone — everyday items as weapons, insults as spells
- **Monkey Island insult sword fighting** for the social/verbal combat flavor

### Mechanics
- Turn-based tactical combat, small grid, small squads
- Characters have a **Resolve bar** (not HP) — break it and they're out (convinced, intimidated, fled, embarrassed)
- "Arguments" function as spells/abilities:
  - **Single-target**: personal attacks, direct persuasion, exposing lies
  - **AoE**: inspiring speeches, intimidating displays, sowing doubt
  - **Tactical**: turning enemies against each other, redirecting blame
- Boss battles may be 1v1 intense standoffs
- Battles are SHORT — like Into the Breach, not drawn-out wars

### Visualization
- **Isometric 2D** (preferred art style)
- **Static sprites** — no frame-by-frame animation
- All "animation" done via code: tweens, screen shake, flash effects, damage numbers, speech bubbles
- Slay the Spire approach: static art + VFX + tweens = enough visual feedback

---

## Character Classes (All Modern Archetypes)

Each class is a real-world caricature whose annoying traits become combat abilities.

| Class | Combat Style | Example Abilities |
|-------|-------------|-------------------|
| **Conspiracy Theorist** | AoE confusion/sanity damage | "The earth is flat and here's why...", mass confusion |
| **Vegan** | Self-righteous guilt damage, DoT | "Self-righteous pseudo-psychology!", won't shut up passive |
| **Karen** | Single-target resolve destroyer | "I WILL speak to whoever's in charge", "Call Corporate" ultimate |
| **Ex-Lawyer** | Boring but devastating, sleep + fine print | "Per subsection 7.3...", puts enemies to sleep |
| **Influencer** | Peer pressure AoE, recruitment | "This has terrible vibes", recruit via "exposure" |
| **Doomsday Preacher** | Massive morale damage (he was right) | "I TOLD you this would happen", righteous fury buff |
| **Therapist** | Gets inside heads, turns enemies on each other | "And how does that make you *feel*?" |

More classes to design. Could include: Retired Military, Jaded Teacher, Tech Bro, MLM Mom, Aging Hippie, Gym Bro, Amateur DJ, Armchair Politician, etc.

---

## Management Layer

### The Building (Your Base)
- Rooms for residents (upgradeable)
- Communal facilities: kitchen, common room, rooftop, basement
- Upgrades improve resident morale, unlock abilities, generate resources
- The building itself is under threat (eviction, demolition, gentrification)

### Residents (Your Roster)
- Come and go — recruitment and departure is natural
- Each has stats, personality, relationships with other residents
- Wildly incompatible people forced to coexist = drama = content
- Internal conflicts are a management challenge (conspiracy theorist thinks therapist is a government plant)
- Long-term attachment: watch someone arrive as a nobody and become your MVP

### Resources
- Money (everyone chips in... theoretically)
- Reputation / influence in the neighborhood
- Morale (internal cohesion)
- Favors / alliances with other groups

### Enemies / Mission Sources
- Billionaire developers trying to bulldoze the block
- Corrupt city officials / inspectors
- Predatory landlords
- Religious extremists recruiting in the neighborhood
- Corporate chains killing local businesses
- Rival groups / other factions
- A rich person could even be living in the commune, fighting against their own class

---

## Art Pipeline

### Style
- Hand-drawn caricatures — simple, distinctive, personality over polish
- The "rough" amateur style fits the comedy tone perfectly
- References: West of Loathing, Rimworld, Undertale — distinctive > polished

### Character Art Pipeline
1. Hand-draw 20-25 caricatures with CONSISTENT style (same line weight, proportions, coloring)
2. Train a style LoRA (Flux/SDXL) on these drawings
3. Use the LoRA to generate additional characters, expressions, variations
4. Training tips:
   - Draw characters at similar angles (3/4 or front-facing)
   - White/transparent backgrounds in training images
   - Same tools for all drawings (pen thickness, coloring method)
   - Variety in CHARACTERS (body types, ages) but not in STYLE

### Other Assets
- **Backgrounds**: AI-generated (Flux/SDXL), no LoRA needed, just match the color palette
- **Combat sprites**: Simpler versions of character art, static (no animation frames)
- **Combat VFX**: All code-driven — tweens, particles, screen shake, speech bubbles
- **UI elements**: Standard design work

### Animation Approach
- NO frame-by-frame animation
- NO sprite sheets
- Static sprites + code-driven motion (Godot tweens):
  - Slide forward for attack
  - Flash red on hit
  - Screen shake on impact
  - Damage numbers as particles
  - Idle = gentle sine wave hover
  - Death = fade + collapse tween
- Wan 2.2 potentially useful for any video/trailer content later

---

## Tech Stack

- **Engine**: Godot (2D, isometric)
- **Language**: GDScript (Python-like, AI writes it well)
- **Art**: Hand-drawn + LoRA-generated + AI backgrounds
- **Animation**: Code-driven tweens, no sprite animation

---

## v0.1 — Minimum Viable Game

The absolute smallest playable version to test if the core loop is fun:

- [ ] One commune screen (static background, list of residents)
- [ ] 3-4 starting characters with basic stats
- [ ] One combat encounter on a small isometric grid
- [ ] Basic combat: move, use 1-2 abilities per character, resolve bars
- [ ] One enemy type
- [ ] Win/lose condition
- [ ] Placeholder art is fine — test the FEEL first

---

## Key Design Decisions Still Open

- Exact grid size and combat complexity
- How many characters per side in a typical battle
- Detailed class ability design and balancing
- What specific management mechanics exist between battles
- Progression system (how does the commune grow over time?)
- Story structure: linear campaign vs. emergent sandbox vs. hybrid
- Specific enemy faction design
- Whether there's an overarching narrative or purely emergent

---

## Ideas We Explored and Rejected

| Idea | Why It Was Rejected |
|------|-------------------|
| Football Manager clone | Match engine is impossible — spatial simulation of 22 agents |
| Racing Team Manager | User wasn't excited about the theme |
| Colony Survival (Rimworld-like) | Harder than FM — AI storytelling, pathfinding, needs simulation |
| Hospital/School/Space sims | All need graphics/spatial simulation (basically Theme Hospital) |
| Football Agent game | Gameplay loop too thin — just clicking through narrative events |
| Record Label manager | Too unambitious (Game Dev Story route) |
| RPG Guild Manager | Basically Darkest Dungeon, already exists |
| Post-apocalyptic setting | Doesn't explain why they fight with words instead of guns |
| Pre-apocalyptic setting | "Building a community when old ones still stand" doesn't make sense |
| Pure text-commentary football | Lack of even 2D match view kills appeal |
| Modern political campaign | Doesn't fit with multiple classes on same team |
| Modern neighborhood factions | Too wide scope, faction alignment problem |

## Why The Commune Works

1. **Forces incompatible archetypes together** — a commune takes whoever shows up
2. **Social combat is natural** — it's modern civilization, the tone justifies absurdity
3. **Management layer is clear** — run a building, manage people, handle resources
4. **Not ideological** — you're fighting for your community's survival, all sides welcome
5. **Enemies are universal** — the 1% and extremists unite everyone
6. **Scalable** — start with one building, grow influence in the city
7. **Characters have lifecycles** — people arrive, grow, have drama, leave
8. **The comedy IS the identity** — every class is a joke people already get
