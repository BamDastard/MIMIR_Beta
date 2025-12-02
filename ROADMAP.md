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
- [x] Implement user authentication system
  - [x] Google OAuth integration (primary)
  - [ ] Email/password fallback option
  - [x] Session management with JWT tokens
- [ ] Device-to-server authentication
  - [ ] API key system for trusted devices
  - [ ] Rate limiting per user/device
- [x] User profile system
  - [x] Link users to ChromaDB memory spaces
  - [x] Implement document chunking for large file support
  - [/] Per-user settings (personality intensity, voice preferences, timezone)
  - [x] User-specific calendar storage

### Infrastructure & Deployment
- [x] Docker containerization
  - [x] Dockerfile for backend (optimized for Cloud Run)
  - [x] Dockerfile for frontend
  - [x] docker-compose.yml for local development
- [x] Google Cloud Setup
  - [x] Create GCP Project
  - [x] Enable APIs (Cloud Run, Container Registry, Firestore, etc.)
  - [x] Set up IAM roles and service accounts
- [x] CI/CD Pipeline
  - [x] GitHub Actions to build and push to Artifact Registry
  - [x] Auto-deploy to Cloud Run on push to main
- [x] Database Setup
  - [x] Configure persistent storage for ChromaDB (GCS FUSE)
  - [ ] Set up Firestore for user data (optional but recommended)

### Frontend Integration
- [x] Update Frontend to consume Cloud Run API URL
- [x] Handle CORS and Authentication tokens in requests
- [x] Verify end-to-end flow (Chat -> Backend -> LLM -> Response)

### Backend Hardening
- [x] Add authentication middleware to all endpoints
- [x] Implement proper CORS configuration for production
- [x] Add request validation and sanitization
- [x] Set up logging and error monitoring
- [x] Create health check endpoint for uptime monitoring

**Deliverable**: Secure MIMIR running on Google Cloud Run, accessible via web frontend

---

## Phase 2: Mobile & Responsive UI (6-8 weeks)

### Progressive Web App (PWA)
- [x] Convert Next.js app to installable PWA
  - [x] Service worker for offline assets
  - [x] Web app manifest
  - [x] Install prompt for mobile users
- [x] Touch-optimized UI components
  - [x] Larger tap targets
  - [x] Mobile-friendly input methods
  - [x] Swipe gestures for navigation
- [x] Responsive layout overhaul
  - [x] Single-column mobile layout
  - [x] Collapsible sidebars
  - [x] Bottom navigation bar for mobile
  
### Cooking Mode Mobile Redesign
- [x] Stack layout instead of side-by-side
  - [x] Swipeable ingredient cards
  - [x] Full-screen step view
  - [x] Floating action button for navigation
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

### Sync Strategy
- [x] **Bidirectional Sync**:
  - [x] **Up-Sync**: Push local MIMIR changes to Google Calendar immediately.
  - [x] **Down-Sync**: Pull Google Calendar changes to MIMIR (on login and after local changes).
  - [x] **Initial Sync**: Populate MIMIR calendar from Google on first login.
- [x] **Integration**:
  - [x] Hook into `CalendarManager` for automatic sync triggers.
  - [x] Use existing MIMIR tools for event creation (voice/text), which will now sync to Google.

### Enhanced Calendar Features
- [ ] Event templates
- [ ] Recurring event support
- [ ] Attendee management
- [ ] Location integration with maps
- [x] Attachment support

**Deliverable**: Seamless Google Calendar integration with MIMIR as calendar assistant (Sync-based)

---

## Phase 4: 3D Avatar Implementation (Revised Strategy)

### Strategy: Open Source & Ready Player Me
Leverage the **Ready Player Me** platform for a high-quality, web-optimized avatar and **Open Source** libraries for lip-syncing to avoid recurring costs.

### 3D Model & Rendering
- [x] **Avatar Creation**:
  - [x] Use Ready Player Me (RPM) to generate the base model (free for non-commercial/indie use).
  - [x] Customize for "MIMIR" aesthetic (beard, glowing eyes via custom texture/shader if possible).
  - [x] Export as optimized GLB.
- [x] **Rendering Engine**:
  - [x] Implement `React Three Fiber` (R3F) canvas in the frontend.
  - [x] Create a reusable `<AvatarScene />` component.
  - [x] Optimize lighting and environment for the "void" aesthetic.

### Animation & Lip Sync
- [x] **Lip Sync Solution**:
  - [x] Evaluate and integrate **TalkingHead** (Open Source).
  - [x] **Mechanism**: Real-time audio analysis or TTS viseme event mapping.
  - [x] **Fallback**: Simple amplitude-based jaw movement if full visemes are too heavy.
- [x] **Animations**:
  - [x] Idle loops (breathing, looking around) from Mixamo (free).
  - [x] Speaking gestures.
  - [x] Contextual animations (Thinking, Tool Use).

### Integration
- [x] **TTS Connection**:
  - [x] Hook into the existing Text-to-Speech playback.
  - [x] Drive avatar mouth shapes from the audio stream.
- [x] **UI Placement**:
  - [x] Overlay avatar on the main video background (optional) or dedicated panel.
  - [x] Ensure performance doesn't degrade the chat experience (target 60fps).

### Avatar UI Integration
- [ ] Desktop layout
  - [x] Avatar in center/top of screen
  - [ ] Chat below or side-by-side
  - [ ] Floating head option
- [ ] Mobile layout
  - [ ] Collapsible avatar view
  - [ ] Avatar badge in corner during chat
  - [x] Full-screen avatar mode
- [ ] Interactive features
  - [ ] Eyes follow user input
  - [x] Reaction animations (thinking, speaking, listening)
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

**Last Updated**: December 1, 2024
**Document Owner**: Matt Burchett
**Status**: Living Document - Update as priorities shift

