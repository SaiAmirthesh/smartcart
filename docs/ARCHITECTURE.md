# SmartCart System Architecture

SmartCart is an intelligent shopping cart platform engineered to modernize retail checkout by combining **RFID product identification**, **real-time backend billing**, **interactive shopper web interface**, and **future ROS 2-based autonomous human-following robotics**.

This document outlines the system architecture, data models, state workflows, hardware interfaces, and integration boundaries.

---

## 1. System Architecture Overview

SmartCart is structured as a decoupled multi-tier architecture separating hardware sensor acquisition, core business and billing logic, data storage, interactive user interfaces, and external robotic navigation nodes.

```mermaid
flowchart TB
    subgraph Hardware["Hardware Subsystem (Shopping Cart)"]
        TAG["RFID Tag (Product)"]
        READER["MFRC522 RFID Reader"]
        ESP["ESP32 Microcontroller"]
        LOADCELL["Load Cell / Weight Sensor (Future)"]
        
        TAG -->|13.56 MHz High Frequency| READER
        READER -->|SPI Interface| ESP
        LOADCELL -.->|ADC / HX711| ESP
    end

    subgraph Transport["Network & Communication"]
        WIFI["Wi-Fi / REST API (HTTP)"]
        ESP -->|POST /cart/{id}/add/{uid}| WIFI
    end

    subgraph Backend["Backend Subsystem (FastAPI)"]
        API["FastAPI Routing Layer"]
        PROD_API["Product API"]
        CART_API["Cart API"]
        TXN_API["Transaction API"]
        
        BILL_ENG["Billing Engine"]
        RFID_SVC["RFID Service"]
        PAY_SVC["Payment Service"]
        
        DB[("SQLite Database / SQLAlchemy ORM")]
        
        WIFI --> API
        API --> PROD_API & CART_API & TXN_API
        PROD_API & CART_API & TXN_API --> RFID_SVC & BILL_ENG & PAY_SVC
        RFID_SVC & BILL_ENG & PAY_SVC <--> DB
    end

    subgraph Presentation["Shopper Dashboard (React Frontend)"]
        UI["React + Vite UI"]
        CART_VIEW["Real-Time Cart Display"]
        BILL_VIEW["Live Billing Summary"]
        PAY_VIEW["Checkout & QR Payment"]
        
        UI --> CART_VIEW & BILL_VIEW & PAY_VIEW
        API <-->|REST / Polling / WebSocket| UI
    end

    subgraph Robotics["Autonomous Navigation Subsystem (Future)"]
        ROS["ROS 2 Navigation Stack"]
        HUMAN_TRACK["Human Following (LIDAR / Camera)"]
        
        ROS <-->|Async API / Telemetry| API
        HUMAN_TRACK --> ROS
    end
```

### Core Design Principle: Hardware-Logic Separation
The **ESP32 microcontroller is stateless** with respect to billing logic. Its sole responsibility is telemetry collection (reading RFID UIDs and pushing payload to the REST backend). All product mapping, cart state, item quantities, total calculation, discount application, and payment processing reside exclusively within the backend.

---

## 2. Software Architecture & Directory Layout

The backend adopts a clean modular layered structure using FastAPI and SQLAlchemy:

```mermaid
graph TD
    subgraph Backend Modules
        MAIN["main.py (App Entry point & Middleware)"]
        
        subgraph API Layer ["app/api/"]
            P_API["products.py"]
            C_API["cart.py"]
            T_API["transactions.py"]
            PAY_API["payment.py"]
        end
        
        subgraph Service Layer ["app/services/"]
            R_SVC["rfid_service.py"]
            B_SVC["billing_service.py"]
            P_SVC["payment_service.py"]
        end
        
        subgraph Models Layer ["app/models/"]
            P_MOD["product.py"]
            C_MOD["cart.py"]
            T_MOD["transaction.py"]
        end
        
        subgraph DB Layer ["app/database/"]
            DB_CONN["database.py (Engine & Session)"]
        end
    end

    MAIN --> API Layer
    API Layer --> Service Layer
    Service Layer --> Models Layer
    Service Layer --> DB Layer
    Models Layer --> DB Layer
```

---

## 3. Database Architecture & Schema (ERD)

SmartCart utilizes relational storage via SQLite (expandable to PostgreSQL) managed by SQLAlchemy ORM.

