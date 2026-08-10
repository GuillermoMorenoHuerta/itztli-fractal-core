/*
  ITZTLI FRACTAL CORE - Firmware Personalizado con Portal Cautivo
  Versión: 2.0 - Detección de dispositivos y configuración WiFi interactiva
*/

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <mbedtls/sha256.h>
#include <ESPmDNS.h>

// ============================================================
//  PARÁMETROS PERSONALIZABLES (se llenan desde el editor)
// ============================================================
const double SEMILLA_C_REAL = -0.7269;   // ← valor del editor
const double SEMILLA_C_IMAG = 0.1889;
const double SEMILLA_LX = 2.788536;
const double SEMILLA_LY = -9.499785;
const double SEMILLA_LZ = -4.499414;

const int NUM_BOB_MAX = 10;              // ← valor del editor (máximo de BOBs que puede detectar)
const int TOTAL_CHIPS_MAX = 50;          // ← valor del editor (máximo de chips totales)

const bool SEMILLAS_AUTOMATICAS = false; // false = manual, true = derivación por email
const char* USER_EMAIL = "usuario@ejemplo.com";
const char* TIPO_DISPOSITIVO = "personalizado";
const char* MENSAJE_ACTIVACION = "Bienvenido a ITZTLI. Sistema activo.";

// ---- Credenciales Supabase (fijas) ----
const char* SUPABASE_URL = "https://rpoqukrcvkcmaqsajchk.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_eamhRTq61t3fVIMSUcRYwQ_-VLGFGJ5";

// ============================================================
//  VARIABLES GLOBALES
// ============================================================
WebServer server(80);
DNSServer dnsServer;

const byte DNS_PORT = 53;
const char* AP_SSID = "ITZTLI_CONFIG";
const char* AP_PASSWORD = "itzli2026";

String ssidGuardado = "";
String passGuardado = "";
bool wifiConfigurado = false;

// Estructura de estado de caos
struct ItztliState {
    double lx, ly, lz, zr, zi, h;
};

// Lista de dispositivos detectados (simulación)
struct Dispositivo {
    String ip;
    String nombre;
    bool activo;
    String tipo; // "LIA", "BOB", "CHIP"
};
std::vector<Dispositivo> dispositivosDetectados;

// ============================================================
//  FUNCIONES DE CAOS (idénticas a las anteriores)
// ============================================================
void itztli_init(ItztliState *s, int semilla) {
    if (SEMILLAS_AUTOMATICAS) {
        // Derivación usando email
        uint8_t hashEmail[32];
        mbedtls_sha256((uint8_t*)USER_EMAIL, strlen(USER_EMAIL), hashEmail, 0);
        int semilla_extra = (hashEmail[0] << 24) | (hashEmail[1] << 16) | (hashEmail[2] << 8) | hashEmail[3];
        s->lx = SEMILLA_LX + (semilla * 0.000001) + (semilla_extra * 0.0000001);
        s->ly = SEMILLA_LY + (semilla * 0.000001) + (semilla_extra * 0.0000001);
        s->lz = SEMILLA_LZ + (semilla * 0.000001) + (semilla_extra * 0.0000001);
        s->zr = SEMILLA_C_REAL + (semilla * 0.000001) + (semilla_extra * 0.0000001);
        s->zi = SEMILLA_C_IMAG + (semilla * 0.000001) + (semilla_extra * 0.0000001);
        s->h = 1.176699 + (semilla * 0.000001) + (semilla_extra * 0.0000001);
    } else {
        s->lx = SEMILLA_LX + (semilla * 0.000001);
        s->ly = SEMILLA_LY + (semilla * 0.000001);
        s->lz = SEMILLA_LZ + (semilla * 0.000001);
        s->zr = SEMILLA_C_REAL + (semilla * 0.000001);
        s->zi = SEMILLA_C_IMAG + (semilla * 0.000001);
        s->h = 1.176699 + (semilla * 0.000001);
    }
}

void chaotic_step(ItztliState *s) {
    // ... (mismo código que antes) ...
    double sigma = 10.0, rho = 28.0, beta = 8.0 / 3.0, dt = 0.005;
    double dx = sigma * (s->ly - s->lx);
    double dy = s->lx * (rho - s->lz) - s->ly;
    double dz = s->lx * s->ly - beta * s->lz;
    s->lx += dx * dt;
    s->ly += dy * dt;
    s->lz += dz * dt;
    if (fabs(s->lx) > 1e4) s->lx = 0.0;
    if (fabs(s->ly) > 1e4) s->ly = 0.0;
    if (fabs(s->lz) > 1e4) s->lz = 0.0;
    s->h = max(0.1, min(2.0, s->h + 0.0005 * s->lx));
    double caot = s->h * 2.0 * s->lx;
    double nzr = s->zr * s->zr - s->zi * s->zi + caot;
    double nzi = 2.0 * s->zr * s->zi + caot;
    s->zr = nzr;
    s->zi = nzi;
    if (isnan(s->zr) || isnan(s->zi)) { s->zr = 0.1; s->zi = 0.1; }
}

