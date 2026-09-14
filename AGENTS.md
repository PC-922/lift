# Custom Instructions for AI Development (agents.md)

## 🎯 Project Profile: PWA (React 19 + Vite)
This project is a PWA focused on **absolute simplicity** and **human maintainability**. The code must be boring, predictable, and robust.

**Tech Stack:**
- **Framework:** React 19 (Hooks, Suspense, Native APIs).
- **Language:** TypeScript (Strict Mode).
- **Styling:** Tailwind CSS (Utility-first, no unnecessary abstractions).
- **Testing:** Vitest + React Testing Library.
- **Persistence:** LocalStorage (Offline-first strategy).
- **Icons:** Lucide React.

---

## 🛠️ Development Principles

### 1. Simplicity and Maintainability (KISS)
- **Simple Solutions:** Do not install external dependencies if it can be solved with native Web APIs or a simple Hook.
- **Readable Code:** Code should explain the "what" by itself. Comments should explain the "why".
- **Comment Policy:**
  - **Remove** any comment that narrates what the code does (section labels, inline code descriptions, JSX block labels like `{/* Header */}` or `// Form State`).
  - **Keep** only comments that document a non-obvious decision that cannot be inferred from the code itself (e.g. a counterintuitive direction mapping, an HTML constraint workaround, a performance trade-off).
  - **Language:** All surviving comments must be in English.
  - When in doubt, delete the comment — if the code needs a comment to be understood, refactor the code first.
- **Small Components:** Maximum 100-150 lines per file. If it grows, split following SOLID principles.

### 2. Clean Architecture & SOLID
- **S (Single Responsibility):** One component = One visual function. One Hook = One state logic.
- **O/P (Open/Closed):** Prefer component composition (`children`) over complex conditionals.
- **D (Dependency Inversion):** LocalStorage services must be injectable or easily mockable in tests.
- **Folder Structure:**
  - `/src/components`: Pure UI and composition.
  - `/src/hooks`: Business logic and persistence.
  - `/src/services`: Pure utilities and LocalStorage adapters.
  - `/src/types`: TypeScript definitions.

### 3. Strict TypeScript
- Usage of `any` is strictly prohibited.
- Define interfaces for all Props and "storage" responses.
- Use `Readonly` for states that should not be directly mutated.

### 4. Mobile-First Responsive Design
- **Primary Target:** Design and validate every screen first in a portrait mobile viewport. Use both a compact viewport (375×667) and a modern viewport (390×844) for layout checks.
- **Critical Actions:** Titles, inputs, primary actions, navigation, and feedback must remain visible or reachable without overlap, clipping, or collapsed scroll areas.
- **Viewport Behavior:** Full-screen, fixed, and sticky interfaces must account for dynamic viewport height, virtual keyboards, and safe-area insets.
- **Responsive Tests:** UI changes that affect layout must include an integration test rendered with a mobile viewport. Manually inspect the affected flow in a real browser-sized mobile viewport when visual layout changes.
- **Larger Screens:** Tablet and desktop layouts must remain usable and readable. Responsive enhancements must not compromise the mobile experience.

---

## 🧪 Testing Strategy (Vitest)
**Golden Rule:** Code without tests does not exist. Every feature requires:
1. **Unit Tests:** For logic in `/services` and `/hooks`.
2. **Integration Tests:** For components in `/components` simulating real user interactions.
3. **Mocking:** Mock LocalStorage only when necessary to validate quota failures or parsing errors.
4. **Responsive Coverage:** Component layout changes require at least one mobile viewport test. Verify compact mobile first, then confirm the same flow remains usable at desktop width.

---

## 🤖 AI Response Protocol
For every requested task, the response must follow this order:
1. **Proposal:** Brief technical explanation of the solution.
2. **Types:** Definition of necessary interfaces.
3. **Logic:** Implementation of Service or Custom Hook (with LocalStorage error handling).
4. **UI:** React component using direct Tailwind classes.
5. **Tests:** Complete `.test.tsx` file using Vitest covering the happy path and one edge case.
6. **Maintenance Note:** Why this solution is the simplest and most maintainable
