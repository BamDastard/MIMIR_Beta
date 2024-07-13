# MIMIR Setup Guide

This guide will help you get MIMIR up and running on your local machine.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Google Cloud Account** (for API keys)

## 1. Backend Setup

The backend handles the AI logic, memory, and tools.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Environment Variables:
   - Copy `.env.example` to `.env` in the project root (parent of `backend`):
     ```bash
     cp ../.env.example ../.env
     ```
   - Open `.env` and fill in your API keys (see [API Key Setup](#api-key-setup) below).

5. Run the server:
   ```bash
   python main.py
   ```
   The backend will start at `http://0.0.0.0:8000`.

## 2. Frontend Setup

The frontend provides the user interface.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## API Key Setup

MIMIR requires several API keys to function fully.

### Google Gemini API (Required)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create a new API Key.
3. Add it to `.env` as `GOOGLE_API_KEY`.

### Google Custom Search API (For Web Search)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Custom Search API**.
3. Create an API Key and add it to `.env` as `GOOGLE_SEARCH_API_KEY`.
4. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/).
5. Create a search engine that searches "The entire web".
6. Get the **Search Engine ID** (cx) and add it to `.env` as `GOOGLE_SEARCH_ENGINE_ID`.

### OpenWeatherMap API (For Weather)
1. Go to [OpenWeatherMap](https://openweathermap.org/).
2. Sign up and create a free API Key.
3. Add it to `.env` as `OPENWEATHER_API_KEY`.

### Google Cloud Text-to-Speech (For Voice)
1. Enable the **Text-to-Speech API** in Google Cloud Console.
2. If running locally with `gcloud auth application-default login`, it should work automatically.
3. Otherwise, create a Service Account, download the JSON key, and set `GOOGLE_APPLICATION_CREDENTIALS` in your environment or `.env`.

## Troubleshooting

- **Audio not playing?**
  - Ensure your browser allows autoplay.
  - Check if `ffmpeg` is installed (sometimes needed for audio processing libraries).
  - Verify your Google Cloud TTS credentials.

- **Memory not persisting?**
  - Check permissions for the `mimir_memory_db` directory.
