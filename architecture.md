```mermaid
graph TD
    subgraph Frontend
        HC[Home Component] --> PV[Patient Verification]
        PV --> PS[Patient Selection]
        PS --> PQ[Payment QR]
        
        QD[Queue Display] --> QN[Queue Number]
        
        AD[Admin Dashboard] --> QT[Queue Table]
        
        subgraph Shared Components
            LangSelector[Language Selector]
            Toast[Toast Notifications]
            UI[UI Components]
        end
        
        subgraph Hooks
            useQueue --> |WebSocket|WS
            usePatient
            useAuth
            useLanguage
        end
    end

    subgraph Backend ["Express Backend"]
        Routes --> |Auth Middleware|Protected
        Routes --> Public
        
        Protected --> DoctorAPI[Doctor APIs]
        Protected --> AdminAPI[Admin APIs]
        
        Public --> PatientAPI[Patient APIs]
        Public --> QueueAPI[Queue APIs]
        
        WS[WebSocket Server] --> |Real-time Updates|QueueAPI
        
        subgraph Services
            Notifications[Notification Service]
            SMS[SMS Service]
        end
    end

    subgraph Database ["PostgreSQL Database"]
        Patients[(Patients)]
        QueueEntries[(Queue Entries)]
        Doctors[(Doctors)]
        Clinics[(Clinics)]
        Users[(Users)]
        Prescriptions[(Prescriptions)]
        Diagnoses[(Diagnoses)]
        VisitRecords[(Visit Records)]
        
        Patients --> QueueEntries
        Doctors --> QueueEntries
        Clinics --> QueueEntries
        Users --> Doctors
        Patients --> Prescriptions
        Patients --> Diagnoses
        Patients --> VisitRecords
    end

    Frontend -.->|HTTP/WebSocket|Backend
    Backend -.->|Drizzle ORM|Database

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#bbf,stroke:#333,stroke-width:2px
    style Database fill:#dfd,stroke:#333,stroke-width:2px
```

Key Features:
1. Frontend:
   - React components with responsive design
   - Real-time queue updates via WebSocket
   - Form handling with shadcn components
   - Multi-language support
   - Protected routes for admin/doctor access

2. Backend:
   - Express server with route protection
   - WebSocket server for real-time updates
   - Authentication middleware
   - SMS and notification services
   - API routes for patients, doctors, and admin

3. Database:
   - PostgreSQL with Drizzle ORM
   - Related tables for comprehensive patient management
   - Queue tracking system
   - Medical records storage
   - User authentication data

Data Flow:
1. Patient Flow:
   - Patient verification → Selection → Queue Entry → Payment
   - Real-time queue status updates via WebSocket
   - Consultation tracking and medical record updates

2. Doctor Flow:
   - Authentication → Patient list → Queue management
   - Medical record creation and updates
   - Prescription and diagnosis management

3. Admin Flow:
   - Queue management and monitoring
   - Patient data management
   - Clinic operations oversight