void generar_clave(ItztliState *s, char *output) {
    uint8_t state_bytes[40];
    memcpy(state_bytes, &s->lx, 8);
    memcpy(state_bytes + 8, &s->ly, 8);
    memcpy(state_bytes + 16, &s->lz, 8);
    memcpy(state_bytes + 24, &s->zr, 8);
    memcpy(state_bytes + 32, &s->zi, 8);
    uint8_t hash[32];
    mbedtls_sha256(state_bytes, 40, hash, 0);
    for (int i = 0; i < 16; i++) sprintf(output + i * 2, "%02X", hash[i]);
    output[32] = '\0';
}

// ============================================================
//  CONFIGURACIÓN WiFi (Portal Cautivo)
// ============================================================
void configurarWiFi() {
    // Intentar conectar con credenciales guardadas (en EEPROM o SPIFFS)
    // Por simplicidad, aquí solo usamos el portal cautivo si no hay WiFi
    // En producción, se guardaría en SPIFFS.

    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

    server.on("/", handleRoot);
    server.on("/guardar", handleGuardarWiFi);
    server.on("/scan", handleScanNetworks);
    server.begin();

    Serial.println("📡 Portal WiFi iniciado en http://" + WiFi.softAPIP().toString());
    Serial.println("Conéctate a la red 'ITZTLI_CONFIG' y abre el navegador.");

    while (!wifiConfigurado) {
        dnsServer.processNextRequest();
        server.handleClient();
        delay(10);
    }
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssidGuardado.c_str(), passGuardado.c_str());
    Serial.print("Conectando a WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n✅ Conectado! IP: " + WiFi.localIP().toString());
    wifiConfigurado = true;
}

