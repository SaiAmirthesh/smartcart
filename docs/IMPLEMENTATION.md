# SmartCart ESP32 + RFID Integration

## 1. Overview

The ESP32 is responsible for interfacing the physical SmartCart with the SmartCart backend.

Its primary responsibility is:

> **Read RFID tags → obtain RFID UID → send UID to backend → receive response**

The ESP32 should **not** maintain the product inventory or calculate the bill.

The backend handles:

* Product inventory
* RFID UID → Product mapping
* Cart creation
* Adding/removing products
* Quantity management
* Price calculation 
* Checkout
* Transactions
* Payment status

The ESP32 acts as the bridge between the physical RFID reader and the software system.

---

# 2. Overall Architecture

```text
                    SMARTCART SYSTEM
                         │
                         │ Wi-Fi
                         │
                    ┌────▼─────┐
                    │  ESP32   │
                    │           │
                    │ RFID      │
                    │ Reader    │
                    └────┬──────┘
                         │
                    RFID UID
                         │
                         ▼
                  FastAPI Backend
                         │
              ┌──────────┴──────────┐
              │                     │
          Product DB             Cart DB
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                    React Frontend
                         │
                         ▼
                   Shopping Bill
```

The physical product contains an RFID tag.

Example:

```text
Product:
    Milk

RFID UID:
    A3 B7 21 9F
```

The ESP32 reads:

```text
A3B7219F
```

and sends it to the backend.

The backend finds:

```text
A3B7219F
        ↓
Milk
        ↓
₹50
```

and adds it to the active cart.

---

# 3. Hardware Components

## Required

| Component           | Purpose                |
| ------------------- | ---------------------- |
| ESP32               | Main microcontroller   |
| MFRC522 RFID reader | Reads RFID tags        |
| RFID tags/cards     | Product identification |
| Jumper wires        | Connections            |
| Breadboard          | Prototype connections  |
| USB cable           | Programming/power      |

Optional later:

| Component        | Purpose                 |
| ---------------- | ----------------------- |
| Buzzer           | RFID scan feedback      |
| LED              | Scan/status indication  |
| OLED/LCD         | Display scan result     |
| Battery          | Portable cart operation |
| Motor controller | Robot movement          |
| Encoders         | Wheel feedback          |
| IMU              | Orientation             |
| LiDAR            | Obstacle detection      |

---

# 4. ESP32 Responsibilities

The ESP32 should perform these tasks:

```text
1. Connect to Wi-Fi
2. Connect to RFID reader
3. Continuously scan for RFID tags
4. Read RFID UID
5. Convert UID to a consistent string
6. Send UID to FastAPI
7. Receive backend response
8. Provide local feedback
9. Prevent accidental duplicate scans
10. Continue scanning
```

Example:

```text
ESP32
  │
  ├── Wi-Fi connected
  │
  ├── RFID detected
  │
  ├── UID = A3B7219F
  │
  ├── HTTP POST
  │       ↓
  │   FastAPI
  │       ↓
  │   Product found
  │       ↓
  │   Cart updated
  │
  └── ESP32 receives:
      "Milk added"
```

---

# 5. Important Design Rule

## ESP32 should NOT store the inventory

Do **not** write code like:

```cpp
if (uid == "A3B7219F") {
    product = "Milk";
    price = 50;
}
```

This would make the ESP32 responsible for the database.

Instead:

```cpp
uid = "A3B7219F";
sendToBackend(uid);
```

The backend determines what the product is.

This allows the inventory to be changed without reprogramming the ESP32.

---

# 6. Inventory Registration

Before a product can be added to a customer's cart, its RFID UID must be registered in the backend.

For example:

```text
RFID UID:  A3B7219F
Name:      Milk
Category:  Dairy
Price:     50
Stock:     20
```

Your existing backend already has a product creation endpoint:

```text
POST /products/
```

Example request:

```json
{
    "rfid_uid": "A3B7219F",
    "name": "Milk",
    "category": "Dairy",
    "price": 50,
    "stock": 20
}
```

The backend stores:

```text
products
------------------------------------------------
id | rfid_uid | name | category | price | stock
------------------------------------------------
1  | A3B7219F | Milk | Dairy    | 50    | 20
```

---

# 7. Product Registration Workflow

The administrator first registers the RFID tag.

