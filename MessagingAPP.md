# MessagingApp — System Design & Implementation Guide

**Stack:** PostgreSQL · Java Spring Boot 3.2 · React 17

---

## 1. Overview

The solution facilitates a bi-directional communication bridge between an internal case management system and an external platform. It handles text-based outbound questions and multi-modal (text + attachment) inbound responses, utilizing a polling mechanism for data synchronization.

**Data Flow:**

- **Outbound:** Internal User creates a message → Spring Boot REST API → SOAP External System Call.
- **Inbound:** Java Scheduler (15-min interval) → Polls External XML → Parses `FollowupQuestionGet` → Persists to PostgreSQL.
- **Frontend:** React 17 polls the message list API, rendering a "Threaded-Stream" view.

---

## 2. Database Design (PostgreSQL)

### Canonical Schema

A self-referencing table structure allows deep "Reply-To" relationships without losing flat chronological history.

#### `case_communication` Table

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | PK, `DEFAULT nextval(...)` | Sequence-based primary key. |
| `case_id` | `VARCHAR(50)` | `NOT NULL` | Reference to the parent case (e.g., `IMS-2025-000223`). |
| `message_text` | `TEXT` | `NOT NULL` | Stores large message bodies without truncation. |
| `sender_type` | `sender_type_enum` | `NOT NULL` | `INTERNAL` or `EXTERNAL` (native PostgreSQL ENUM). |
| `sender_name` | `VARCHAR(255)` | | Display name of the sender. |
| `sender_id` | `VARCHAR(100)` | | System ID of the sender. |
| `parent_message_id` | `BIGINT` | FK → `case_communication(id)` | Self-reference to handle the "Reply" relationship. |
| `external_id` | `VARCHAR(100)` | `UNIQUE` | Maps to `FollowupQuestionId` from XML to prevent duplicates. |
| `is_visible_to_investigator` | `BOOLEAN` | `DEFAULT FALSE` | Analyst-controlled flag for Investigator visibility. |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation time for chronological sorting. |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Last update time for audit trail. |

#### `case_attachments` Table (additions)

| Column | Data Type | Description |
|---|---|---|
| `external_attachment_id` | `VARCHAR(100)` | Unique ID from the external system. |
| `visibility_flag` | `BOOLEAN` | Investigator access control. |
| `communication_id` | `BIGINT` | FK linking the attachment to a specific message bubble. |

---

## 3. Database Migration (Liquibase)

**File:** `changelog-v1-communication.sql`

```sql
-- 1. Create native ENUM type for sender classification
CREATE TYPE sender_type_enum AS ENUM ('INTERNAL', 'EXTERNAL');

-- 2. Create sequence for communication IDs
CREATE SEQUENCE IF NOT EXISTS seq_case_communication_id START WITH 1000 INCREMENT BY 1;

-- 3. Create canonical communication table
CREATE TABLE case_communication (
    id                        BIGINT PRIMARY KEY DEFAULT nextval('seq_case_communication_id'),
    case_id                   VARCHAR(50)        NOT NULL,
    message_text              TEXT               NOT NULL,
    sender_type               sender_type_enum   NOT NULL,
    sender_name               VARCHAR(255),
    sender_id                 VARCHAR(100),
    parent_message_id         BIGINT,
    external_id               VARCHAR(100)       UNIQUE,  -- DB-level duplicate guard
    is_visible_to_investigator BOOLEAN           DEFAULT FALSE,
    created_at                TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_message FOREIGN KEY (parent_message_id)
        REFERENCES case_communication(id)
);

-- 4. Update existing attachments table
ALTER TABLE case_attachments ADD COLUMN external_attachment_id VARCHAR(100);
ALTER TABLE case_attachments ADD COLUMN visibility_flag         BOOLEAN DEFAULT FALSE;
ALTER TABLE case_attachments ADD COLUMN communication_id        BIGINT;
ALTER TABLE case_attachments ADD CONSTRAINT fk_comm_attachment
    FOREIGN KEY (communication_id) REFERENCES case_communication(id);

-- 5. Indexes for performance
-- Composite index for the most common query: messages for a case, sorted by time
CREATE INDEX idx_comm_case_chrono   ON case_communication(case_id, created_at ASC);
-- Dedicated index for deduplication lookups in the scheduler
CREATE INDEX idx_comm_external_id   ON case_communication(external_id);
-- Index for self-join on reply threads
CREATE INDEX idx_comm_parent_msg_id ON case_communication(parent_message_id);
```

