#define HELTEC_POWER_BUTTON
#include <heltec_unofficial.h>

bool messageReceived = false; // Variable to track if message was received

void setup() {
  heltec_setup();
  Serial.begin(115200);
  Serial.println("Receiver Mode: Initialized");

  // LoRa initialization
  if (radio.begin() != RADIOLIB_ERR_NONE) {
    display.println("Radio init failed");
    while (true); // Halt
  }
  display.println("Receiver Ready");
}

void loop() {
  // Check if a message is received
  String receivedMessage = "";
  int state = radio.receive(receivedMessage);

  if (state == RADIOLIB_ERR_NONE) {
    if (!messageReceived) { // Only show the received message once
      Serial.print("Received: ");
      Serial.println(receivedMessage);
      display.println("Received: ");
      display.println(receivedMessage);
      messageReceived = true; // Set the flag to true after receiving a message
    }
  } else {
    // Only show error if no message is received and previously received a message
    if (messageReceived) {
      messageReceived = false; // Reset the flag after message is no longer received
    }
    // If you want to show the receive error again after some condition (like timeout), you can do that here.
    // For now, the receiver error message won't print after receiving a message.
  }

  delay(100); // Check for messages every 100ms

}