```text
                ADMIN
                  │
                  ▼
           Scan RFID Tag
                  │
                  ▼
             Get UID
                  │
                  ▼
         Enter Product Details
                  │
                  ▼
          FastAPI /products/
                  │
                  ▼
             Database
```

Example:

```text
RFID UID
A3B7219F

Product
Milk

Category
Dairy

Price
₹50

Stock
20
```

After registration, the ESP32 doesn't need to know any of these details.

It only needs to read:

```text
A3B7219F
```

---

# 8. Starting a Shopping Cart

A shopping session begins by creating a cart.

The backend endpoint is:

```text
POST /cart/create
```

Example response:

```json
{
    "id": 1,
    "cart_code": "CART-001",
    "status": "active"
}
```

The system now has:

```text
Cart ID:
1

Cart Code:
CART-001

Status:
active
```

The ESP32 should associate RFID scans with the currently active cart.

---

# 9. Adding an Item

Suppose the customer picks up:

```text
Milk
RFID UID = A3B7219F
```

The ESP32 reads:

```text
A3B7219F
```

and calls:

```text
POST /cart/{cart_id}/add/{rfid_uid}
```

For example:

```text
POST /cart/1/add/A3B7219F
```

Backend:

```text
A3B7219F
      ↓
Find Product
      ↓
Milk
₹50
      ↓
Add to CART-001
```

Response:

```json
{
    "message": "Product added to cart",
    "product": "Milk",
    "quantity": 1,
    "price": 50
}
```

The ESP32 can then:

```text
BEEP

Milk added
₹50
```

---

# 10. Adding Multiple Items

Example customer shopping session:

```text
Scan 1
──────
Milk
₹50

Scan 2
──────
Bread
₹40

Scan 3
──────
Soap
₹35
```

Backend cart:

```text
CART-001

Milk       ×1    ₹50
Bread      ×1    ₹40
Soap       ×1    ₹35
----------------------
Subtotal         ₹125
```

The React frontend gets the cart information from:

```text
GET /cart/{cart_id}
```

and displays it.

---

# 11. Quantity Handling

If the same RFID tag is scanned again:

```text
Milk
RFID = A3B7219F
```

the backend should increase the quantity.

Example:

```text
First scan:

Milk ×1
₹50
```

Second scan:

```text
Milk ×2
₹100
```

Third scan:

```text
Milk ×3
₹150
```

The ESP32 does not need to calculate this.

It simply sends the RFID UID each time.

The backend handles:

```text
quantity += 1
```

---

# 12. Removing an Item

The system can also support removing an item.

The backend endpoint is:

```text
DELETE /cart/{cart_id}/remove/{rfid_uid}
```

Example:

```text
DELETE /cart/1/remove/A3B7219F
```

The backend will:

```text
Quantity > 1
      ↓
quantity -= 1
```

or:

```text
Quantity = 1
      ↓
Remove item from cart
```

For the first prototype, item removal can be handled from the frontend.

Later, we can add a dedicated **remove/return RFID scanning mode** to the ESP32.

---

# 13. Preventing Duplicate RFID Reads

This is extremely important.

RFID readers may detect the same tag multiple times while it remains near the reader.

Without protection:

```text
Customer places Milk near reader

RFID scan:
Milk ×1

10 ms later:
Milk ×2

10 ms later:
Milk ×3

10 ms later:
Milk ×4
```

This is obviously wrong.

The ESP32 should implement a cooldown.

Example:

```text
RFID detected
     ↓
Send UID
     ↓
Wait 2 seconds
     ↓
Allow same UID again
```

Conceptually:

```cpp
if (uid == lastUID && millis() - lastScanTime < 2000) {
    ignoreScan();
}
else {
    sendUID(uid);
    lastUID = uid;
    lastScanTime = millis();
}
```

The exact timeout can be tuned during testing.

---

# 14. Wi-Fi Configuration

The ESP32 needs to connect to the same network that can reach the FastAPI backend.

Example:

```text
Wi-Fi
SSID:
SmartCartWiFi

Password:
********
```

The ESP32 connects:

```text
ESP32
   │
   │ Wi-Fi
   ▼
Router
   │
   ▼
Computer / Raspberry Pi
   │
   ▼
FastAPI
```

---

# 15. Backend Address

During development, suppose FastAPI runs on your laptop:

