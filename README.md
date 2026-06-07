# Real-Time Chat Platform

> Enterprise-grade live chat system for bank call centers — queue management, agent tooling, supervisor monitoring, and CSAT reporting.

## 📖 Overview

BankChat is a production-ready, real-time chat platform built for bank call centers. It connects website visitors to live agents through a compliant, secure, and low-latency messaging layer — with full supervisor oversight, SLA enforcement, and CSAT analytics.

The system serves four user roles:

| Role | Responsibility |
|---|---|
| **Client** | Initiates chat via the website widget (no login required) |
| **Agent** | Handles live chats with full client context panel |
| **Team Leader** | Monitors queue health and reassigns chats before SLA breach |
| **Supervisor** | Accesses reports, agent scorecards, and live listen |

---

## ✨ Features

### 1. Chat Widget (Client-Side)
- Accessible without login; session-tracked via cookie
- Mandatory fields: Full Name, Phone Number (validated), Query Category (Account / Card / Loan / Fraud / Other), Free-text query
- WCAG/ADA compliant; visually consistent with bank branding
- Loads in under 2 seconds
- Auto-confirms submission with queue position and estimated wait time

### 2. Queue Management
- **180-second max wait SLA** (FIFO with configurable VIP/premium priority)
- Real-time queue position shown to client ("You are #4 in line")
- At 175 seconds: supervisor dashboard alert triggered
- At 180 seconds: client offered three options — keep waiting, request callback, or leave an offline message
- Callback requests stored in CRM and assigned to the next free agent without losing context
- Off-hours: widget displays offline message form; stored for next shift

### 3. Real-Time Chat Session
- Chat history auto-saved every 10 seconds (draft recovery)
- Agent sees: client name, masked phone (`+258---1234`), query category, queue wait time
- Agent tools:
  - Canned responses for common bank queries
  - File transfer (max 5 MB; malware-scanned; compliance-logged)
  - Chat transfer to another agent
- Disconnection handling: agent notified + option to leave internal note
- Auto-close abandoned sessions after 60 seconds; agent freed for next chat
- Agent inactivity: warning at 2 minutes, auto-reassignment at 3 minutes

### 4. Post-Chat Rating & Feedback
- 0–10 star scale mapped to CSAT tiers:
  - 0–3 → Detractor
  - 4–7 → Passive
  - 8–10 → Promoter
- Two-part form: rating (required) + optional comment (minimum 5 characters)
- Rating prompt appears immediately after session ends
- Linked to agent ID and session ID
- Available in reporting within 30 seconds of submission
- One rating per session ID; duplicate IP submissions blocked

### 5. Supervisor & Team Leader Dashboard
Real-time metrics refreshed every ≤ 5 seconds:

| Metric | Description |
|---|---|
| Queue size | Current wait count + longest wait time |
| Agent status | Online / Busy / Away / Offline + current chat duration |
| Escalations | Chats exceeding 180s wait or 10-minute chat duration |
| Live listen | Supervisor can silently monitor any active chat |

Visual alert triggered at 170 seconds of queue wait.

### 6. Reporting
All reports are exportable to **CSV** and **PDF**, filterable by date, agent, and branch.

| Report | Key Fields |
|---|---|
| **Agent Performance** | Chats handled, avg response time, avg chat duration, avg star rating, feedback samples |
| **Queue Performance** | Max wait, p95 wait, abandoned count, callback count (hourly) |
| **CSAT by Category** | Avg rating per query type (Fraud / Account / Card / Loan); top 5 feedback themes |
| **Agent Scorecard (weekly)** | Rank by rating, SLA adherence (response < 30s), chats per hour |

---

## ⚙️ Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Latency** | Message round-trip < 500ms (p95) |
| **Concurrency** | Up to 2,000 simultaneous chats |
| **Uptime** | 99.99% during banking hours |
| **Failover** | Backup queue service activated within 10 seconds |
| **Encryption (transit)** | TLS 1.3 end-to-end |
| **Encryption (at rest)** | AES-256 for all chat transcripts |
| **PII handling** | No PII stored in browser logs; phone numbers masked in agent view |
| **Compliance** | PCI-DSS, GDPR, CCPA ready; full audit trail; "do not store" option for fraud queries |

---

## 🗄 Data Schema

Each session logs the following for reporting and audit purposes:

```json
{
  "session_id": "UUID",
  "client_phone_hash": "SHA256",
  "agent_id": "emp_123",
  "queue_wait_seconds": 142,
  "chat_start_timestamp": "2025-03-10T14:32:10Z",
  "chat_end_timestamp": "2025-03-10T14:45:22Z",
  "agent_response_avg_seconds": 18,
  "rating": 9,
  "feedback_text": "Resolved my fraud issue quickly"
}
```

---

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
