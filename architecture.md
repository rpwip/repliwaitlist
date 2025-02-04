mermaid
graph TD
    subgraph Frontend ["React Frontend"]
        subgraph Pages
            HP[Home Page]
            PP[Patient Portal]
            DP[Doctor Portal]
            CP[Clinic Portal]
            PhP[Pharmacy Portal]
            AP[Admin Portal]
            QD[Queue Display]
        end

        subgraph Components
            subgraph Patient Components
                PV[Patient Verification]
                PR[Patient Registration]
                PM[Patient Medical History]
                PQ[Payment QR]
            end

            subgraph Doctor Components
                DQ[Doctor Queue Management]
                DP[Doctor Prescriptions]
                DV[Visit Records]
                DD[Diagnoses Management]
            end

            subgraph Shared Components
                LS[Language Selector]
                TN[Toast Notifications]
                UI[UI Components]
                NB[Navigation Bar]
                MD[Modal Dialog]
            end
        end

        subgraph Hooks
            useQueue --> |WebSocket|WS[WebSocket Client]
            usePatient
            useAuth
            useLanguage
            useClinic
            usePrescription
            useVisitRecord
        end

        subgraph Store
            QS[Queue State]
            AS[Auth State]
            PS[Patient State]
            DS[Doctor State]
            CS[Clinic State]
        end
    end

    subgraph Backend ["Express Backend"]
        subgraph Routes
            Public --> PatientRoutes[Patient Routes]
            Public --> QueueRoutes[Queue Routes]
            Protected --> DoctorRoutes[Doctor Routes]
            Protected --> AdminRoutes[Admin Routes]
            Protected --> ClinicRoutes[Clinic Routes]
            Protected --> PharmacyRoutes[Pharmacy Routes]
        end

        subgraph Middleware
            Auth[Auth Middleware]
            Logging[Logging Middleware]
            ErrorHandling[Error Handling]
            RateLimit[Rate Limiting]
        end

        subgraph Services
            DoctorService[Doctor Service]
            AdminService[Admin Service]
            PatientService[Patient Service]
            QueueService[Queue Service]
            ClinicService[Clinic Service]
            PharmacyService[Pharmacy Service]
            Notifications[Notification Service]
            SMS[SMS Service]
        end

        WS[WebSocket Server] --> |Real-time Updates|QueueService
    end

    subgraph Database ["PostgreSQL Database"]
        Users[(Users)]
        Patients[(Patients)]
        Doctors[(Doctors)]
        Clinics[(Clinics)]
        Pharmacies[(Pharmacies)]
        QueueEntries[(Queue Entries)]
        VisitRecords[(Visit Records)]
        Medications[(Medications)]
        Diagnoses[(Diagnoses)]
        Orders[(Orders)]
        OrderMedications[(Order Medications)]

        Users --> Doctors
        Users --> Patients
        Patients --> QueueEntries
        Doctors --> QueueEntries
        Clinics --> QueueEntries
        Patients --> VisitRecords
        Doctors --> VisitRecords
        VisitRecords --> Medications
        Patients --> Diagnoses
        Patients --> Orders
        Orders --> OrderMedications
    end

    Frontend -.->|HTTP/WebSocket|Backend
    Backend -.->|Drizzle ORM|Database

    style Frontend fill:#f9f,stroke:#333,stroke-width:2px
    style Backend fill:#bbf,stroke:#333,stroke-width:2px
    style Database fill:#dfd,stroke:#333,stroke-width:2px
```

## Directory Structure

```plaintext
react-cloudcare/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   ├── patient-portal/
│   │   │   ├── doctor-portal/
│   │   │   ├── clinic-portal/
│   │   │   ├── pharmacy-portal/
│   │   │   ├── admin-portal/
│   │   │   └── queue-display/
│   │   ├── components/
│   │   │   ├── patient/
│   │   │   │   ├── verification/
│   │   │   │   ├── registration/
│   │   │   │   ├── medical-history/
│   │   │   │   └── payment/
│   │   │   ├── doctor/
│   │   │   │   ├── queue-management/
│   │   │   │   ├── prescriptions/
│   │   │   │   └── visit-records/
│   │   │   ├── clinic/
│   │   │   ├── pharmacy/
│   │   │   └── shared/
│   │   │       ├── ui/
│   │   │       ├── language-selector/
│   │   │       ├── navigation/
│   │   │       └── notifications/
│   │   ├── hooks/
│   │   │   ├── use-queue.ts
│   │   │   ├── use-patient.ts
│   │   │   ├── use-auth.ts
│   │   │   ├── use-clinic.ts
│   │   │   └── use-prescription.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── websocket.ts
│   │   │   └── utils.ts
│   │   └── store/
│   │       ├── queue.ts
│   │       ├── auth.ts
│   │       └── patient.ts
│   └── public/
├── server/
│   ├── routes/
│   │   ├── patient.routes.ts
│   │   ├── doctor.routes.ts
│   │   ├── clinic.routes.ts
│   │   ├── pharmacy.routes.ts
│   │   ├── queue.routes.ts
│   │   └── admin.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logging.middleware.ts
│   ├── services/
│   │   ├── doctor.service.ts
│   │   ├── patient.service.ts
│   │   ├── clinic.service.ts
│   │   ├── pharmacy.service.ts
│   │   ├── queue.service.ts
│   │   ├── notification.service.ts
│   │   └── sms.service.ts
│   └── websocket/
│       └── queue.ws.ts
└── db/
    ├── schema/
    │   ├── users.ts
    │   ├── patients.ts
    │   ├── doctors.ts
    │   ├── clinics.ts
    │   ├── pharmacies.ts
    │   ├── queue.ts
    │   ├── visit-records.ts
    │   └── medications.ts
    └── migrations/
```

## Key Features and Improvements

1. Frontend Architecture:
   - Organized React components by domain (patient, doctor, clinic, pharmacy)
   - Shared UI components and hooks for reusability
   - Real-time updates via WebSocket integration
   - Multi-language support with translations
   - Protected routes with authentication
   - Responsive design with shadcn/ui components

2. Backend Structure:
   - Domain-driven route organization
   - Middleware for authentication, logging, and error handling
   - Separate services for business logic
   - WebSocket server for real-time queue updates
   - SMS and notification services
   - Rate limiting for API protection

3. Database Design:
   - Clear relationships between entities
   - Proper foreign key constraints
   - Efficient indexing for common queries
   - Separation of medical records (visits, medications, diagnoses)

4. Security Features:
   - JWT authentication
   - Role-based access control
   - API rate limiting
   - Secure password hashing
   - Protected routes and endpoints

5. Real-time Features:
   - Queue updates
   - Patient status notifications
   - Doctor availability tracking
   - Appointment reminders

Would you like me to focus on implementing any specific part of this architecture first?