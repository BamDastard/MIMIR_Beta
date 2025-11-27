# MIMIR Product Roadmap

**Vision**: Transform MIMIR into a cross-platform, always-available AI companion with stunning visual presence and deep Google Workspace integration.

**Budget**: ~$15/month hosting target
**Timeline**: Phased approach with MVPs at each stage

> [!NOTE]
> **Parallel Development**: An Android-native version of MIMIR is being developed in parallel. See [ROADMAP_ANDROID.md](ROADMAP_ANDROID.md) for details.

---

## Core Objectives

### 1. Mobile Access (PWA/Android)
Create a mobile-first interface that connects to MIMIR's backend over the network, accessible anywhere.

### 2. Cloud Hosting
Deploy MIMIR to Google Cloud Run for a serverless, scalable, and always-available experience without managing hardware.

### 3. 3D Animated Avatar
Implement an animated 3D head of MIMIR with lip-sync to TTS playback, matching the current artistic style (glowing eyes, flowing beard, runic aesthetic).

---

## Phase 1: Foundation & Cloud Deployment (4-6 weeks)

### Authentication & Authorization
- [ ] Implement user authentication system
  - [ ] Google OAuth integration (primary)
  - [ ] Email/password fallback option
  - [ ] Session management with JWT tokens
- [ ] Device-to-server authentication
  - [ ] API key system for trusted devices
  - [ ] Rate limiting per user/device
- [ ] User profile system
  - [ ] Link users to ChromaDB memory spaces
  - [ ] Per-user settings (personality intensity, voice preferences)
  - [ ] User-specific calendar storage

### Infrastructure & Deployment
- [x] Docker containerization
  - [x] Dockerfile for backend (optimized for Cloud Run)
  - [x] Dockerfile for frontend
  - [x] docker-compose.yml for local development
- [ ] Google Cloud Setup
  - [ ] Create GCP Project
  - [ ] Enable APIs (Cloud Run, Container Registry, Firestore, etc.)
  - [ ] Set up IAM roles and service accounts
- [ ] CI/CD Pipeline
  - [ ] GitHub Actions to build and push to Artifact Registry
  - [ ] Auto-deploy to Cloud Run on push to main
- [ ] Database Setup
  - [ ] Configure persistent storage for ChromaDB (GCS backend or persistent volume)
  - [ ] Set up Firestore for user data (optional but recommended)

### Frontend Integration
- [ ] Update Frontend to consume Cloud Run API URL
- [ ] Handle CORS and Authentication tokens in requests
- [ ] Verify end-to-end flow (Chat -> Backend -> LLM -> Response)

### Backend Hardening
- [ ] Add authentication middleware to all endpoints
- [ ] Implement proper CORS configuration for production
- [ ] Add request validation and sanitization
- [ ] Set up logging and error monitoring
- [ ] Create health check endpoint for uptime monitoring

**Deliverable**: Secure MIMIR running on Google Cloud Run, accessible via web frontend

---

## Phase 2: Mobile & Responsive UI (6-8 weeks)

### Progressive Web App (PWA)
- [ ] Convert Next.js app to installable PWA
  - [ ] Service worker for offline assets
  - [ ] Web app manifest
  - [ ] Install prompt for mobile users
- [ ] Touch-optimized UI components
  - [ ] Larger tap targets
  - [ ] Mobile-friendly input methods
  - [ ] Swipe gestures for navigation
- [ ] Responsive layout overhaul
  - [ ] Single-column mobile layout
  - [ ] Collapsible sidebars
  - [ ] Bottom navigation bar for mobile
  
### Cooking Mode Mobile Redesign
- [ ] Stack layout instead of side-by-side
  - [ ] Swipeable ingredient cards
  - [ ] Full-screen step view
  - [ ] Floating action button for navigation
- [ ] Voice-first step advancement
  - [ ] "Next step" / "Previous step" voice commands
  - [ ] Hands-free mode with wake word (optional)
- [ ] Timer integration for cooking steps

