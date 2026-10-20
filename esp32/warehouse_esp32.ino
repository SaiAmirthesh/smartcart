/*
  ESP32 + RC522 RFID  ->  Warehouse Dashboard
  The ESP32 creates its own Wi-Fi network (Access Point).
  Connect your laptop to it, then open dashboard.html.

  Library needed (Arduino IDE -> Library Manager):  "MFRC522" by GithubCommunity

  Wiring (RC522 -> ESP32):
    SDA(SS) -> GPIO 5
    SCK     -> GPIO 18
    MOSI    -> GPIO 23
    MISO    -> GPIO 19
    RST     -> GPIO 22
    GND     -> GND
    3.3V    -> 3V3   (NOT 5V!)
*/

#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>

// ---------- Wi-Fi hotspot created by the ESP32 ----------
const char* AP_SSID = "Warehouse-ESP32";
const char* AP_PASS = "12345678";          // min 8 characters

// ---------- RFID pins ----------
#define SS_PIN  5
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

// ---------- Your products ----------
// Tap each tag once, read its UID in the Serial Monitor (115200 baud),
// then paste the UIDs below.
struct Product {
  const char* uid;
  const char* name;
  int price;
};

Product products[] = {
  {"AA:BB:CC:DD", "Product A", 499},   // <-- replace with tag 1 UID
  {"11:22:33:44", "Product B", 899},   // <-- replace with tag 2 UID
};
const int PRODUCT_COUNT = sizeof(products) / sizeof(products[0]);

// ---------- Scan log (kept in memory) ----------
struct Scan {
  unsigned long id;
  String uid;
  String name;
  int price;
  unsigned long ms;
};

const int MAX_SCANS = 50;
Scan scans[MAX_SCANS];
int scanCount = 0;
unsigned long nextId = 1;

WebServer server(80);

void addCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
}

void handleScans() {
  addCors();
  unsigned long since = server.hasArg("since") ? server.arg("since").toInt() : 0;
  String json = "{\"uptime\":" + String(millis()) + ",\"scans\":[";
  bool first = true;
  for (int i = 0; i < scanCount; i++) {
    if (scans[i].id <= since) continue;
    if (!first) json += ",";
    first = false;
    json += "{\"id\":" + String(scans[i].id) +
            ",\"uid\":\"" + scans[i].uid + "\"" +
            ",\"name\":\"" + scans[i].name + "\"" +
            ",\"price\":" + String(scans[i].price) +
            ",\"ms\":" + String(scans[i].ms) + "}";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void handleClear() {
  addCors();
  scanCount = 0;
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleRoot() {
  addCors();
  server.send(200, "text/plain", "ESP32 Warehouse API is running. Open dashboard.html on your laptop.");
}

String uidToString(MFRC522::Uid &uid) {
  String s = "";
  for (byte i = 0; i < uid.size; i++) {
    if (i) s += ":";
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void addScan(const String& uid, const String& name, int price) {
  if (scanCount == MAX_SCANS) {                // drop oldest
    for (int i = 1; i < MAX_SCANS; i++) scans[i - 1] = scans[i];
    scanCount--;
  }
  scans[scanCount++] = {nextId++, uid, name, price, millis()};
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println();
  Serial.print("Hotspot: "); Serial.println(AP_SSID);
  Serial.print("API IP : "); Serial.println(WiFi.softAPIP());   // usually 192.168.4.1

  server.on("/", handleRoot);
  server.on("/api/scans", handleScans);
  server.on("/api/clear", handleClear);
  server.begin();
}

void loop() {
  server.handleClient();

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = uidToString(rfid.uid);
  String name = "Unknown Tag";
  int price = 0;

  for (int i = 0; i < PRODUCT_COUNT; i++) {
    if (uid == products[i].uid) {
      name = products[i].name;
      price = products[i].price;
      break;
    }
  }

  addScan(uid, name, price);
  Serial.printf("Tap -> UID: %s | %s | Rs.%d\n", uid.c_str(), name.c_str(), price);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(600);                                  // debounce so one tap = one scan
}