---

## 4. Backend Implementation (Spring Boot 3.2)

### 4.1 Application Entry Point

```java
@SpringBootApplication
@EnableScheduling   // Required to activate @Scheduled methods
public class MessagingAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessagingAppApplication.class, args);
    }
}
```

### 4.2 Configuration — Credentials via Environment Variables

> **Never hardcode database credentials in source files or documentation.**
> Use environment variables or a secrets manager (e.g., AWS Secrets Manager, Vault).

```yaml
# application.yml
spring:
  datasource:
    url:      ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
```

Set values at runtime:
```bash
export DB_URL=jdbc:postgresql://<host>/<db>?sslmode=require
export DB_USERNAME=<user>
export DB_PASSWORD=<password>
```

### 4.3 JPA Entity

```java
@Entity
@Table(name = "case_communication")
public class CaseCommunication {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "comm_seq")
    @SequenceGenerator(name = "comm_seq", sequenceName = "seq_case_communication_id", allocationSize = 1)
    private Long id;

    @Column(name = "case_id", nullable = false, length = 50)
    private String caseId;

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private SenderType senderType;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "sender_id", length = 100)
    private String senderId;

    @Column(name = "parent_message_id")
    private Long parentMessageId;

    @Column(name = "external_id", unique = true, length = 100)
    private String externalId;

    @Column(name = "is_visible_to_investigator")
    private boolean visibleToInvestigator = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    // getters and setters
}

public enum SenderType { INTERNAL, EXTERNAL }
```

### 4.4 DTO Layer

> **Always use DTOs — never expose JPA entities directly from controllers.**

```java
// Response DTO
public record CaseCommunicationDto(
    Long    id,
    String  caseId,
    String  messageText,
    String  senderType,
    String  senderName,
    Long    parentMessageId,
    boolean visibleToInvestigator,
    String  createdAt
) {}

// Request DTO for sending a new message (with Bean Validation)
public record SendMessageRequest(
    @NotBlank String caseId,
    @NotBlank String messageText,
    Long parentMessageId   // optional — null if not a reply
) {}

// Request DTO for visibility toggle
public record VisibilityUpdateRequest(
    @NotNull Boolean visible
) {}
```

### 4.5 REST Controller

```java
@RestController
@RequestMapping("/api/v1/communications")
@CrossOrigin(origins = "${app.cors.allowed-origins}")  // CORS configured via property
public class CommunicationController {

    private final CommunicationService service;

    public CommunicationController(CommunicationService service) {
        this.service = service;
    }

    // GET messages for a case, sorted chronologically
    @GetMapping
    public ResponseEntity<List<CaseCommunicationDto>> getMessages(
            @RequestParam @NotBlank String caseId) {
        return ResponseEntity.ok(service.getMessagesByCase(caseId));
    }

    // POST a new outbound message
    @PostMapping
    public ResponseEntity<CaseCommunicationDto> sendMessage(
            @RequestBody @Valid SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(service.sendMessage(request));
    }

    // PATCH visibility flag (Analyst control)
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<Void> updateVisibility(
            @PathVariable Long id,
            @RequestBody @Valid VisibilityUpdateRequest request) {
        service.updateVisibility(id, request.visible());
        return ResponseEntity.noContent().build();
    }
}
```

### 4.6 CORS Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PATCH")
                .allowedHeaders("*");
    }
}
```

```yaml
# application.yml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
```

### 4.7 Inbound Scheduler (XML Polling)

> **Key fixes applied:**
> - `repo.save(newMsg)` is called **before** `saveReply(...)` so the parent has a DB-generated ID.
> - `@Transactional` ensures the question + reply are saved atomically.
> - Parent lookup uses `external_id` (reliable), not free-text matching (fragile).

```java
@Service
public class ExternalPollScheduler {