### Mobile-Specific Features
- [ ] Push notifications
  - [ ] Calendar reminders
  - [ ] Cooking timer alerts
- [ ] Haptic feedback for interactions
- [ ] Share functionality (recipes, calendar events)
- [ ] Screenshot prevention for sensitive info

**Deliverable**: Fully functional PWA installable on iOS and Android

---



## Phase 3: Google Calendar Integration (3-4 weeks)

### Two-Way Sync
- [ ] Google Calendar API integration
  - [ ] OAuth consent screen setup
  - [ ] Calendar read/write permissions
  - [ ] Multi-calendar support
- [ ] Sync engine
  - [ ] Real-time webhooks from Google Calendar
  - [ ] Periodic background sync (every 5 minutes)
  - [ ] Conflict resolution strategy
  - [ ] Sync status indicator in UI
- [ ] MIMIR calendar actions
  - [ ] Create events in Google Calendar via voice/chat
  - [ ] Update existing Google events
  - [ ] Delete events from either system
  - [ ] Smart scheduling ("Find me time next week")

### Enhanced Calendar Features
- [ ] Event templates
- [ ] Recurring event support
- [ ] Attendee management
- [ ] Location integration with maps
- [ ] Attachment support

**Deliverable**: Seamless Google Calendar integration with MIMIR as calendar assistant

---

## Phase 4: 3D Avatar Implementation (8-10 weeks)

### 3D Model Creation
- [ ] Create 3D model based on attached image
  - [ ] Stylized head with flowing hair/beard
  - [ ] Glowing eyes with emission shader
  - [ ] Runic forehead symbol
  - [ ] Optimized for web (low poly count)
- [ ] Rigging for animation
  - [ ] Jaw bone for speech
  - [ ] Eye targets for gaze
  - [ ] Subtle idle animations (breathing, blinking)
- [ ] Materials & textures
  - [ ] Metallic/bronze material for face
  - [ ] Animated glow for eyes
  - [ ] Particle effects for power/wisdom aura

### Lip Sync Implementation
- [ ] Audio analysis
  - [ ] Phoneme detection from TTS audio
  - [ ] Amplitude-based jaw movement
  - [ ] Timing synchronization
- [ ] Viseme mapping
  - [ ] Map phonemes to mouth shapes
  - [ ] Smooth transitions between shapes
- [ ] Real-time rendering
  - [ ] Three.js or Babylon.js integration
  - [ ] WebGL optimization for mobile
  - [ ] LOD (Level of Detail) for performance

### Avatar UI Integration
- [ ] Desktop layout
  - [ ] Avatar in center/top of screen
  - [ ] Chat below or side-by-side
  - [ ] Floating head option
- [ ] Mobile layout
  - [ ] Collapsible avatar view
  - [ ] Avatar badge in corner during chat
  - [ ] Full-screen avatar mode
- [ ] Interactive features
  - [ ] Eyes follow user input
  - [ ] Reaction animations (thinking, speaking, listening)
  - [ ] Contextual expressions (happy, serious, confused)

**Deliverable**: Animated 3D MIMIR avatar with lip-synced speech

---

## Phase 5: Advanced Features (Ongoing)

### Voice Enhancements
- [ ] Optional wake word detection ("Hey MIMIR")
- [ ] Conversation mode improvements
  - [ ] Better silence detection
  - [ ] Context-aware listening
  - [ ] Multi-turn conversations
- [ ] Voice customization beyond current options
  - [ ] Speed, pitch, emphasis controls
  - [ ] Multiple voice profiles per user
  - [ ] Voice cloning option (ethical considerations)

### Smart Home Integration
- [ ] Home Assistant integration
- [ ] Google Home / Alexa bridge
- [ ] Device control via chat/voice
- [ ] Automation triggers from calendar
- [ ] Energy usage insights

### Desktop Application
- [ ] Electron or Tauri wrapper
- [ ] Native system tray integration
- [ ] Global hotkey for quick access
- [ ] Offline mode with local models (Ollama)
  - [ ] Privacy mode: no cloud calls
  - [ ] Fallback when internet down

