import pandas as pd
import requests
import json
import re  # Import regex module for removing parenthesis/brackets
import unicodedata  # Import for normalizing characters

# Load data_with_loc.json
with open("./data/data_with_loc.json", "r", encoding="utf-8") as file:
    data = json.load(file)

df = pd.DataFrame(data)

# Limit to the first 10 records for testing
#df = df.head(10)

# Debug: Print the first few rows to verify the data
print("Loaded Data (First 5 Rows):")
print(df.head())

# Load existing geocoded data if available
try:
    with open("./data/geocoded.json", "r", encoding="utf-8") as file:
        geocoded_data = json.load(file)
    geocoded_dict = {item["videoId"]: item["geocode"] for item in geocoded_data}
    print("Loaded existing geocoded data.")
except FileNotFoundError:
    geocoded_dict = {}
    print("No existing geocoded data found. Starting fresh.")

header = {
    "User-Agent": "jetlagthegamethewebmap/0.0 (pgordineer@gmail.com)"
}

API = "https://nominatim.openstreetmap.org/search"

i = 0

def remove_parenthesis(location):
    """
    Remove parenthesis/brackets and their contents from the location string.
    """
    return re.sub(r"\s*[\(\[\{].*?[\)\]\}]\s*", " ", location).strip()

def normalize_location(location):
    """
    Normalize the location string by removing special characters and simplifying.
    """
    # Normalize characters to remove diacritics
    normalized = unicodedata.normalize('NFKD', location).encode('ASCII', 'ignore').decode('utf-8')
    # Remove special characters and extra spaces
    simplified = re.sub(r'[^a-zA-Z0-9,\s]', '', normalized).strip()
    return simplified

def simplify_location(location, tier=1):
    """
    Simplify the location string by normalizing and iteratively removing parts from the beginning.
    """
    location = normalize_location(location)  # Normalize and simplify the location
    parts = location.split(",")  # Split by commas

    # Remove parts iteratively based on the tier
    if tier <= len(parts):
        return ",".join(parts[tier - 1:]).strip()
    return location.strip()

def fuzzy_geocode(location):
    """
    Perform a backup fuzzy search for the location by iteratively simplifying the query.
    """
    for tier in range(1, len(location.split(",")) + 1):
        simplified_location = simplify_location(location, tier)
        print(f"Attempting fuzzy search (Tier {tier}) with simplified location: {simplified_location}")
        resp = requests.get(API, params={"format": "geojson", "q": simplified_location}, headers=header)
        if resp.status_code == 200:
            geocode_result = resp.json()
            if is_valid_geocode(geocode_result):
                return geocode_result
    return None

def is_valid_geocode(geocode):
    """
    Check if the geocode data contains valid features or is a valid list.
    """
    if isinstance(geocode, list) and len(geocode) > 0:
        return True
    return False

def geocode_with_google(location, api_key):
    """
    Use Google Geocoding API to fetch geocode data for a given location.
    """
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": location,
        "key": api_key
    }
    resp = requests.get(url, params=params)
    if resp.status_code == 200:
        geocode_result = resp.json()
        if geocode_result.get("status") == "OK":
            return geocode_result["results"]
        else:
            print(f"Google Geocoding API error: {geocode_result.get('status')} - {geocode_result.get('error_message', 'No error message')}.")
    else:
        print(f"HTTP error {resp.status_code} when accessing Google Geocoding API.")
    return None

# Update geocode function to skip re-checking data already stored in the export datasets
def geocode(row):
    global i
    i += 1
    print(i, end='\r')

    # Skip geocoding if videoId is already in geocoded.json
    if row["videoId"] in geocoded_dict:
        print(f"Skipping geocoding for video ID {row['videoId']} as it is already processed.")
        return geocoded_dict[row["videoId"]]

    # Use Google Geocoding API
    geocode_result = geocode_with_google(row["location"], api_key)
    if geocode_result:
        return geocode_result

    # Perform a backup fuzzy search
    print(f"Primary geocode failed for {row['location']}. Attempting fuzzy search...")
    for tier in range(1, len(row["location"].split(",")) + 1):
        simplified_location = simplify_location(row["location"], tier)
        print(f"Attempting fuzzy search (Tier {tier}) with simplified location: {simplified_location}")
        geocode_result = geocode_with_google(simplified_location, api_key)
        if geocode_result:
            return geocode_result

    return None

def load_api_key():
    """
    Load the API key from a .env file or environment variable.
    """
    from dotenv import load_dotenv
    import os
    load_dotenv()
    return os.getenv("GOOGLE_API_KEY")

# Load API key from .env
api_key = load_api_key()

df["geocode"] = df.apply(geocode, axis=1)

# Save the updated geocoded data back to JSON
geocoded_json = df.to_json(orient="records", indent=4)
with open("./data/geocoded.json", "w", encoding="utf-8") as file:
    json.dump(json.loads(geocoded_json), file, ensure_ascii=False, indent=4)

# Save a copy to ./web/src/data/data.json
with open("./web/src/data/data.json", "w", encoding="utf-8") as file:
    json.dump(json.loads(geocoded_json), file, ensure_ascii=False, indent=4)

print("Geocoded data saved to geocoded.json and ./web/src/data/data.json.")