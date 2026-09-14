# 🏋️ LIFT - Minimalist Gym Workout Tracker

A beautiful, iOS-styled Progressive Web App (PWA) for tracking your gym workouts. Built with React, TypeScript, and designed to work offline-first.

## ✨ Features

- **📊 Exercise Tracking**: Log weight and reps for each exercise
- **💪 Muscle Group Organization**: Organize exercises by muscle groups
- **📈 Progress Insights**: Track your progression over time with detailed statistics
- **📱 PWA Support**: Install on your device and use offline
- **🎨 iOS-Style Design**: Beautiful, native-feeling interface
- **🌐 i18n Support**: Spanish and English translations
- **💾 Backup/Restore**: Export and import your data as JSON
- **🎯 Smart Progression**: Tracks any variation in weight or reps as progress

## 🚀 Tech Stack

- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Vitest** - Testing Framework
- **Firebase + LocalStorage** - Data and offline draft persistence
- **Lucide React** - Icons
- **Tailwind CSS** - Styling

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lift.git
   cd lift
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Build

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with UI:

```bash
npm run test:ui
```

The suite covers domain rules, application use cases, infrastructure adapters,
UI interactions and architectural boundaries.

## 📱 Installing as PWA

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the three dots menu
3. Select "Install App"

## 📂 Project Structure

```
lift/
├── src/
│   ├── UI/                    # React components, hooks and presentation helpers
│   ├── application/           # One file for each use case
│   ├── domain/                # Entities, value types, services and external contracts
│   ├── infrastructure/        # Concrete Firebase and LocalStorage adapters
│   └── composition.ts         # Concrete adapter wiring
└── index.tsx                  # Application entry point
```

Dependencies point inward: UI calls application use cases, infrastructure
implements contracts such as `TrainingRepository`, and the composition root
injects implementations such as `FirestoreTrainingRepository`. Contracts live
directly in `domain`; their names express what can be specialized, so a separate
`ports` directory is unnecessary. Domain services own training rules and have no
framework or storage dependencies. Collection value objects such as
`ExerciseLogs` encapsulate their own transformations, while application use
cases only coordinate those objects with repositories. `src/architecture.test.ts`
enforces these boundaries.

## 🎯 Key Features Explained

### Smart Progression Tracking
The app tracks progression based on **any variation** in weight or reps:
- ✅ Increasing weight counts as progress
- ✅ Increasing reps counts as progress
- ✅ Decreasing weight counts as progress (deload cycles)
- ✅ Decreasing reps counts as progress

This ensures your training variations are properly tracked, including strategic deloads and rep PRs.

### Three Main Screens

1. **Home** 🏠
   - View muscle groups
   - Quick access to exercises
   - Log workouts

2. **Insights** 📊
   - See your 3 most recent progressions
   - Track progression timeline
   - View statistics

3. **Settings** ⚙️
   - Export workout data
   - Import from backup
   - Manage your data

### Data Storage
Training data is stored in Firestore with Firebase offline persistence. Preferences and the active workout draft use `localStorage`. You can export and import a backup in JSON.

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Tips
- Tests are in `*.test.ts` files
- Run `npm test` to verify changes
- Use `npm run dev` for hot reload during development
- Check `npm run build` before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Inspired by iOS design language
- Built with ❤️ for fitness enthusiasts

---

**LIFT** - Track your progress, crush your goals 💪
