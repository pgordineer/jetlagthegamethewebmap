import os
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
import time
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Track locations already used
used_locations = {}

def get_location(row):
    global used_locations  # Store previous locations across calls

    max_attempts = 5  # Maximum number of attempts to get a unique location
    attempt = 0
    location = ""

    while attempt < max_attempts:
        # Attempt completion request
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a location assignment assistant for a travel competition race game show. "
                        "Your task is to determine the **specific filming location** based on the title and description provided.\n\n"
                        "**STRICT RULES (NO EXCEPTIONS):**\n"
                        "✅ **ALWAYS** provide a specific location—city, landmark, or district. NEVER respond with 'various locations' or 'unclear'.\n"
                        "✅ **NO EXPLANATIONS OR JUSTIFICATIONS.** The response **must be the location ONLY**, formatted as:\n"
                        "   **'Landmark (if applicable), City, (State), Country'**\n"
                        "✅ **NO DUPLICATES.** If the same city appears across episodes, differentiate by naming a district, landmark, or nearby area.\n"
                        "✅ **NAMED LANDMARKS TAKE PRIORITY.** If a location (e.g., Eiffel Tower) is mentioned in the description, it **MUST** be used.\n"
                        "✅ **DO NOT say 'it's unclear' or 'inferred'.** Even if uncertain, make an educated guess and output **ONLY** the final location.\n"
                        "✅ **SPECIFICITY IS KEY.** Provide the most specific location possible to avoid duplicates.\n"
                        "✅ **IF THE TITLE MENTIONS A COUNTRY OR CONTINENT, THE LOCATION MUST BE WITHIN THAT REGION.**\n"
                        "\n"
                        "**IF YOU CANNOT DETERMINE A LOCATION, YOU MUST STILL GUESS AND OUTPUT A SPECIFIC PLACE.**"
                    )
                },
                {
                    "role": "user",
                    "content": f'title: "{row["title"]}", description: "{row["description"]}"\n\n'
                               f'Locations already tried: {", ".join(used_locations.keys())}'
                }
            ]
        )

        location = completion.choices[0].message.content.strip()

        # Check for uniqueness and validity
        if location not in used_locations and location.lower() != "location":
            used_locations[location] = 1
            break
        else:
            attempt += 1
            time.sleep(1)  # Wait for a second before retrying

    # If still not unique or valid, append a counter
    if location in used_locations or location.lower() == "location":
        used_locations[location] += 1
        location = f"{location} ({used_locations[location]})"
    else:
        used_locations[location] = 1

    # Remove the number and parentheses at the end of the location
    location = re.sub(r'\s*\(\d+\)$', '', location)

    return location

# Load dataset
df = pd.read_csv("./data/data.csv", index_col=0)

# Apply function
df["location"] = df.apply(get_location, axis=1)

# Save results
df.to_csv("./data/data_with_loc.csv", index=False)