    private final CaseCommunicationRepository repo;
    private final SoapClient soapClient;

    public ExternalPollScheduler(CaseCommunicationRepository repo, SoapClient soapClient) {
        this.repo = repo;
        this.soapClient = soapClient;
    }

    @Scheduled(fixedRate = 900_000) // every 15 minutes
    @Transactional
    public void pollExternalSystem() {
        List<FollowupQuestionGet> externalData = soapClient.getResponses();

        for (FollowupQuestionGet item : externalData) {
            // UNIQUE constraint at DB level is the final guard; this check avoids
            // unnecessary insert attempts for already-processed messages.
            if (repo.existsByExternalId(item.getFollowupQuestionId())) {
                continue;
            }

            CaseCommunication question = new CaseCommunication();
            question.setExternalId(item.getFollowupQuestionId());
            question.setMessageText(item.getQuestionText());
            question.setSenderType(SenderType.EXTERNAL);
            question.setSenderName(item.getEmployeeName());

            // IMPORTANT: persist the question first to obtain its DB-generated ID,
            // then use that ID as the parent reference for the reply.
            CaseCommunication savedQuestion = repo.save(question);

            if (item.getAnswer() != null && !item.getAnswer().isNil()) {
                saveReply(savedQuestion, item.getAnswer().getValue());
            }
        }
    }

    private void saveReply(CaseCommunication parent, String answerText) {
        CaseCommunication reply = new CaseCommunication();
        reply.setMessageText(answerText);
        reply.setSenderType(SenderType.INTERNAL);
        reply.setParentMessageId(parent.getId());   // uses DB-generated ID from saved parent
        reply.setCaseId(parent.getCaseId());
        repo.save(reply);
    }
}
```

### 4.8 Repository

```java
@Repository
public interface CaseCommunicationRepository extends JpaRepository<CaseCommunication, Long> {

    boolean existsByExternalId(String externalId);

    List<CaseCommunication> findByCaseIdOrderByCreatedAtAsc(String caseId);
}
```

---

## 5. Frontend Implementation (React 17)

### 5.1 Component Architecture

```
CommunicationFeed (Container)
├── MessageBubble (Presentation)
│   ├── VisibilityToggle
│   └── ReplyReference (if parentMessageId present)
└── MessageComposer (Input)
```

### 5.2 `CommunicationFeed.js` — Container with Polling

```javascript
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const POLL_INTERVAL_MS = 15_000; // 15 seconds

const CommunicationFeed = ({ caseId }) => {
  const [messages, setMessages]   = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/communications?caseId=${caseId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Pre-compute O(1) lookup map — avoids O(n²) find() inside each MessageBubble
  const messageMap = useMemo(
    () => Object.fromEntries(messages.map(m => [m.id, m])),
    [messages]
  );

  if (loading) return <div className="feed-status">Loading messages...</div>;
  if (error)   return <div className="feed-status feed-error">Error: {error}</div>;

  return (
    <div className="communication-feed">
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          messageMap={messageMap}
          onReply={setReplyingTo}
          onVisibilityChange={fetchMessages}
        />
      ))}
      <MessageComposer
        caseId={caseId}
        replyingTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        onMessageSent={fetchMessages}
      />
    </div>
  );
};

CommunicationFeed.propTypes = {
  caseId: PropTypes.string.isRequired,
};

export default CommunicationFeed;
```

### 5.3 `MessageBubble.js` — Presentation

```javascript
import React from 'react';
import PropTypes from 'prop-types';
import VisibilityToggle from './VisibilityToggle';

