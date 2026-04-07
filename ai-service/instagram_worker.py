import os
import json
import logging
import requests
from dotenv import load_dotenv
from apify_client import ApifyClient
from groq import Groq

# Setup
logging.basicConfig(level=logging.INFO)
load_dotenv()

APIFY_TOKEN = os.getenv("APIFY_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SYSTEM_API_KEY = os.getenv("SYSTEM_API_KEY", "nitk_secret_worker_key")
BACKEND_URL = "http://localhost:5000/api"

if not APIFY_TOKEN or not GROQ_API_KEY:
    logging.error("Missing APIFY_TOKEN or GROQ_API_KEY in .env!")
    exit(1)

apify_client = ApifyClient(APIFY_TOKEN)
groq_client = Groq(api_key=GROQ_API_KEY)

def fetch_clubs():
    """Fetch all registered clubs from the Express backend."""
    try:
        response = requests.get(f"{BACKEND_URL}/clubs")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Failed to fetch clubs: {e}")
        return []

def scrape_instagram_profiles(handles):
    """Scrape the given handles using Apify."""
    logging.info(f"Triggering Apify scraper for: {handles}")
    run_input = {
        "usernames": handles,
        "resultsLimit": 1, # Only need the exact profile
    }
    
    # Run the Apify Instagram Profile Scraper Actor
    run = apify_client.actor("apify/instagram-profile-scraper").call(run_input=run_input)
    
    # Fetch results
    items = []
    for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
        items.append(item)
    return items

def analyze_post_with_groq(image_url, caption):
    """Pass the image and caption to Groq Vision to extract Event JSON."""
    logging.info("Sending post to Groq Llama Vision...")
    
    from datetime import datetime
    today_str = datetime.today().strftime('%Y-%m-%d')
    
    system_prompt = f"""
    You are an automated JSON extraction assistant for a university calendar.
    Analyze the provided Instagram poster image and its caption.
    Is this announcing an upcoming club event, recruitment, or workshop?

    IMPORTANT DATE FILTER:
    Today's date is {today_str}.
    You MUST extract the date of the event. If the event date is strictly BEFORE {today_str} (it is a past event), you MUST return EXACTLY `{{}}` and nothing else. Do not scrape past events!

    If YES (it is a future or present event): Extract and return a strict JSON payload with the following keys:
    {{
      "title": "Short event name",
      "date": "YYYY-MM-DD",
      "time": "HH:MM AM/PM",
      "venue": "Location name",
      "description": "Short 2 sentence summary",
      "registrationLink": "URL if any, or empty string",
      "eligibility": "Who can attend, or empty string"
    }}
    If NO (it's a meme, irrelevant post, or not an event): Return EXACTLY `{{}}`
    Return ONLY valid JSON. No markdown, no backticks, no explanations.
    """
    
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Analyze this Instagram caption for an upcoming club event.\n\nCaption: {caption}"
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        output = response.choices[0].message.content.strip()
        
        # Clean up if the model wrapped it in markdown anyway
        if output.startswith("```json"):
            output = output[7:-3]
        elif output.startswith("```"):
            output = output[3:-3]
            
        return json.loads(output)
    except Exception as e:
        logging.error(f"Groq API Error: {e}")
        return {}

def push_event_to_backend(club_id, event_data, image_url):
    """Save the parsed event to our database via the Express API."""
    payload = {
        "clubId": club_id,
        "title": event_data.get("title"),
        "date": event_data.get("date"),
        "time": event_data.get("time") or "",
        "venue": event_data.get("venue") or "NITK Surathkal",
        "description": event_data.get("description"),
        "registrationLink": event_data.get("registrationLink") or "",
        "imageUrl": image_url,
        "eligibility": event_data.get("eligibility") or ""
    }
    
    logging.info(f"Pushing event {payload['title']} to backend...")
    try:
        res = requests.post(
            f"{BACKEND_URL}/events",
            json=payload,
            headers={"x-api-key": SYSTEM_API_KEY}
        )
        res.raise_for_status()
        logging.info("Successfully registered event in Database!")
    except Exception as e:
        logging.error(f"Failed to push event: {e}")

if __name__ == "__main__":
    logging.info("Starting Instagram Automation Worker...")
    clubs = fetch_clubs()
    if not clubs:
        logging.info("No clubs found in DB, nothing to scrape.")
        exit(0)
        
    # Map handles to DB Club IDs
    club_map = {}
    for c in clubs:
        raw_handle = c.get('handle', '')
        if not raw_handle:
            continue
        # If user pasted a full URL, extract just the username
        clean_handle = raw_handle.rstrip('/').split('/')[-1].replace('@', '').lower()
        club_map[clean_handle] = c['id']
        
    # We still pass the original raw handles to Apify since it handles URLs well
    handles_to_scrape = [c.get('handle') for c in clubs if c.get('handle')]
    
    # Scrape data from Apify
    scraped_profiles = scrape_instagram_profiles(handles_to_scrape)
    
    for profile in scraped_profiles:
        handle = profile.get("username").lower()
        club_id = club_map.get(handle)
        
        if not club_id:
            continue
            
        latest_posts = profile.get("latestPosts", [])
        if not latest_posts:
            continue
            
        # For prototype, we just look at the absolute latest post
        # In production, check against a tracking file to skip duplicates
        latest_post = latest_posts[0]
        image_url = latest_post.get("displayUrl")
        caption = latest_post.get("caption") or ""
        
        logging.info(f"Analyzing latest post for @{handle}...")
        event_json = analyze_post_with_groq(image_url, caption)
        
        if event_json and event_json.get("title"):
            logging.info(f"Event found! Title: {event_json['title']}")
            push_event_to_backend(club_id, event_json, image_url)
        else:
            logging.info(f"@{handle}'s latest post is not an event.")
            
    logging.info("Worker run complete.")
