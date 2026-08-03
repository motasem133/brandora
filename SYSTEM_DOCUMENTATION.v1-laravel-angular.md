# Enigmatic Launchpad AI — Full System Documentation

> **This design was never built.** It is the superseded v1 specification,
> retained because the current system's design decisions are arguments against
> the alternatives written down here. Nothing described below ever ran, and
> there is no data, customer or Stripe subscription anywhere in it. The system
> that exists is documented in `SYSTEM_DOCUMENTATION.md`.

> **Platform**: AI-powered SaaS for brand identity generation  
> **Domain**: https://lab.enigmitic.com  
> **Stack**: Angular 18 (Frontend) + Laravel 11 (Backend API) + MySQL + OpenAI + Stripe

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Backend API Documentation](#4-backend-api-documentation)
5. [Frontend Documentation](#5-frontend-documentation)
6. [Authentication Flow](#6-authentication-flow)
7. [AI Generation Engine](#7-ai-generation-engine)
8. [Payment & Billing](#8-payment--billing)
9. [Admin Panel](#9-admin-panel)
10. [Deployment Guide](#10-deployment-guide)
11. [Environment Variables](#11-environment-variables)
12. [Error Handling](#12-error-handling)

---

## 1. System Overview

Enigmatic Launchpad AI is a SaaS platform that lets entrepreneurs and businesses generate a complete brand identity using AI in under 60 seconds.

### What It Does

| Feature | Description |
|---|---|
| **AI Branding** | Generates business names, slogans, color palettes, fonts, brand story, logo concepts |
| **Website Builder** | Creates multi-page website with editable content and live preview |
| **Social Media Kit** | Produces 9 Instagram posts, bios, stories, hashtags, and ad copy |
| **Multi-language** | Full English and Arabic (RTL) support |
| **Payments** | Stripe subscription billing with 4 plans |
| **Admin Panel** | User management, plan management, analytics dashboard |

### User Journey

```
Landing Page → Register/Login → Onboarding Wizard (8 steps)
→ Project Created → Click "Generate" → AI runs (~30-60s)
→ View Branding / Website / Social tabs → Edit / Publish / Download
```

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                      │
│              Angular 18 SPA (lab.enigmitic.com)          │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS REST API calls
                      │ /api/*
┌─────────────────────▼───────────────────────────────────┐
│              Laravel 11 API Backend                      │
│            (lab.enigmitic.com/api)                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │Projects  │  │ Billing  │  │ Admin  │  │
│  │Controller│  │Controller│  │Controller│  │  API   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐  │
│  │                   MySQL Database                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │  OpenAI API  │  │  Stripe   │  │ Google OAuth API │  │
│  │  (GPT-4o +   │  │  Payments │  │                 │  │
│  │   DALL-E 3)  │  │           │  │                 │  │
│  └──────────────┘  └───────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
src/app/
├── app.component.ts          ← Root: sets theme, language, loads user
├── app.config.ts             ← Providers: router, http, translate
├── app.routes.ts             ← Lazy-loaded route definitions
│
├── core/
│   ├── guards/               ← authGuard, guestGuard, adminGuard
│   ├── interceptors/         ← JWT injection, 401 handling
│   └── services/             ← AuthService, ProjectService
│
└── features/
    ├── landing/              ← Public marketing page
    ├── auth/                 ← Login, Register, Forgot/Reset, Google callback
    ├── onboarding/           ← 8-step project wizard
    ├── dashboard/            ← Sidebar layout + overview
    ├── projects/             ← Project list + project detail (tabs)
    ├── website-builder/      ← Live drag-and-edit website editor
    ├── billing/              ← Plans + Stripe checkout + invoices
    ├── settings/             ← Profile, password, appearance
    └── admin/                ← Analytics, users, plans, projects
```

### Backend Architecture

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   ├── AuthController.php       ← JWT auth, Google OAuth
│   │   │   ├── ProjectController.php    ← CRUD + AI generation trigger
│   │   │   ├── BillingController.php    ← Stripe checkout + webhooks
│   │   │   └── UserController.php       ← Profile, password, delete
│   │   └── Admin/
│   │       └── AdminController.php      ← Admin analytics + management
│   ├── Middleware/
│   │   ├── AdminMiddleware.php          ← Role check: admin only
│   │   └── CorsMiddleware.php           ← Cross-origin headers
│   └── Requests/
│       ├── RegisterRequest.php          ← Validation rules
│       └── LoginRequest.php
│
├── Models/
│   ├── User.php              ← JWT subject, plan/subscription helpers
│   ├── Project.php           ← Core project with onboarding data
│   ├── Plan.php              ← Subscription plan definition
│   ├── Subscription.php      ← User ↔ Plan relationship
│   ├── BrandingAsset.php     ← AI-generated branding data
│   ├── WebsiteAsset.php      ← AI-generated website content
│   ├── SocialMediaAsset.php  ← AI-generated social content
│   ├── GeneratedFile.php     ← Downloadable assets
│   └── Invoice.php           ← Payment history
│
├── Policies/
│   └── ProjectPolicy.php     ← User can only access own projects
│
└── Services/
    └── AIGeneratorService.php ← Core OpenAI + DALL-E integration
```

---

## 3. Database Schema

### Entity Relationship Diagram

```
users (1) ──────────── (many) subscriptions
  │                              │
  │                             (1)
  │                            plans
  │
  ├─── (many) projects
  │              │
  │              ├─── (1) branding_assets
  │              ├─── (1) website_assets
  │              ├─── (1) social_media_assets
  │              └─── (many) generated_files
  │
  └─── (many) invoices
```

### Table Definitions

#### `users`
| Column | Type | Description |
|---|---|---|
| id | bigint PK | Primary key |
| name | varchar(255) | Full name |
| email | varchar(255) UNIQUE | Email address |
| password | varchar(255) nullable | Hashed password (null for Google users) |
| google_id | varchar(255) nullable | Google OAuth ID |
| avatar | varchar(255) nullable | Profile picture URL |
| locale | varchar(5) | Language: `en` or `ar` |
| role | enum | `user` or `admin` |
| status | enum | `active`, `suspended`, `pending` |
| stripe_customer_id | varchar nullable | Stripe customer reference |
| created_at | timestamp | |
| deleted_at | timestamp nullable | Soft delete |

#### `plans`
| Column | Type | Description |
|---|---|---|
| id | bigint PK | |
| name | varchar | e.g. "Pro" |
| slug | varchar UNIQUE | e.g. "pro" |
| price | decimal(10,2) | Monthly price in USD |
| stripe_price_id | varchar nullable | Stripe price ID |
| generations_limit | int | -1 = unlimited |
| website_builder | boolean | Feature flag |
| social_media_kit | boolean | Feature flag |
| custom_domain | boolean | Feature flag |
| priority_support | boolean | Feature flag |
| features | json | Array of feature strings for display |

#### `subscriptions`
| Column | Type | Description |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| plan_id | FK → plans | |
| stripe_subscription_id | varchar nullable | |
| status | enum | `active`, `canceled`, `past_due`, `trialing` |
| current_period_start | timestamp | |
| current_period_end | timestamp | |
| canceled_at | timestamp nullable | |

#### `projects`
| Column | Type | Description |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | |
| title | varchar | Project display name |
| business_name | varchar nullable | Optional name hint for AI |
| industry | varchar | e.g. "Technology" |
| country | varchar | e.g. "United Arab Emirates" |
| target_audience | text | Audience description |
| brand_style | varchar | `luxury`, `modern`, `playful`, `minimal`, `arabic`, `corporate` |
| preferred_colors | json | Array of hex color strings |
| needs_website | boolean | |
| needs_social_media | boolean | |
| language | varchar | `en` or `ar` |
| status | enum | `draft`, `generating`, `completed`, `failed` |

#### `branding_assets`
| Column | Type | Description |
|---|---|---|
| project_id | FK → projects | |
| business_name_ideas | json | Array of 5 name suggestions |
| logo_concepts | json | Array of DALL-E image URLs |
| slogan | varchar | Generated tagline |
| brand_story | text | 2-3 paragraph story |
| color_palette | json | `{primary, secondary, accent, background, text}` |
| font_recommendations | json | `{heading, body, accent}` |
| brand_values | json | Array of value strings |
| brand_voice | text | Tone description |

#### `website_assets`
| Column | Type | Description |
|---|---|---|
| project_id | FK → projects | |
| template | varchar | `modern`, `minimal`, `luxury` |
| pages | json | `{home, about, services, contact}` content |
| custom_styles | json | `{primary_color, secondary_color, font_heading, font_body}` |
| is_published | boolean | |
| subdomain | varchar nullable UNIQUE | e.g. "my-brand" → my-brand.enigmatic-launchpad.com |
| published_at | timestamp nullable | |

#### `social_media_assets`
| Column | Type | Description |
|---|---|---|
| project_id | FK → projects | |
| instagram_bio | text | 150-char bio |
| instagram_posts | json | Array of 9 `{type, caption, hashtags}` |
| story_templates | json | Array of 3 story objects |
| ad_copy | json | `{headline, body, cta, facebook_ad, google_ad}` |
| hashtags | json | Array of 10 hashtag strings |

---

## 4. Backend API Documentation

### Base URL
```
https://lab.enigmitic.com/api
```

### Authentication
All protected routes require a JWT Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

### Auth Endpoints

#### `POST /auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "locale": "en"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "John Smith", "email": "john@example.com", "role": "user" },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGci...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

---

#### `POST /auth/login`
Authenticate and receive a JWT token.

**Request Body:**
```json
{ "email": "john@example.com", "password": "password123" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "John Smith", "subscription": { "plan": { "name": "Pro" } } },
    "token": "eyJ0eXAiOiJKV1Qi...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Error `401`:**
```json
{ "success": false, "message": "Invalid credentials." }
```

---

#### `POST /auth/logout` 🔒
Invalidate the current JWT token.

**Response `200`:**
```json
{ "success": true, "message": "Logged out." }
```

---

#### `GET /auth/me` 🔒
Get the authenticated user's profile with subscription.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1, "name": "John", "email": "john@example.com",
      "role": "user", "locale": "en",
      "subscription": { "status": "active", "plan": { "name": "Pro", "generations_limit": 50 } }
    }
  }
}
```

---

#### `POST /auth/refresh` 🔒
Refresh the JWT token before it expires.

**Response `200`:**
```json
{ "success": true, "data": { "token": "eyJ...", "expires_in": 3600 } }
```

---

#### `GET /auth/google`
Redirect to Google OAuth consent screen.

**Response `200`:**
```json
{ "url": "https://accounts.google.com/o/oauth2/auth?..." }
```

---

#### `GET /auth/google/callback`
Google OAuth callback. Redirects to frontend with token:
```
https://lab.enigmitic.com/auth/callback?token=eyJ...
```

---

#### `POST /auth/forgot-password`
Send password reset email.

**Request Body:** `{ "email": "john@example.com" }`

**Response `200`:**
```json
{ "success": true, "message": "We have emailed your password reset link." }
```

---

#### `POST /auth/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "abc123...",
  "email": "john@example.com",
  "password": "newpassword",
  "password_confirmation": "newpassword"
}
```

---

### Project Endpoints

#### `GET /projects` 🔒
List all projects for the authenticated user (paginated).

**Query Params:** `page=1`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "title": "Tech Startup Project",
        "status": "completed",
        "industry": "Technology",
        "country": "UAE",
        "brand_style": "modern",
        "needs_website": true,
        "needs_social_media": true,
        "created_at": "2024-01-15T10:30:00Z",
        "branding_asset": { ... },
        "website_asset": { ... },
        "social_media_asset": { ... }
      }
    ],
    "total": 5,
    "current_page": 1,
    "last_page": 1
  }
}
```

---

#### `POST /projects` 🔒
Create a new project (from onboarding wizard).

**Request Body:**
```json
{
  "business_name": "TechFlow",
  "industry": "Technology",
  "country": "United Arab Emirates",
  "target_audience": "Young professionals aged 25-35",
  "brand_style": "modern",
  "preferred_colors": ["#7c3aed", "#06b6d4"],
  "needs_website": true,
  "needs_social_media": true,
  "language": "en"
}
```

**Response `201`:**
```json
{ "success": true, "data": { "project": { "id": 1, "status": "draft", ... } } }
```

**Error `403` (limit reached):**
```json
{ "success": false, "message": "Generation limit reached.", "upgrade_required": true }
```

---

#### `GET /projects/{id}` 🔒
Get a single project with all generated assets.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "status": "completed",
      "branding_asset": {
        "business_name_ideas": ["TechFlow", "FlowTech", "Nexflow", "TechRise", "FlowCore"],
        "slogan": "Where Technology Meets Flow",
        "brand_story": "TechFlow was born from...",
        "color_palette": { "primary": "#7c3aed", "secondary": "#06b6d4", ... },
        "font_recommendations": { "heading": "Syne", "body": "DM Sans" },
        "logo_concepts": ["https://oaidalleapiprodscus.blob.core.windows.net/..."],
        "brand_values": ["Innovation", "Simplicity", "Impact"],
        "brand_voice": "Confident yet approachable..."
      },
      "website_asset": {
        "pages": { "home": { "hero_title": "...", ... }, "about": {...}, ... },
        "custom_styles": { "primary_color": "#7c3aed", ... },
        "is_published": false,
        "subdomain": null
      },
      "social_media_asset": {
        "instagram_bio": "🚀 Empowering tech innovation...",
        "instagram_posts": [{ "type": "introduction", "caption": "...", "hashtags": [...] }],
        "hashtags": ["tech", "startup", "innovation", ...]
      }
    }
  }
}
```

---

#### `POST /projects/{id}/generate` 🔒
Trigger AI generation for a project. Runs synchronously (~30-60s).

**Response `200`:**
```json
{ "success": true, "message": "Brand assets generated!", "data": { "project": { ... } } }
```

**Error `409` (already generating):**
```json
{ "success": false, "message": "Generation in progress." }
```

---

#### `PUT /projects/{id}/website` 🔒
Update website content from the website builder.

**Request Body:**
```json
{
  "pages": { "home": { "hero_title": "New Title", ... }, ... },
  "custom_styles": { "primary_color": "#7c3aed", "secondary_color": "#06b6d4" }
}
```

---

#### `POST /projects/{id}/publish` 🔒
Publish the website and assign a subdomain.

**Response `200`:**
```json
{
  "success": true,
  "message": "Published!",
  "data": { "url": "https://my-brand.enigmatic-launchpad.com" }
}
```

---

#### `DELETE /projects/{id}` 🔒
Soft-delete a project.

---

### Billing Endpoints

#### `GET /plans`
Get all active subscription plans (public, no auth needed).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "plans": [
      { "id": 1, "name": "Free Trial", "slug": "free", "price": 0, "generations_limit": 3, "features": [...] },
      { "id": 2, "name": "Basic", "slug": "basic", "price": 29, "stripe_price_id": "price_xxx", ... },
      { "id": 3, "name": "Pro", "slug": "pro", "price": 79, ... },
      { "id": 4, "name": "Business", "slug": "business", "price": 199, "generations_limit": -1, ... }
    ]
  }
}
```

---

#### `POST /billing/subscribe` 🔒
Subscribe to a plan. Returns Stripe checkout URL for paid plans.

**Request Body:** `{ "plan_id": 3 }`

**Response for paid plan:**
```json
{ "success": true, "data": { "checkout_url": "https://checkout.stripe.com/c/pay/cs_live_..." } }
```

**Response for free plan:**
```json
{ "success": true, "message": "Subscribed to free plan." }
```

---

#### `POST /billing/cancel` 🔒
Cancel the current subscription.

---

#### `GET /billing/invoices` 🔒
Get payment history (paginated).

---

#### `POST /billing/webhook`
Stripe webhook endpoint (no auth — verified by signature).

**Handled Events:**
- `checkout.session.completed` → activates subscription
- `invoice.payment_succeeded` → renews subscription, creates invoice record
- `invoice.payment_failed` → marks subscription as `past_due`
- `customer.subscription.deleted` → cancels subscription

---

### User Endpoints

#### `PUT /user/profile` 🔒
Update name and locale.

**Request Body:** `{ "name": "New Name", "locale": "ar" }`

---

#### `PUT /user/password` 🔒
Change password (non-Google users only).

**Request Body:**
```json
{ "current_password": "old", "password": "newpass", "password_confirmation": "newpass" }
```

---

#### `DELETE /user` 🔒
Permanently delete account.

---

### Admin Endpoints (admin role only)

#### `GET /admin/analytics` 🔒🛡️
Platform-wide statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": { "total": 1250, "new_this_month": 87, "active": 1180 },
    "projects": { "total": 3420, "completed": 3100, "this_month": 220 },
    "revenue": { "total": 48500, "this_month": 3200, "last_month": 2950 },
    "subscriptions": { "active": 420, "by_plan": [...] },
    "monthly_revenue": [{ "year": 2024, "month": 1, "total": 2100 }, ...]
  }
}
```

---

#### `GET /admin/users` 🔒🛡️
List all users with search and status filter.

**Query Params:** `page`, `search`, `status`

---

#### `PUT /admin/users/{id}` 🔒🛡️
Update user role or status.

**Request Body:** `{ "status": "suspended" }` or `{ "role": "admin" }`

---

#### `DELETE /admin/users/{id}` 🔒🛡️
Soft-delete a user.

---

#### `GET /admin/projects` 🔒🛡️
List all projects across all users.

**Query Params:** `page`, `status`

---

#### `POST /admin/plans` 🔒🛡️
Create a new subscription plan.

---

#### `PUT /admin/plans/{id}` 🔒🛡️
Update an existing plan.

---

## 5. Frontend Documentation

### Routing Structure

| Route | Component | Guard | Description |
|---|---|---|---|
| `/` | LandingComponent | guestGuard | Public marketing page |
| `/auth/login` | LoginComponent | guestGuard | Login form |
| `/auth/register` | RegisterComponent | guestGuard | Registration form |
| `/auth/forgot-password` | ForgotPasswordComponent | guestGuard | Password reset request |
| `/auth/reset-password` | ResetPasswordComponent | guestGuard | New password form |
| `/auth/callback` | CallbackComponent | — | Google OAuth redirect handler |
| `/onboarding` | OnboardingComponent | authGuard | 8-step project wizard |
| `/dashboard` | DashboardComponent | authGuard | Layout with sidebar |
| `/dashboard/overview` | OverviewComponent | authGuard | Stats and recent projects |
| `/dashboard/projects` | ProjectsListComponent | authGuard | All user projects |
| `/dashboard/projects/:id` | ProjectDetailComponent | authGuard | Branding/Website/Social tabs |
| `/dashboard/website-builder/:id` | WebsiteBuilderComponent | authGuard | Live website editor |
| `/dashboard/billing` | BillingComponent | authGuard | Plans and invoices |
| `/dashboard/settings` | SettingsComponent | authGuard | Profile and preferences |
| `/admin/dashboard` | AdminDashboardComponent | adminGuard | Analytics |
| `/admin/users` | AdminUsersComponent | adminGuard | User management |
| `/admin/plans` | AdminPlansComponent | adminGuard | Plan management |
| `/admin/projects` | AdminProjectsComponent | adminGuard | All projects |

---

### Core Services

#### AuthService — `src/app/core/services/auth.service.ts`

| Method | Description |
|---|---|
| `login(email, password)` | POST /auth/login, stores token, updates signal |
| `register(name, email, pass, confirm, locale)` | POST /auth/register |
| `logout()` | Invalidates token, clears localStorage, redirects to login |
| `getMe()` | GET /auth/me, updates currentUser signal |
| `googleLogin()` | Redirects browser to /api/auth/google |
| `handleTokenCallback(token)` | Handles Google redirect token |
| `forgotPassword(email)` | POST /auth/forgot-password |
| `resetPassword(token, email, pass, confirm)` | POST /auth/reset-password |
| `loadUser()` | Called on app init — restores session from stored token |
| `refreshToken()` | POST /auth/refresh |

**Signals:**
```typescript
currentUser = signal<User | null>(null);   // reactive user state
get isLoggedIn(): boolean                  // derived from token existence
get isAdmin(): boolean                     // derived from user.role
```

#### ProjectService — `src/app/core/services/project.service.ts`

| Method | HTTP | Endpoint |
|---|---|---|
| `getProjects()` | GET | /projects |
| `getProject(id)` | GET | /projects/{id} |
| `createProject(data)` | POST | /projects |
| `generateProject(id)` | POST | /projects/{id}/generate |
| `updateWebsite(id, data)` | PUT | /projects/{id}/website |
| `publishWebsite(id)` | POST | /projects/{id}/publish |
| `deleteProject(id)` | DELETE | /projects/{id} |

---

### Interceptors

| Interceptor | File | Function |
|---|---|---|
| `authInterceptor` | `core/interceptors/auth.interceptor.ts` | Attaches `Authorization: Bearer <token>` to every request |
| `errorInterceptor` | `core/interceptors/error.interceptor.ts` | Catches 401 → clears token → redirects to `/auth/login` |

---

### Guards

| Guard | File | Logic |
|---|---|---|
| `authGuard` | `core/guards/auth.guard.ts` | Allows if `isLoggedIn`, else → `/auth/login` |
| `guestGuard` | `core/guards/guest.guard.ts` | Allows if NOT logged in, else → `/dashboard` |
| `adminGuard` | `core/guards/admin.guard.ts` | Allows if `isAdmin`, else → `/dashboard` |

---

### Onboarding Wizard — 8 Steps

| Step | Field | Type | Required |
|---|---|---|---|
| 1 | `business_name` | Text input | No |
| 2 | `industry` | Grid buttons + free text | Yes |
| 3 | `country` | Select dropdown | Yes |
| 4 | `target_audience` | Textarea | Yes |
| 5 | `brand_style` | Style cards (luxury / modern / playful / minimal / arabic / corporate) | Yes |
| 6 | `preferred_colors` | Color swatches (max 3 hex colors) | No |
| 7 | `needs_website` | Yes / No cards | No |
| 8 | `needs_social_media` | Yes / No cards | No |

On submit → `POST /projects` → redirect to `/dashboard/projects/{id}` → user clicks Generate.

---

### Project Detail Tabs

| Tab | Visible When | Content |
|---|---|---|
| 🎨 Branding | Always (after generation) | Name ideas, slogan, color palette, fonts, logo concepts, brand story, values, voice |
| 🌐 Website | `needs_website === true` | Page content previews, publish button, Edit Website link |
| 📱 Social Media | `needs_social_media === true` | Instagram bio, 9 post captions, hashtags, ad copy |

---

### Website Builder

Three-panel layout:

| Panel | Purpose |
|---|---|
| **Toolbar** | Page selector (Home / About / Services / Contact), Device toggle (Desktop / Mobile), Save + Publish buttons |
| **Editor (left)** | Color pickers, per-page text fields, logo uploader |
| **Preview (right)** | Live-rendering HTML/CSS preview — updates in real-time as you type |

- Save → `PUT /projects/{id}/website`
- Publish → `POST /projects/{id}/publish` → returns subdomain URL

---

### Theme System

Two themes: **dark** (default) and **light**.

```typescript
// Toggle
document.documentElement.setAttribute('data-theme', 'dark' | 'light');
localStorage.setItem('theme', 'dark' | 'light');
```

CSS variables auto-switch via `[data-theme="dark"]` selector in `styles.scss`.

Key variables: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--border`, `--brand-primary`, `--brand-gradient`.

---

### i18n (English + Arabic)

| Language | File | Direction |
|---|---|---|
| English | `src/assets/i18n/en.json` | LTR |
| Arabic | `src/assets/i18n/ar.json` | RTL |

Switching language:
```typescript
localStorage.setItem('lang', 'ar');
document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'ar');
this.translate.use('ar');
```

Translation keys are namespaced: `AUTH.*`, `DASHBOARD.*`, `ONBOARDING.*`, `PROJECT.*`, `BILLING.*`, `COMMON.*`.

---

## 6. Authentication Flow

### Standard JWT Flow

```
1. User submits login form
2. POST /auth/login { email, password }
3. Server validates credentials, generates JWT (60 min TTL)
4. Token stored in localStorage
5. authInterceptor adds token to all subsequent requests
6. On 401 → errorInterceptor clears token → redirects to login
```

### Google OAuth Flow

```
1. User clicks "Continue with Google"
2. GET /api/auth/google → returns Google consent URL
3. Browser redirected to Google
4. User grants permission
5. Google redirects to /api/auth/google/callback?code=xxx
6. Server exchanges code → gets Google user profile
7. User created or updated in DB
8. JWT generated
9. Redirect to: /auth/callback?token=eyJ...
10. CallbackComponent: extracts token → calls getMe() → redirect to /dashboard
```

---

## 7. AI Generation Engine

### Service: `app/Services/AIGeneratorService.php`

### Pipeline

```
generateAll(Project)
  ├── generateBranding()
  │     ├── GPT-4o: names, slogan, story, palette, fonts, values, voice → JSON
  │     └── generateLogoImages() × 2
  │           └── DALL-E 3: logo concept images → URLs
  │
  ├── generateWebsite()  ← only if needs_website
  │     └── GPT-4o: home/about/services/contact content → JSON
  │
  └── generateSocialMedia()  ← only if needs_social_media
        └── GPT-4o: bio, 9 posts, stories, ad copy, hashtags → JSON
```

### Models Used

| Task | Model | Output |
|---|---|---|
| Brand identity | `gpt-4o` | JSON: names, slogan, story, colors, fonts, values |
| Website copy | `gpt-4o` | JSON: 4-page website content |
| Social media | `gpt-4o` | JSON: bio, 9 posts, stories, ad copy, hashtags |
| Logo concepts | `dall-e-3` (1024×1024) | 2 image URLs |

### Prompt Design

All prompts:
- Specify target language (`English` or `Arabic`)
- Provide full project context (industry, country, audience, style, colors)
- Require `JSON only` responses — no markdown, no preamble
- Include fallback regex extraction if `json_decode` fails

### Error Handling

```
Generation fails → project.status = 'failed'
                 → error logged to storage/logs/laravel.log
                 → exception thrown → controller returns 500
```

---

## 8. Payment & Billing

### Plans

| Plan | Price | Generations | Website | Social Kit | Custom Domain |
|---|---|---|---|---|---|
| Free Trial | $0 | 3/month | ✗ | ✗ | ✗ |
| Basic | $29/mo | 10/month | ✓ | ✗ | ✗ |
| Pro | $79/mo | 50/month | ✓ | ✓ | ✗ |
| Business | $199/mo | Unlimited | ✓ | ✓ | ✓ |

### Stripe Checkout Flow

```
1. User clicks "Upgrade" → POST /billing/subscribe { plan_id }
2. Server creates Stripe Checkout Session
3. Response returns { checkout_url }
4. Frontend redirects to Stripe hosted page
5. User enters card → payment processed by Stripe
6. Stripe redirects to /dashboard/billing?success=true
7. Stripe fires webhook: checkout.session.completed
8. Server creates Subscription record, status = 'active'
```

### Webhook Events Handled

| Event | Handler | Result |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutCompleted()` | Subscription activated |
| `invoice.payment_succeeded` | `handleInvoicePaid()` | Subscription renewed, Invoice created |
| `invoice.payment_failed` | `handleInvoiceFailed()` | Subscription → `past_due` |
| `customer.subscription.deleted` | `handleSubDeleted()` | Subscription → `canceled` |

### Generation Limit Logic

```php
// Checked on POST /projects
if (!$user->canGenerate()) {
    return 403 { upgrade_required: true }
}

// User::canGenerate()
$limit = $plan->generations_limit;
if ($limit === -1) return true;  // unlimited
$usedThisMonth = $user->projects()->whereMonth('created_at', now()->month)->count();
return $usedThisMonth < $limit;
```

---

## 9. Admin Panel

### Access
- URL: `https://lab.enigmitic.com/admin/dashboard`
- Requires `role = 'admin'`
- Default: `admin@enigmatic-launchpad.com` / `Admin@123456`

### Sections

| Section | URL | Features |
|---|---|---|
| Analytics | `/admin/dashboard` | Users/projects/revenue stats, monthly revenue chart, subscriptions by plan |
| Users | `/admin/users` | Search, filter by status, suspend/activate, promote to admin, delete |
| Plans | `/admin/plans` | View all plans, create/edit plans, toggle active state |
| Projects | `/admin/projects` | All projects across all users, filter by status |

---

## 10. Deployment Guide (Hostinger — No SSH)

### Step 1 — MySQL Database
In hPanel → Databases → MySQL Databases → create database and note credentials.

### Step 2 — PHP Version
hPanel → Advanced → PHP Configuration → select PHP 8.2, enable: `pdo_mysql`, `mbstring`, `openssl`, `curl`, `zip`, `bcmath`.

### Step 3 — Upload Backend
File Manager → upload `backend-deploy.zip` to `public_html/` → Extract → creates `public_html/backend/`.

### Step 4 — Install Composer
hPanel → Advanced → Terminal:
```bash
cd public_html/backend && composer install --no-dev --optimize-autoloader
```

### Step 5 — Create API Bridge (browser)
Visit: `https://lab.enigmitic.com/backend/public/setup_bridge.php`
→ auto-creates `public_html/api/` routing files.

### Step 6 — Run Browser Installer
Visit: `https://lab.enigmitic.com/api/install.php`
→ 5-step wizard: PHP check → DB config → API keys → run migrations → done.

### Step 7 — Build & Upload Frontend
```bash
cd frontend && npm install && npm run build
```
Upload `dist/enigmatic-launchpad/browser/` contents + `frontend/.htaccess` → `public_html/`.

### Step 8 — Cleanup
Delete `setup_bridge.php` and `install.php` from File Manager.

### Final URL Structure
```
public_html/
├── index.html + Angular assets    → https://lab.enigmitic.com
├── .htaccess                       → SPA routing
├── api/index.php                   → https://lab.enigmitic.com/api/*
└── backend/                        → Laravel source + vendor
```

---

## 11. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `APP_KEY` | ✅ | Generated: `php artisan key:generate` |
| `APP_URL` | ✅ | `https://lab.enigmitic.com` |
| `FRONTEND_URL` | ✅ | `https://lab.enigmitic.com` — used for CORS |
| `DB_HOST` | ✅ | `127.0.0.1` |
| `DB_DATABASE` | ✅ | Your MySQL database name |
| `DB_USERNAME` | ✅ | Your MySQL username |
| `DB_PASSWORD` | ✅ | Your MySQL password |
| `JWT_SECRET` | ✅ | Generated: `php artisan jwt:secret` |
| `OPENAI_API_KEY` | ✅ | From platform.openai.com |
| `STRIPE_KEY` | Payments | Publishable key |
| `STRIPE_SECRET` | Payments | Secret key |
| `STRIPE_WEBHOOK_SECRET` | Payments | From Stripe webhook config |
| `GOOGLE_CLIENT_ID` | Google login | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google login | From Google Cloud Console |
| `MAIL_HOST` | Password reset | SMTP host |
| `MAIL_USERNAME` | Password reset | SMTP user |
| `MAIL_PASSWORD` | Password reset | SMTP password |

---

## 12. Error Handling

### API Error Format
```json
{
  "success": false,
  "message": "Human-readable message",
  "errors": { "field": ["Validation error detail"] }
}
```

### HTTP Status Codes

| Code | Meaning | Common Cause |
|---|---|---|
| `200` | OK | Success |
| `201` | Created | Resource created |
| `401` | Unauthorized | Missing/expired/invalid token |
| `403` | Forbidden | Wrong role, or generation limit reached |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Generation already in progress |
| `422` | Unprocessable | Validation failed |
| `500` | Server Error | Check `storage/logs/laravel.log` |

### Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| CORS error in browser | `FRONTEND_URL` mismatch | Set exact URL in `.env` |
| 500 on all API routes | Missing `APP_KEY` | `php artisan key:generate` |
| JWT errors | Missing `JWT_SECRET` | `php artisan jwt:secret` |
| DB connection error | Wrong credentials | Check `DB_*` in `.env` |
| Angular 404 on page refresh | Missing `.htaccess` | Upload `frontend/.htaccess` to `public_html/` |
| AI generation fails | Bad OpenAI key | Check `OPENAI_API_KEY` |
| Stripe checkout fails | Wrong Price IDs | Update `stripe_price_id` in plans table |
| Google login fails | Wrong redirect URI | Add callback URL to Google Console |

---

## Appendix A — Default Seeded Data

### Plans

| Slug | Name | Price | Limit | Stripe Price ID |
|---|---|---|---|---|
| `free` | Free Trial | $0 | 3/month | — |
| `basic` | Basic | $29 | 10/month | `price_basic_monthly` |
| `pro` | Pro | $79 | 50/month | `price_pro_monthly` |
| `business` | Business | $199 | Unlimited | `price_business_monthly` |

### Admin User

| Field | Value |
|---|---|
| Email | `admin@enigmatic-launchpad.com` |
| Password | `Admin@123456` |
| Role | `admin` |

> ⚠️ Change this password immediately after first deployment!

---

## Appendix B — Key File Reference

| File | Purpose |
|---|---|
| `backend/.env` | All environment config |
| `backend/app/Services/AIGeneratorService.php` | Core AI generation logic |
| `backend/app/Http/Controllers/Api/AuthController.php` | Auth endpoints |
| `backend/app/Http/Controllers/Api/ProjectController.php` | Project CRUD + generation |
| `backend/app/Http/Controllers/Api/BillingController.php` | Stripe integration |
| `backend/app/Http/Middleware/CorsMiddleware.php` | CORS headers |
| `backend/database/seeders/DatabaseSeeder.php` | Seed plans + admin user |
| `backend/public/install.php` | Browser installer (delete after use) |
| `frontend/src/environments/environment.ts` | API URL config |
| `frontend/src/styles.scss` | Global design system |
| `frontend/src/app/app.routes.ts` | All route definitions |
| `frontend/src/app/core/services/auth.service.ts` | Auth state management |
| `frontend/.htaccess` | SPA routing for Apache |

---

*Enigmatic Launchpad AI — System Documentation v1.0*
