#define HELTEC_POWER_BUTTON
#include <heltec_unofficial.h>

void setup() {
  heltec_setup();
  Serial.begin(115200);
  Serial.println("Sender Mode: Initialized");

  // LoRa initialization
  if (radio.begin() != RADIOLIB_ERR_NONE) {
    display.println("Radio init failed");
    while (true); // Halt
  }
  display.println("Sender Ready");
}

void loop() {
  // Check if data is available in Serial Monitor
  if (Serial.available()) {
    String message = Serial.readString();  // Read the whole input string
   
    // Transmit the message
    int state = radio.transmit(message.c_str());
   
    if (state == RADIOLIB_ERR_NONE) {
      Serial.println("Message Sent: " + message);
      display.println("Message Sent");
      display.println(message);
    } else {
      Serial.printf("Transmit Error: %d\n", state);
      display.printf("TX Error: %d\n", state);
    }
  }

  delay(100); // Check every 100ms for new data

}