```text
http://192.168.1.100:8000
```

The ESP32 should use:

```cpp
const char* SERVER_URL = "http://192.168.1.100:8000";
```

**Do not use:**

```text
http://localhost:8000
```

from the ESP32.

For the ESP32, `localhost` means:

> the ESP32 itself.

It does not mean your laptop.

---

# 16. ESP32 API Communication

For adding an item, the ESP32 will eventually perform something like:

```text
POST
/cart/1/add/A3B7219F
```

The response might be:

```json
{
    "message": "Product added to cart",
    "product": "Milk",
    "quantity": 1,
    "price": 50
}
```

The ESP32 can print:

```text
RFID: A3B7219F
Product: Milk
Price: 50
Quantity: 1
Status: ADDED
```

to the Serial Monitor.

---

# 17. ESP32 Program Flow

The main program should follow this structure:

```text
              START
                │
                ▼
          Initialize ESP32
                │
                ▼
          Connect to Wi-Fi
                │
                ▼
       Initialize MFRC522
                │
                ▼
          Start RFID Scan
                │
                ▼
         RFID Tag detected?
             /       \
           No         Yes
           │           │
           │           ▼
           │       Read UID
           │           │
           │           ▼
           │     Check duplicate
           │           │
           │           ▼
           │      Send to API
           │           │
           │           ▼
           │     Receive response
           │           │
           │           ▼
           │      Beep / LED
           │           │
           └───────────┘
```

---

# 18. Error Handling

The ESP32 should handle failures gracefully.

### Wi-Fi disconnected

```text
Wi-Fi lost
   ↓
Attempt reconnect
   ↓
Retry
```

### Product not found

Backend:

```json
{
    "detail": "Product not found"
}
```

ESP32:

```text
RFID: A3B7219F

ERROR:
Product not registered
```

### Cart not found

```text
ERROR:
Cart unavailable
```

### Backend unavailable

```text
ERROR:
Server unavailable
```

The ESP32 should **not crash or stop scanning permanently**.

---

# 19. Recommended LED/Buzzer Feedback

For the physical prototype:

### Successful scan

```text
RFID detected
     ↓
Short beep
     ↓
Green LED
```

### Unknown product

```text
RFID detected
     ↓
Two/three short beeps
     ↓
Red LED
```

### Backend unavailable

```text
Long beep
     ↓
Red LED
```

This gives the customer immediate feedback without requiring them to look at the phone/UI.

---

# 20. ESP32 + Backend Security

For the initial college prototype:

```text
ESP32
   ↓
HTTP
   ↓
FastAPI
```

is acceptable on a private Wi-Fi network.

For a production version, use:

```text
HTTPS
+
Authentication
+
Device credentials
+
API authorization
```

Do not put database credentials inside the ESP32.

---

# 21. Robot Integration

The ESP32 responsible for RFID does **not necessarily need to control the robot motors**.

We should keep the responsibilities separated.

```text
                 SMARTCART
                     │
       ┌─────────────┴─────────────┐
       │                           │
 RFID ESP32                    Robot Computer
       │                           │
       │                           ├── Camera
       │                           ├── LiDAR
       │                           ├── IMU
       │                           ├── Odometry
       │                           └── ROS 2
       │
       ▼
   FastAPI
       │
       ▼
   React UI
```

The robot side can use:

```text
ROS 2 Jazzy
```

with topics such as:

```text
/pi_camera/image_raw
/scan
/cmd_vel
/wheel_ticks
/wheel/odometry
/tf
/tf_static
/robot_description
/imu/data
```

The RFID subsystem remains independent.

---

# 22. Future Robot Architecture

Eventually:

```text
                         SMARTCART
                            │
             ┌──────────────┴──────────────┐
             │                             │
        RFID Subsystem                Robot Subsystem
             │                             │
          ESP32                         Raspberry Pi
             │                             │
             │                       ┌─────┴─────┐
             │                       │   ROS 2   │
             │                       └─────┬─────┘
             │                             │
             │               ┌─────────────┼─────────────┐
             │               │             │             │
             │            Camera         LiDAR          IMU
             │               │             │             │
             │               ▼             ▼             ▼
             │          Human Tracking  Obstacle      Odometry
             │               │          Avoidance        │
             │               └─────────────┬─────────────┘
             │                             │
             │                          /cmd_vel
             │                             │
             │                             ▼
             │                        Motor Driver
             │                             │
             │                             ▼
             │                           Wheels
             │
             ▼
        FastAPI Backend
             │
       ┌─────┴──────┐
       │            │
   Product DB    Cart DB
       │            │
       └─────┬──────┘
             │
             ▼
         React UI
```