const MessageBubble = ({ msg, messageMap, onReply, onVisibilityChange }) => {
  // O(1) lookup using the pre-computed map from the parent container
  const parentMsg = msg.parentMessageId ? messageMap[msg.parentMessageId] : null;

  const formattedTime = new Date(msg.createdAt).toLocaleString();

  return (
    <div className={`message-wrapper ${msg.senderType.toLowerCase()}`}>
      {parentMsg && (
        <div className="reply-reference">
          <small>
            Replying to <strong>{parentMsg.senderName}</strong>:{' '}
            {parentMsg.messageText.substring(0, 60)}…
          </small>
        </div>
      )}
      <div className={`message-bubble${parentMsg ? ' is-reply' : ''}`}>
        <div className="bubble-header">
          <span className="sender-name">{msg.senderName}</span>
          <span className="timestamp">{formattedTime}</span>
        </div>
        <p className="bubble-text">{msg.messageText}</p>
        <div className="bubble-actions">
          <button className="reply-btn" onClick={() => onReply(msg)}>
            Reply
          </button>
          <VisibilityToggle
            active={msg.visibleToInvestigator}
            messageId={msg.id}
            onToggled={onVisibilityChange}
          />
        </div>
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  msg: PropTypes.shape({
    id:                     PropTypes.number.isRequired,
    messageText:            PropTypes.string.isRequired,
    senderType:             PropTypes.oneOf(['INTERNAL', 'EXTERNAL']).isRequired,
    senderName:             PropTypes.string,
    parentMessageId:        PropTypes.number,
    visibleToInvestigator:  PropTypes.bool.isRequired,
    createdAt:              PropTypes.string.isRequired,
  }).isRequired,
  messageMap:         PropTypes.object.isRequired,
  onReply:            PropTypes.func.isRequired,
  onVisibilityChange: PropTypes.func.isRequired,
};

export default MessageBubble;
```

### 5.4 `VisibilityToggle.js`

```javascript
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const VisibilityToggle = ({ active, messageId, onToggled }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/communications/${messageId}/visibility`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ visible: !active }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      onToggled();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`visibility-toggle ${active ? 'active' : ''}`}
      onClick={handleToggle}
      disabled={loading}
      title={active ? 'Hide from investigator' : 'Show to investigator'}
    >
      {active ? 'Visible' : 'Hidden'}
    </button>
  );
};

VisibilityToggle.propTypes = {
  active:    PropTypes.bool.isRequired,
  messageId: PropTypes.number.isRequired,
  onToggled: PropTypes.func.isRequired,
};

export default VisibilityToggle;
```

### 5.5 `MessageComposer.js`

```javascript
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const MessageComposer = ({ caseId, replyingTo, onClearReply, onMessageSent }) => {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/communications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          messageText:     text.trim(),
          parentMessageId: replyingTo ? replyingTo.id : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setText('');
      onClearReply();
      onMessageSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="message-composer">
      {replyingTo && (
        <div className="replying-to-badge">
          Replying to <strong>{replyingTo.senderName}</strong>
          <button className="clear-reply" onClick={onClearReply}>✕</button>
        </div>
      )}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a message…"
        rows={3}
      />
      {error && <div className="composer-error">{error}</div>}
      <button onClick={handleSend} disabled={sending || !text.trim()}>
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
};

MessageComposer.propTypes = {
  caseId:        PropTypes.string.isRequired,
  replyingTo:    PropTypes.object,
  onClearReply:  PropTypes.func.isRequired,
  onMessageSent: PropTypes.func.isRequired,
};

export default MessageComposer;
```

### 5.6 CSS — Thread Connector Styling

```css
/* Sender alignment */
.message-wrapper.internal { justify-content: flex-end; }
.message-wrapper.external { justify-content: flex-start; }

/* Reply reference quote box */
.reply-reference {
  background: #f0f0f0;
  border-left: 3px solid #007bff;
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #555;
}

/* Visual connector line from reply bubble to reference quote */
.message-bubble.is-reply {
  border-left: 3px solid #007bff;
  margin-left: 20px;
  padding-left: 15px;
  position: relative;
}

.message-bubble.is-reply::before {
  content: "";
  position: absolute;
  left: -20px;
  top: -10px;
  width: 20px;
  height: 2px;
  background: #007bff;
}

/* Visibility toggle */
.visibility-toggle        { background: #e0e0e0; border: none; border-radius: 12px; padding: 2px 10px; cursor: pointer; }
.visibility-toggle.active { background: #4caf50; color: #fff; }
```

---

## 6. Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| `UNIQUE` constraint on `external_id` at DB level | Race-condition-safe deduplication; Java `existsByExternalId` alone is not atomic. |
| Native PostgreSQL `ENUM` for `sender_type` | Type-safe at DB level; prevents invalid values without application-layer checks. |
| Save parent before reply in scheduler | The reply's FK (`parent_message_id`) requires the parent's DB-generated `id` to exist first. |
| `@Transactional` on scheduler | Ensures question + reply are committed atomically; failure rolls back both. |
| `useMemo` message map in React | Converts O(n²) per-render lookups to O(1); critical for large message lists. |
| DTO layer in Spring Boot | Decouples API contract from DB schema; prevents accidental field exposure. |
| Credentials via environment variables | Prevents secrets from leaking into source control or documentation. |


Application is Running

  ┌───────────────────────┬───────────────────────┬─────────┐
  │        Service        │          URL          │ Status  │
  ├───────────────────────┼───────────────────────┼─────────┤
  │ Backend (Spring Boot) │ http://localhost:8080 │ Running │
  ├───────────────────────┼───────────────────────┼─────────┤
  │ Frontend (React 17)   │ http://localhost:3000 │ Running │
  └───────────────────────┴───────────────────────┴─────────┘

  ---
  Test Results

  ┌─────┬───────────────────────────────────────────┬─────────────────────────────────────────────┐
  │  #  │                   Test                    │                   Result                    │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 1   │ POST /api/v1/communications — new message │ 201 — id 1003 created                       │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 2   │ POST — reply with parentMessageId: 1003   │ 201 — id 1004, thread linked                │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 3   │ GET /api/v1/communications?caseId=...     │ 200 — 2 messages, chronological order       │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 4   │ PATCH /{id}/visibility — toggle to true   │ 204 — no content                            │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 5   │ GET — verify visibility updated           │ visible=True confirmed on id 1003           │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 6   │ POST — missing caseId (validation)        │ 400 Bad Request as expected                 │
  ├─────┼───────────────────────────────────────────┼─────────────────────────────────────────────┤
  │ 7   │ Second case IMS-2025-000224 isolation     │ 201 — separate case, no cross-contamination │
  └─────┴───────────────────────────────────────────┴─────────────────────────────────────────────┘


  What was implemented

  Backend — backend/

  pom.xml                          Spring Boot 3.2, JPA, Validation, PostgreSQL, Liquibase
  application.yml                  All config driven by env vars (DB, CORS, scheduler rate)

  Database migrations (db/changelog/)
  - changelog-v1-communication.sql — creates sender_type_enum, sequence, case_communication table with all constraints, indexes, and alters case_attachments

  Java packages

  ┌─────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
  │    Layer    │                                           File                                           │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Entry point │ MessagingAppApplication.java — @EnableScheduling                                         │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Entity      │ CaseCommunication.java, SenderType.java                                                  │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ DTOs        │ CaseCommunicationDto, SendMessageRequest, VisibilityUpdateRequest                        │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Repository  │ CaseCommunicationRepository — existsByExternalId, findByCaseIdOrderByCreatedAtAsc        │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Service     │ CommunicationService — @Transactional, CommunicationMapper                               │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Controller  │ CommunicationController — GET /api/v1/communications, POST, PATCH /{id}/visibility       │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Config      │ CorsConfig.java                                                                          │
  ├─────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ Scheduler   │ ExternalPollScheduler — processItem() with correct save-order (parent first, then reply) │
  └─────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

  Frontend — frontend/

  package.json          React 17, prop-types, proxy → localhost:8080
  public/index.html
  src/index.js
  src/App.js            Case selector dropdown

  ┌───────────────────┬────────────────────────────────────────────────────────────────────────────────┐
  │     Component     │                                 Key behaviour                                  │
  ├───────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ CommunicationFeed │ Polls every 15s, useMemo O(1) message map, loading/error states                │
  ├───────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ MessageBubble     │ Left/right alignment, reply-reference quote, sender badge, formatted timestamp │
  ├───────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ VisibilityToggle  │ PATCH call with loading state                                                  │
  ├───────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ MessageComposer   │ Auto-expanding textarea, Ctrl+Enter send, reply badge with dismiss             │
  ├───────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ messaging.css     │ Full styling — app shell, thread connectors, badges, composer                  │
  └───────────────────┴────────────────────────────────────────────────────────────────────────────────┘