```mermaid
erDiagram
    PRODUCTS ||--o{ CART_ITEMS : "contains"
    CARTS ||--|{ CART_ITEMS : "holds"
    CARTS ||--o| TRANSACTIONS : "generates"

    PRODUCTS {
        int id PK
        string rfid_uid UK "Unique RFID Tag Identifier"
        string name "Product Name"
        string category "Product Category"
        float price "Unit Price"
        int stock "Available Quantity"
    }

    CARTS {
        int id PK
        string cart_code UK "e.g., CART-001"
        string status "active | checkout | closed"
        datetime created_at
    }

    CART_ITEMS {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity "Item Count"
        float unit_price "Price at add time"
    }

    TRANSACTIONS {
        int id PK
        string transaction_code UK "e.g., TXN-00001"
        int cart_id FK
        float total_amount "Final calculated bill"
        string payment_status "pending | paid | failed"
        string payment_method "UPI | CARD | CASH"
        datetime created_at
    }
```

---

## 4. End-to-End Billing & Cart Workflows

### 4.1 Product Scanning & Cart Update Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Tag as Product RFID Tag
    participant ESP as ESP32 + MFRC522
    participant API as FastAPI Backend
    participant DB as SQLite DB
    participant UI as React Dashboard

    Customer->>Tag: Places item into cart
    Tag->>ESP: RF Field Detection & UID Read
    ESP->>API: POST /cart/{cart_id}/add/{rfid_uid}
    
    activate API
    API->>DB: Query Product by rfid_uid
    alt Product Found
        DB-->>API: Product Record (Name, Price, Stock)
        API->>DB: Update or Add CartItem entry
        API->>API: Recalculate Cart Subtotal & Total
        DB-->>API: Commit Transaction
        API-->>ESP: 200 OK (Item Added)
        API-->>UI: Push/Return Updated Cart Payload
        UI-->>Customer: Render updated cart items & price total
    else Product Not Found
        API-->>ESP: 404 Not Found (Invalid Tag)
        API-->>UI: Display Alert ("Unknown Tag Scanned")
    end
    deactivate API
```

### 4.2 Cart Session Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Cart Powered On
    Idle --> Active: Customer scans / creates session (CART-001)
    
    state Active {
        [*] --> ItemScanning
        ItemScanning --> ItemAdded: Tag Scanned (New Item)
        ItemScanning --> QuantityUpdated: Tag Scanned (Existing Item)
        ItemScanning --> ItemRemoved: Removal Triggered
        ItemAdded --> ItemScanning
        QuantityUpdated --> ItemScanning
        ItemRemoved --> ItemScanning
    }
    
    Active --> CheckoutPending: Customer Clicks "Proceed to Pay"
    CheckoutPending --> PaymentProcessing: Payment Gateway / QR Initiated
    
    state PaymentProcessing {
        [*] --> Verification
        Verification --> PaymentSuccess: Payment Webhook/Callback OK
        Verification --> PaymentFailed: Payment Timeout / Declined
    }

    PaymentFailed --> CheckoutPending: Retry Payment
    PaymentSuccess --> CartClosed: Issue Receipt & Lock Cart
    CartClosed --> [*]: Reset for Next Customer
```

---

## 5. Product Item Removal & Discrepancy Logic

Handling item removal in an RFID-enabled cart requires distinguishing intentional item removal from duplicate scans.

```mermaid
flowchart TD
    A["RFID Tag Scanned"] --> B["Lookup Item in Active Cart"]
    B --> C{"Is Product already in Cart?"}
    
    C -- No --> D["Add Product to Cart (Qty = 1)"]
    C -- Yes --> E{"Detection Mode / Input Context"}
    
    E -- "Standard Scan Mode" --> F["Increment Quantity (Qty + 1)"]
    E -- "Explicit Remove Button / Out-Gate" --> G{"Current Quantity > 1?"}
    
    G -- Yes --> H["Decrement Quantity (Qty - 1)"]
    G -- No --> I["Remove Product Entry from Cart"]
    
    D --> J["Recalculate Cart Total"]
    F --> J
    H --> J
    I --> J
    J --> K["Update Frontend UI"]
```

### Future Verification: RFID + Load Cell (Weight Matching)

```mermaid
flowchart LR
    subgraph Scan
        RFID_READ["RFID Tag Scanned"] --> LOOKUP["Get Expected Product Weight"]
    end
    
    subgraph Physical Verification
        WEIGHT_READ["Read Load Cell (Scale)"] --> DIFF["Calculate Delta Weight"]
    end
    
    LOOKUP --> VERIFY{"Expected Weight == Delta Weight?"}
    DIFF --> VERIFY
    
    VERIFY -- Match --> ACCEPT["Approve Cart Update"]
    VERIFY -- Mismatch --> ALERT["Trigger Discrepancy Warning"]
```

---

## 6. Hardware Integration Architecture

The hardware prototype relies on an **ESP32 microcontroller** communicating with an **MFRC522 RFID module** over SPI.