### Plugin System
- [ ] Tool/skill plugin architecture
- [ ] Community plugin marketplace
- [ ] Hot-reload plugins without restart
- [ ] Sandboxed execution for security

### Proactive AI Features
- [ ] Morning briefing (weather, calendar, news)
- [ ] Smart reminders based on context
- [ ] Habit tracking and suggestions
- [ ] Learning from patterns

### Multi-Modal Input
- [ ] Image analysis in chat
- [ ] Document scanning and analysis
- [ ] Video call integration (screen share analysis)
- [ ] AR mode (future: glasses integration)

---

## Technical Debt & Quality

### Testing
- [ ] Unit tests for backend tools
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Load testing for multi-user scenarios

### Performance
- [ ] Response time monitoring
- [ ] Database query optimization
- [ ] Caching strategy for expensive operations
- [ ] CDN for static assets

### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide for setup and usage
- [ ] Developer guide for contributions
- [ ] Video tutorials

### CI/CD
- [ ] Automated testing on commits
- [ ] Automated deployment pipeline
- [ ] Rollback strategy
- [ ] Blue-green deployment for zero downtime

---

## Hosting Cost Breakdown (Target: <$15/mo)

### Google Cloud Run (Primary Strategy)
- **Frontend**: Firebase Hosting or Cloud Run (Static assets)
- **Backend**: Google Cloud Run (Containerized)
- **Database**: ChromaDB (Containerized on Cloud Run with persistent volume or GCS backend) or Firestore (for user data)
- **Cost**: Pay-per-use. Free tier is generous (2M requests/mo). Likely <$5/mo for personal use.
- **Pros**: Serverless, auto-scaling to zero (cost efficient), google ecosystem integration, professional infrastructure.
- **Cons**: Cold starts (mitigated by min instances), potential vendor lock-in.

### Self-Hosted Option (Backup)
- **Cost**: $0/month (+ electricity: ~$2-5/mo for Pi)
- **Hardware**: Raspberry Pi 5 (~$100 one-time) or repurposed PC
- **Pros**: Full control, no data leaves home, free after initial cost
- **Cons**: Requires maintenance, ISP dependent, single point of failure

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] All endpoints require authentication
- [ ] Zero exposed secrets in logs/errors
- [ ] Successful Docker deployment

### Phase 2 (Mobile)
- [ ] PWA installable on both iOS and Android
- [ ] Mobile UI is usable without zooming
- [ ] Cooking mode functional on phone

### Phase 3 (Hosting)
- [ ] 99%+ uptime over 30 days
- [ ] Accessible from external network
- [ ] SSL certificate valid and auto-renewing

### Phase 4 (Google Calendar)
- [ ] Bidirectional sync working within 5 minutes
- [ ] Zero sync conflicts over 7 days
- [ ] Can create/update events via voice

### Phase 5 (3D Avatar)
- [ ] Lip sync accuracy >80%
- [ ] 60fps on desktop, 30fps on mobile
- [ ] Avatar loads in <3 seconds

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google API rate limits | High | Implement caching, batch requests, fallback to local calendar |
| 3D performance on mobile | Medium | LOD system, option to disable 3D, 2D avatar fallback |
| Cloud Run Cold Starts | Low | Keep min instances = 1 (costs more) or optimize startup time |
| ChromaDB size growth | Low | Implement memory pruning, archival system |
| TTS API costs | Medium | Cache generated audio, use local TTS option |

---

## Open Questions

1. Should we support multiple simultaneous users on the same backend instance, or single-user-per-instance?
2. Do we want a web-based admin panel for managing users, viewing logs, etc.?
3. Should the 3D avatar be 2D animated as a fallback for low-end devices?
4. Do we want to support multiple languages eventually?
5. Should we build a companion app for wearables (smartwatch)?

---

**Last Updated**: November 26, 2024
**Document Owner**: Matt Burchett
**Status**: Living Document - Update as priorities shift

