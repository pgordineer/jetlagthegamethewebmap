import pandas as pd
import requests
import json
import re  # Import regex module for removing parenthesis/brackets

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

def simplify_location(location, tier=1):
    """
    Simplify the location string to make it less precise for broader searches.
    Tier 1: Remove parenthesis and use the last two parts (e.g., city and country).
    Tier 2: Remove parenthesis and use only the last part (e.g., country).
    """
    location = remove_parenthesis(location)  # Remove parenthesis/brackets
    parts = location.split(",")  # Split by commas
    if tier == 1 and len(parts) > 1:
        return ",".join(parts[-2:]).strip()  # Use only the last two parts
    elif tier == 2 and len(parts) > 0:
        return parts[-1].strip()  # Use only the last part
    return location.strip()

def fuzzy_geocode(location, tier=1):
    """
    Perform a backup fuzzy search for the location using a simplified query.
    """
    simplified_location = simplify_location(location, tier)
    print(f"Attempting fuzzy search (Tier {tier}) with simplified location: {simplified_location}")
    resp = requests.get(API, params={"format": "geojson", "q": simplified_location}, headers=header)
    if resp.status_code == 200:
        return resp.json()
    else:
        return None

def is_valid_geocode(geocode):
    """
    Check if the geocode data contains valid features.
    """
    return geocode and geocode.get("features")

def geocode(row):
    global i
    i += 1
    print(i, end='\r')
    if row["videoId"] in geocoded_dict:
        cached_geocode = geocoded_dict[row["videoId"]]
        if is_valid_geocode(cached_geocode):  # Ensure cached data has valid features
            return cached_geocode
        else:
            print(f"Invalid cached geocode for {row['videoId']}. Re-fetching...")
    if row["location"] == "no location found":
        return None
    resp = requests.get(API, params={"format": "geojson", "q": row["location"]}, headers=header)
    if resp.status_code == 200:
        geocode_result = resp.json()
        if is_valid_geocode(geocode_result):  # Check if primary search returned valid data
            return geocode_result
        else:
            # Perform a backup fuzzy search (Tier 1)
            print(f"Primary geocode failed for {row['location']}. Attempting fuzzy search (Tier 1)...")
            fuzzy_result = fuzzy_geocode(row["location"], tier=1)
            if is_valid_geocode(fuzzy_result):
                return fuzzy_result
            # Perform a second backup fuzzy search (Tier 2)
            print(f"Fuzzy search (Tier 1) failed for {row['location']}. Attempting fuzzy search (Tier 2)...")
            return fuzzy_geocode(row["location"], tier=2)
    else:
        return None

df["geocode"] = df.apply(geocode, axis=1)

# Save the updated geocoded data back to JSON
geocoded_json = df.drop(columns=["description"]).to_json(orient="records", indent=4)
with open("./data/geocoded.json", "w", encoding="utf-8") as file:
    json.dump(json.loads(geocoded_json), file, ensure_ascii=False, indent=4)

# Save a copy to ./web/src/data/data.json
with open("./web/src/data/data.json", "w", encoding="utf-8") as file:
    json.dump(json.loads(geocoded_json), file, ensure_ascii=False, indent=4)

print("Geocoded data saved to geocoded.json and ./web/src/data/data.json.")