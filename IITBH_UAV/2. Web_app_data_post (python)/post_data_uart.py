import requests
import serial
import time

# Configure the serial port (adjust COM port and baud rate as needed)
SERIAL_PORT = 'COM4'  # Change this to your COM port (e.g., 'COM3' on Windows or '/dev/ttyUSB0' on Linux)
BAUD_RATE = 115200      # Adjust baud rate to match your device

def parse_serial_data(serial_data):
    """Parse the incoming serial data into row, col, survivor, flood, and BuildingDamage."""
    try:
        # Assuming data c+-omes in the format "row,col,survivor,flood,BuildingDamage" (e.g., "1,9,3,0,1")
        values = serial_data.strip().split(',')
        if len(values) != 5:
            raise ValueError("Invalid data format. Expected 5 values.")
        
        row = int(values[0])
        col = int(values[1])
        survivor = int(values[2])
        flood = int(values[3])
        building_damage = int(values[4])

        # Validate non-negative values
        if any(v < 0 for v in [row, col, survivor, flood, building_damage]):
            raise ValueError("Values must be non-negative.")
        
        return {
            'row': row,
            'col': col,
            'survivors': survivor,  # Match the key used in the Google Sheet
            'flood': flood,
            'buildingDamage': building_damage
        }
    except ValueError as e:
        print(f"Error parsing data: {e}")
        return None

def send_data_to_google_sheet(data):
    """Send the parsed data to the Google Apps Script web app."""
    web_app_url = 'https://script.google.com/macros/s/AKfycbwNrmVyiFoLnMNrEB4bJapW96p-NHtf2K1bAZDly3fjmXduw1zKAziw6twGhoEbozVs5A/exec'
    
    try:
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = requests.post(web_app_url, data=data, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("Google Sheet updated successfully!")
            print("Response:", response.text)
        else:
            print(f"Failed to update sheet. Status Code: {response.status_code}, Response: {response.text}")
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error: {conn_err}")
    except requests.exceptions.Timeout as timeout_err:
        print(f"Request timed out: {timeout_err}")
    except Exception as e:
        print(f"Error sending request: {e}")

def main():
    # Initialize serial connection
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"Connected to {SERIAL_PORT} at {BAUD_RATE} baud.")
    except serial.SerialException as e:
        print(f"Failed to connect to serial port: {e}")
        return

    try:
        while True:
            # Read data from the serial port
            if ser.in_waiting > 0:
                serial_data = ser.readline().decode('utf-8').strip()
                print(f"Received data: {serial_data}")
                
                # Parse the incoming data
                parsed_data = parse_serial_data(serial_data)
                
                if parsed_data:
                    # Send the data to Google Sheet
                    send_data_to_google_sheet(parsed_data)
            
            # Small delay to avoid overwhelming the CPU
            time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        ser.close()
        print("Serial connection closed.")

if __name__ == "__main__":
    main()