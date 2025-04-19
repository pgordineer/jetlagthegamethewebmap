import pandas as pd
import requests
import json

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

def geocode(row):
    global i
    i += 1
    print(i, end='\r')
    if row["videoId"] in geocoded_dict:
        return geocoded_dict[row["videoId"]]  # Use existing geocode if available
    if row["location"] == "no location found":
        return None
    resp = requests.get(API, params={"format": "geojson", "q": row["location"]}, headers=header)
    if resp.status_code == 200:
        return resp.json()
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