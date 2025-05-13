import csv
import time
import threading
from math import sin, cos, sqrt, atan2, radians
import dronekit_sitl
import os.path
from dronekit import connect, VehicleMode, LocationGlobalRelative
import argparse
import serial
import sqlite3
from typing import List, Tuple
	


# LoRa Serial Configuration
PORT = '/dev/ttyUSB0'  # Adjust to match your LoRa device
BAUD_RATE = 115200



parser = argparse.ArgumentParser(description='Commands vehicle using vehicle.simple_goto.')
parser.add_argument('--connect', default='/dev/ttyACM0')  # Use your connection string
args = parser.parse_args()
connection_string = args.connect

print(f'Connecting to vehicle on: {connection_string}')
vehicle = connect(connection_string, wait_ready=True)
time.sleep(3)
############
battery_voltage = vehicle.battery.voltage
print(f"Low battery ({battery_voltage}V). Returning to takeoff location...")
############
print("Fetching current latitude and longitude.. ")
latitude = vehicle.location.global_frame.lat
longitude = vehicle.location.global_frame.lon
print(f'Current latitude: {latitude}, longitude: {longitude}')
print(f'Vehicle mode: {vehicle.mode}')

# Load GPS mapping table from CSV
csv_gmap = "/home/jetson/Documents/celle_wise/helipad_gps_mapping.csv"  # Update with the correct path

# Read CSV and store GPS mapping in a dictionary
gps_mapping = {}
with open(csv_gmap, mode='r') as file:
    reader = csv.reader(file)
    next(reader)  # Skip header row
    for row in reader:
        try:
            row_idx, col_idx, lat, lon = int(row[0]), int(row[1]), float(row[2]), float(row[3])
            gps_mapping[(row_idx, col_idx)] = (lat, lon)
        except ValueError:
            print(f"Skipping invalid row: {row}")


      

# List of waypoints based on GPS mapping table
def get_selected_waypoints(gps_mapping):
    waypoints = []
    waypoint_indices = []

    # List of specific waypoints 
    specific_waypoints = [(2,3), (5,4), (8,3), (9,1), (9,4), (8,1), (8,4), (7,1), (7,4), (6,1), (6,4), (5,1), (5,4), (4,1)]
    
    for (row, col) in specific_waypoints:
        if (row, col) in gps_mapping:
            lat, lon = gps_mapping[(row, col)]
            waypoints.append((lat, lon, 10))  # Altitude set to 10 meters
            waypoint_indices.append((row, col))

    return waypoints, waypoint_indices

waypoints, indices = get_selected_waypoints(gps_mapping)

# Function to arm and take off
def arm_and_takeoff(aTargetAltitude):
    try:
        print("Arming motors...")
        vehicle.mode = VehicleMode("GUIDED")
        vehicle.armed = True
        time.sleep(5)
        while not vehicle.armed:
            print("Waiting for arming...")
            time.sleep(1)
        print("Taking off!")
        vehicle.simple_takeoff(aTargetAltitude)
        time.sleep(5)

        while True:
            print("Altitude: ", vehicle.location.global_relative_frame.alt)
            if vehicle.location.global_relative_frame.alt >= aTargetAltitude * 0.95:
                print("Reached target altitude")
                break
            time.sleep(1)
    except Exception as e:
        print(f"Error during takeoff: {e}")

# Function to compute distance between two locations
def distance_to(current_location, other_location):
    R = 6371000.0  # Radius of Earth in meters
    lat1, lon1 = radians(current_location.lat), radians(current_location.lon)
    lat2, lon2 = radians(other_location.lat), radians(other_location.lon)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

# Function to send row and column via LoRa when reaching the waypoint
def get_recent_person_count():
    """Fetches the most recent person count from the database."""
    db_path = "/home/jetson/Documents/yolov5-master/yolov5/person_count.db"  # Update with the correct path
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT count FROM person_count ORDER BY timestamp DESC LIMIT 1")
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0]
        else:
            print("No data found in database.")
            return None
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None

def send_lora_message(message):
    """Sends a message via LoRa."""
    try:
        with serial.Serial('/dev/ttyUSB0', 115200, timeout=1) as ser:
            ser.write(f"{message}\n".encode())
            print(f"LoRa Sent: {message}")
    except Exception as e:
        print(f"Error in LoRa communication: {e}")

def waypoint_traversal():
    try:
        print("Airspeed and groundspeed set to 1")
        vehicle.airspeed = 2    
        vehicle.groundspeed = 2
        print("Initiating waypoint traversal...")

        takeoff_location = vehicle.location.global_relative_frame
        print(f"Takeoff Location: ({takeoff_location.lat}, {takeoff_location.lon}, {takeoff_location.alt})")

        for idx, (waypoint, (row, col)) in enumerate(zip(waypoints, indices), 1):
            # Check battery before navigating to the next waypoint
            battery_voltage = vehicle.battery.voltage            
            if battery_voltage <=9.5:
                print(f"Low battery ({battery_voltage}V). Aborting mission and returning to takeoff location...")
                break  # Exit the loop to return home, but don’t return yet
            
            target_location = LocationGlobalRelative(*waypoint)
            print(f"Waypoint {idx}: Navigating to ({waypoint[0]}, {waypoint[1]}) - Grid Cell: ({row}, {col})")
            vehicle.simple_goto(target_location)
            
            while True:
                current_location = vehicle.location.global_relative_frame
                if distance_to(current_location, target_location) < 0.5:
                    time.sleep(1)  # Hold position briefly
                    person_count = get_recent_person_count() or 0
                    message = f"{row},{col},{person_count}"
                    print(f"Reached waypoint {idx} - Sending: {message} over LoRa")
                    send_lora_message(message)
                    break
                time.sleep(1)

        # Return to takeoff location after all waypoints or if battery is low
        print("All waypoints completed or mission aborted. Returning to takeoff location...")
        vehicle.simple_goto(takeoff_location)
        while distance_to(vehicle.location.global_relative_frame, takeoff_location) > 0.5:
            time.sleep(1)
        print("Returned to takeoff location. Landing...")
        vehicle.mode = VehicleMode("LAND")
        
    except Exception as e:
        print(f"Error during waypoint traversal: {e}")
        # Emergency return on exception
        print("Emergency return to takeoff location...")
        vehicle.simple_goto(takeoff_location)
        while distance_to(vehicle.location.global_relative_frame, takeoff_location) > 0.5:
            time.sleep(1)
        vehicle.mode = VehicleMode("LAND")


# Threading to handle functions concurrently
def start_threads():
    vehicle_thread = threading.Thread(target=waypoint_traversal)
    vehicle_thread.start()
    vehicle_thread.join()

# Main execution
if __name__ == "__main__":
    try:
        arm_and_takeoff(10)  # Example altitude
        start_threads()
    except KeyboardInterrupt:
        print("Program interrupted by user.")
        vehicle.mode = VehicleMode("LAND")
        vehicle.close()
        print("Drone landing and closed.")
