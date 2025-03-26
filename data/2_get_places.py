import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# Track locations already used
used_locations = {}

def get_location(row):
    global used_locations  # Store previous locations across calls

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
                    "\n"
                    "**IF YOU CANNOT DETERMINE A LOCATION, YOU MUST STILL GUESS AND OUTPUT A SPECIFIC PLACE.**"
                )
            },
            {
                "role": "user",
                "content": f'title: "{row["title"]}", description: "{row["description"]}"'
            }
        ]
    )

    location = completion.choices[0].message.content.strip()

    # Enforce uniqueness
    base_location = location.split(",")[1].strip() if "," in location else location
    if base_location in used_locations:
        location = f"{location} (Alternative site)"  # Force variation
    used_locations[base_location] = True

    return location

# Load dataset
df = pd.read_csv("./data.csv", index_col=0)

# Apply function
df["location"] = df.apply(get_location, axis=1)

# Save results
df.to_csv("./data_with_loc.csv")