void handleRoot() {
    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ITZTLI - Configuración WiFi</title>
<style>
body{background:#0a0a1a;color:#e0e0e0;font-family:Arial;padding:20px;max-width:400px;margin:auto}
h1{color:#e2a03f;text-align:center}
input,button{width:100%;padding:12px;margin:6px 0;border-radius:8px;border:1px solid #1a1a4a;background:#0d0d28;color:#fff;font-size:16px}
button{background:#e2a03f;color:#000;font-weight:bold;cursor:pointer}
button:hover{opacity:0.8}
</style>
</head>
<body>
<h1>🔐 ITZTLI CONFIG</h1>
<p style="color:#8899aa;">Ingresa los datos de tu red WiFi</p>
<form action="/guardar" method="POST">
<input type="text" name="ssid" placeholder="Nombre de la red (SSID)" required>
<input type="password" name="password" placeholder="Contraseña">
<button type="submit">Guardar y Conectar</button>
</form>
</body>
</html>
    )rawliteral";
    server.send(200, "text/html", html);
}

void handleGuardarWiFi() {
    if (server.hasArg("ssid")) {
        ssidGuardado = server.arg("ssid");
        passGuardado = server.arg("password");
        wifiConfigurado = true;
        server.send(200, "text/html", "<h2>✅ Configuración guardada. Reiniciando...</h2>");
        delay(1000);
        ESP.restart();
    } else {
        server.send(400, "text/plain", "Falta SSID");
    }
}

void handleScanNetworks() {
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; i++) {
        if (i) json += ",";
        json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
}

// ============================================================
//  DETECCIÓN DE DISPOSITIVOS (simulación con ping)
// ============================================================
void escanearDispositivos() {
    // Simulación: en producción se usaría mDNS o broadcast UDP.
    // Aquí generamos dispositivos ficticios para demostración.
    // En un caso real, se haría un escaneo de la red local (ping a IPs) y se buscaría
    // una respuesta específica de ITZTLI.

    // Limpiar lista anterior (solo para demo)
    if (dispositivosDetectados.empty()) {
        // Simular detección de algunos BOBs
        for (int i = 0; i < 5; i++) {
            Dispositivo d;
            d.ip = "192.168.1." + String(100 + i);
            d.nombre = "BOB-" + String(i + 1);
            d.activo = true;
            d.tipo = "BOB";
            dispositivosDetectados.push_back(d);
        }
        // Añadir un LIA simulado
        Dispositivo lia;
        lia.ip = "192.168.1.50";
        lia.nombre = "LIA-MASTER";
        lia.activo = true;
        lia.tipo = "LIA";
        dispositivosDetectados.push_back(lia);

        Serial.println("🔍 Dispositivos detectados:");
        for (auto &d : dispositivosDetectados) {
            Serial.printf("  %s (%s) - %s\n", d.nombre.c_str(), d.tipo.c_str(), d.ip.c_str());
        }
        // Notificar al usuario (en la interfaz web)
        // ...
    }
}

// ============================================================
//  REPORTE A SUPABASE (actualiza conteo de dispositivos)
// ============================================================
void reportarEstado() {
    int numLIA = 0, numBOB = 0, numChips = 0;
    for (auto &d : dispositivosDetectados) {
        if (d.tipo == "LIA") numLIA++;
        else if (d.tipo == "BOB") numBOB++;
        else numChips++;
    }
    // Si no hay dispositivos detectados, usar los valores máximos configurados
    if (numLIA == 0) numLIA = 1; // al menos la LIA actual
    if (numBOB == 0) numBOB = NUM_BOB_MAX;
    if (numChips == 0) numChips = TOTAL_CHIPS_MAX;

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/device_status";
    http.begin(url);
    http.addHeader("apikey", SUPABASE_ANON_KEY);
    http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
    http.addHeader("Content-Type", "application/json");
    String payload = "{\"email\":\"" + String(USER_EMAIL) +
                     "\",\"num_lia\":" + String(numLIA) +
                     ",\"num_bob\":" + String(numBOB) +
                     ",\"total_chips\":" + String(numChips) +
                     ",\"tipo\":\"" + String(TIPO_DISPOSITIVO) + "\"}";
    int code = http.POST(payload);
    if (code == 201 || code == 200) {
        Serial.println("✅ Estado reportado a Supabase");
    } else {
        Serial.printf("❌ Error al reportar: %d\n", code);
    }
    http.end();
}

// ============================================================
//  SERVIDOR WEB DE CONTROL (similar al anterior)
// ============================================================
void handleControlRoot() {
    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ITZTLI - Control</title>
<style>
body{background:#0a0a1a;color:#e0e0e0;font-family:Arial;padding:20px}
h1{color:#e2a03f}
.card{background:#0d0d28;border:1px solid #1a1a4a;border-radius:12px;padding:15px;margin:10px 0}
.btn{background:#00b4d8;color:#000;padding:10px;border:none;border-radius:8px;cursor:pointer;width:100%;margin:4px 0}
.btn.gold{background:#e2a03f}
.btn.red{background:#ff4444;color:#fff}
.btn.green{background:#00ff88;color:#000}
</style>
</head>
<body>
<h1>⚡ ITZTLI - Firmware Activo</h1>
<p style="color:#8899aa;">Dispositivos detectados: <span id="deviceCount">0</span></p>
<div id="devicesList"></div>
<div class="card">
    <h3>💡 Control LED</h3>
    <button class="btn" onclick="cmd('led_on')">Encender</button>
    <button class="btn red" onclick="cmd('led_off')">Apagar</button>
    <button class="btn gold" onclick="cmd('led_blink')">Parpadear</button>
    <button class="btn green" onclick="cmd('led_50')">50%</button>
</div>
<script>
function cmd(a){fetch('/cmd?action='+a).then(r=>r.text()).then(d=>alert(d));}
function actualizarDevices(){
    fetch('/api/devices').then(r=>r.json()).then(data=>{
        document.getElementById('deviceCount').textContent = data.length;
        let html = '';
        data.forEach(d => html += `<div class="card">${d.nombre} (${d.tipo}) - ${d.ip} ${d.activo?'✅':'❌'}</div>`);
        document.getElementById('devicesList').innerHTML = html;
    });
}
setInterval(actualizarDevices, 5000);
actualizarDevices();
</script>
</body>
</html>
    )rawliteral";
    server.send(200, "text/html", html);
}

void handleApiDevices() {
    String json = "[";
    for (size_t i = 0; i < dispositivosDetectados.size(); i++) {
        if (i) json += ",";
        json += "{\"nombre\":\"" + dispositivosDetectados[i].nombre + "\",\"tipo\":\"" + dispositivosDetectados[i].tipo + "\",\"ip\":\"" + dispositivosDetectados[i].ip + "\",\"activo\":" + (dispositivosDetectados[i].activo ? "true" : "false") + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
}

// ============================================================
//  SETUP Y LOOP
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(3000);
    Serial.println("\n⚡ ITZTLI Firmware Personalizado v2.0");
    Serial.println("Tipo: " + String(TIPO_DISPOSITIVO));

    // 1. Configurar WiFi (portal cautivo si no hay credenciales guardadas)
    // Por simplicidad, siempre iniciamos el portal para que el usuario pueda cambiar WiFi.
    configurarWiFi();

    // 2. Escanear dispositivos (simulación)
    escanearDispositivos();

    // 3. Reportar estado a Supabase
    reportarEstado();

    // 4. Iniciar servidor web de control
    server.on("/", handleControlRoot);
    server.on("/api/devices", handleApiDevices);
    server.on("/cmd", handleCommand);
    server.begin();
    Serial.println("🌐 Servidor web en http://" + WiFi.localIP().toString());
}

void loop() {
    server.handleClient();
    // Escanear periódicamente (cada 30 segundos)
    static unsigned long lastScan = 0;
    if (millis() - lastScan > 30000) {
        lastScan = millis();
        escanearDispositivos();
        reportarEstado();
    }
    delay(10);
}

// Manejador de comandos (LED)
void handleCommand() {
    String a = server.arg("action");
    String r = "";
    if (a == "led_on") { digitalWrite(2, HIGH); r = "LED ON"; }
    else if (a == "led_off") { digitalWrite(2, LOW); r = "LED OFF"; }
    else if (a == "led_blink") { for(int i=0;i<6;i++){digitalWrite(2,HIGH);delay(150);digitalWrite(2,LOW);delay(150);} r="BLINK"; }
    else if (a == "led_50") { analogWrite(2,128); r="50%"; }
    server.send(200, "text/plain", r);
}