```mermaid
graph LR
    subgraph ESP32 Microcontroller
        GPIO18["GPIO 18 (SCK)"]
        GPIO19["GPIO 19 (MISO)"]
        GPIO23["GPIO 23 (MOSI)"]
        GPIO5["GPIO 5 (SDA/SS)"]
        GPIO22["GPIO 22 (RST)"]
        WIFI_MOD["Wi-Fi Station Module"]
    end

    subgraph MFRC522 RFID Reader
        SCK["SCK"]
        MISO["MISO"]
        MOSI["MOSI"]
        SDA["SDA"]
        RST["RST"]
    end

    GPIO18 <--> SCK
    GPIO19 <--> MISO
    GPIO23 <--> MOSI
    GPIO5 <--> SDA
    GPIO22 <--> RST

    WIFI_MOD -->|HTTP POST JSON| REST_API["FastAPI Server (http://<server-ip>:8000)"]
```

### Telemetry Payload Schema (ESP32 $\rightarrow$ Backend)
```json
{
  "cart_code": "CART-001",
  "rfid_uid": "E200001",
  "timestamp": "2026-09-02T21:26:00Z"
}
```

---

## 7. Trade-off Analysis: RFID vs. Computer Vision (YOLO)

To ensure high accuracy during initial deployment, RFID was selected over vision-based tracking. However, future releases support a **hybrid verification model**.

```mermaid
flowchart TB
    ITEM["Scanned Item"] --> RFID_CHAN["RFID Sensor Path"]
    ITEM --> CV_CHAN["Camera / YOLO Path"]

    RFID_CHAN -->|Instant UID Lookup| ID_TAG["Exact Product ID"]
    CV_CHAN -->|Visual Feature Match| ID_VIS["Detected Visual Category"]

    ID_TAG --> CROSS{"Cross-Verification Match?"}
    ID_VIS --> CROSS

    CROSS -- Verified --> OK["Cart Updated Cleanly"]
    CROSS -- Discrepancy --> REJECT["Flag Potential Fraud / Mislabeling"]
```

| Metric / Dimension | RFID Approach (Current) | Computer Vision / YOLO (Future) |
| :--- | :--- | :--- |
| **Identification Accuracy** | 99.9% (Exact UID Match) | 85 - 95% (Subject to occlusion & lighting) |
| **Processing Overhead** | Very Low (< 10ms on ESP32) | High (Requires GPU / Edge NPU like Jetson) |
| **Catalog Scalability** | Infinite (1:1 Tag mapping) | Requires re-training model for new packaging |
| **Implementation Cost** | Low (~$5 per cart reader) | Moderate-High (Camera + Edge Compute unit) |
| **Role in SmartCart** | **Primary Identification Technology** | **Secondary Anti-Theft Verification Layer** |

---

## 8. Digital Payment Gateway Integration

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant PAY as Payment Gateway (UPI/Stripe)
    participant DB as SQLite DB

    Customer->>UI: Clicks "Proceed to Pay"
    UI->>API: POST /transactions/checkout/{cart_id}
    API->>DB: Create Transaction (Status: Pending)
    API->>PAY: Generate Payment Order & QR Payload
    PAY-->>API: Payment Order ID & QR URL
    API-->>UI: Return Transaction & QR Data
    UI-->>Customer: Render UPI QR Code
    Customer->>PAY: Scans QR & Authorizes Payment
    PAY->>API: Payment Webhook Callback (Status: Success)
    API->>DB: Update Transaction -> Paid, Cart -> Closed
    API-->>UI: Payment Complete Notification
    UI-->>Customer: Display Digital Receipt
```

---

## 9. Future ROS 2 Autonomous Robotics Interface

The shopping cart frame can be mounted on a differential drive mobile robot platform operating under ROS 2. The billing subsystem remains entirely decoupled, communicating with the ROS 2 navigation stack over lightweight network topics/APIs.

```mermaid
graph TB
    subgraph SmartCart Billing Engine
        FASTAPI["FastAPI Billing Core"]
        CART_STATE["Cart State Manager"]
    end

    subgraph Bridge Interface
        BRIDGE["REST / MQTT Gateway Bridge"]
    end

    subgraph ROS 2 Autonomous Navigation Node
        ROS_MAIN["ROS 2 Lifecycle Node"]
        NAV2["Nav2 Navigation Stack"]
        SLAM["Cartographer SLAM / AMCL"]
        TRACKING["Human Detection (YOLO / Depth Cam)"]
        MOTORS["Motor Controllers / Encoders"]
    end

    CART_STATE <--> BRIDGE
    BRIDGE <--> ROS_MAIN
    
    TRACKING -->|Target Position| NAV2
    SLAM -->|Map & Pose| NAV2
    NAV2 -->|Cmd_Vel| MOTORS
```

### Communication Contract
- **Billing $\rightarrow$ Robot**: Notify robot when cart session starts or checkout completes (e.g. stop following customer during payment).
- **Robot $\rightarrow$ Billing**: Send cart battery level, current aisle location, or obstruction alerts to shopper UI.

