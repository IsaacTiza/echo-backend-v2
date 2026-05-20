# Echo Backend

The backend API for Echo — an AI-powered study assistant that helps students understand complex notes through explanations, flashcards, and quizzes.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** Google OAuth 2.0 + JWT
- **File Storage:** Cloudinary
- **AI:** Google Gemini 1.5 Flash (via Google Generative AI SDK)
- **File Parsing:** Mammoth (DOCX)
- **Deployment:** Render

## Features

- Google OAuth 2.0 authentication with JWT issued as Bearer token
- Note creation supporting text, PDF, DOCX, TXT and image formats
- File upload to Cloudinary with text extraction for DOCX and TXT
- AI-powered note explanation with five tone options
- AI-generated MCQ quizzes with configurable question count
- AI-generated flashcards
- Targeted re-explanation for failed quiz topics
- Daily AI credit system (10 requests per user, resets at midnight)
- Credits only deducted on successful AI responses
- Note download with original filename preserved

## Project Structure

```
echo-backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   ├── passport.js        # Google OAuth strategy
│   │   └── cloudinary.js      # Cloudinary configuration
│   ├── controllers/
│   │   ├── authController.js  # OAuth callbacks, JWT, logout
│   │   ├── noteController.js  # Note CRUD and file upload
│   │   └── aiController.js    # AI endpoint handlers
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── rateLimiter.js     # Daily AI credit system
│   │   └── upload.js          # Multer file validation
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Note.js            # Note schema
│   ├── routes/
│   │   ├── authRoutes.js      # Auth endpoints
│   │   ├── noteRoutes.js      # Note endpoints
│   │   └── aiRoutes.js        # AI endpoints
│   └── utils/
│       └── gemini.js          # Gemini AI prompt functions
└── server.js                  # Express app entry point
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout and clear token |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all user notes |
| GET | `/api/notes/:id` | Get single note |
| POST | `/api/notes` | Create note (multipart/form-data) |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/notes/:id/download` | Download original note file |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/explain/:noteId` | Generate explanation |
| POST | `/api/ai/quiz/:noteId` | Generate MCQ quiz |
| POST | `/api/ai/flashcards/:noteId` | Generate flashcards |
| POST | `/api/ai/explain-failed/:noteId` | Explain failed quiz topics |

## Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=your_frontend_url
BACKEND_URL=your_backend_url
NODE_ENV=production

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_gemini_api_key
```

## Getting Started

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start
```

## Supported File Types

| Format | Extension | AI Processing |
|--------|-----------|---------------|
| Text | .txt | Text extracted directly |
| Word | .docx | Text extracted via Mammoth |
| PDF | .pdf | Sent to Gemini as base64 |
| Image | .jpg .png .webp | Sent to Gemini as base64 |

Maximum file size: **10MB**

## Daily AI Credit System

Each user gets 10 AI requests per day. Credits reset at midnight. Credits are only deducted when the AI returns a successful response — failed requests do not consume credits.