---

# 23. Development Phases

## Phase 1 — RFID Hardware

Goal:

```text
ESP32 + MFRC522
```

Verify:

* ESP32 programming
* SPI communication
* RFID detection
* UID reading

Serial output:

```text
RFID detected
UID: A3B7219F
```

---

## Phase 2 — Wi-Fi

Verify:

```text
ESP32
  ↓
Wi-Fi
  ↓
Network
```

Serial output:

```text
Connecting...
WiFi connected
IP: 192.168.1.50
```

---

## Phase 3 — Backend Communication

ESP32 sends:

```text
A3B7219F
```

to FastAPI.

Verify:

```text
ESP32 → FastAPI
```

---

## Phase 4 — Inventory Registration

Register several products:

```text
A3B7219F → Milk
B821AC42 → Bread
C921FF13 → Soap
D72A109B → Biscuit
```

Verify:

```text
RFID UID
   ↓
Correct product
```

---

## Phase 5 — Cart Integration

Create:

```text
CART-001
```

Then scan:

```text
Milk
Bread
Soap
```

Verify the backend returns:

```text
Milk ×1
Bread ×1
Soap ×1
```

---

## Phase 6 — Frontend Integration

The React dashboard should automatically show:

```text
SMARTCART

Cart: CART-001

Product       Qty      Price
--------------------------------
Milk           1       ₹50
Bread          1       ₹40
Soap           1       ₹35

Total: ₹125
```

---

## Phase 7 — Checkout

When shopping is complete:

```text
Cart
 ↓
Checkout
 ↓
Transaction
 ↓
Payment
 ↓
Receipt
```

This uses your existing:

```text
POST /transactions/checkout/{cart_id}
```

endpoint.

---

# 24. Testing Checklist

### ESP32

* [ ] ESP32 uploads successfully
* [ ] MFRC522 detected
* [ ] RFID UID read correctly
* [ ] Multiple tags detected
* [ ] Duplicate scans prevented
* [ ] Wi-Fi connects
* [ ] Wi-Fi reconnect works

### Backend

* [ ] RFID UID registered
* [ ] Product lookup works
* [ ] Cart creation works
* [ ] Product addition works
* [ ] Quantity increment works
* [ ] Product removal works
* [ ] Cart total correct
* [ ] Checkout works

### Frontend

* [ ] Active cart displayed
* [ ] Product appears after RFID scan
* [ ] Quantity updates
* [ ] Total updates
* [ ] Checkout works
* [ ] Transaction displayed

### End-to-End

```text
RFID TAG
   ↓
MFRC522
   ↓
ESP32
   ↓
Wi-Fi
   ↓
FastAPI
   ↓
Database
   ↓
React
   ↓
Bill
```

Every part should work without manually entering product information.

---

# 25. Repository Structure

I'd put the ESP32 code here:

```text
smartcart/
│
├── backend/
│
├── frontend/
│
├── hardware/
│   ├── esp32/
│   │   ├── README.md
│   │   ├── rfid_scanner/
│   │   │   └── rfid_scanner.ino
│   │   └── wiring/
│   │       └── mfrc522_esp32.md
│   │
│   └── robot/
│       └── README.md
│
├── smartcart_ws/
│   └── src/
│       └── ... ROS 2 packages ...
│
└── docs/
```

---

# 26. Final Design Principle

The most important rule for the entire project is:

```text
ESP32 = Hardware Interface
FastAPI = Business Logic
Database = Source of Truth
React = User Interface
ROS 2 = Robot/Autonomous Layer
```

So:

```text
ESP32
  │
  │ "I detected RFID A3B7219F"
  ▼
FastAPI
  │
  │ "That's Milk, ₹50"
  ▼
Database
  │
  │ "Add Milk to CART-001"
  ▼
React
  │
  │ "Milk ×1 — ₹50"
  ▼
Customer
```

This separation will make it much easier to integrate the **real robot later** without rewriting your billing system.
