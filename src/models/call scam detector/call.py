# analyze_recording_vosk_groq_fallback.py

import json
import os
import re
from groq import Groq
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment

# --- 1. Groq API Analysis Function ---
def analyze_text_with_groq(text: str) -> (str, str):
    """
    Analyzes text for scams using the Groq API with a powerful LLM.
    """
    # --- NEW: Check for environment variable and use hardcoded key as a fallback ---
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY environment variable not set. Using a hardcoded key.")
        api_key = "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" # Your fallback key

    # --- UPDATED: Pass the api_key variable to the client ---
    client = Groq(api_key=api_key)
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert scam detection AI. Analyze the user's text, which is a transcript of a phone call. "
                        "Your primary goal is to determine if the call is a scam. "
                        "Respond ONLY with a JSON object containing two keys: 'classification' and 'reason'. "
                        "The 'classification' value must be either 'Scam' or 'Not Scam'. "
                        "The 'reason' value should be a brief, one-sentence explanation for your decision. And add the part of the transcript that led to your decision in the 'reason' field. "
                    )
                },
                {
                    "role": "user",
                    "content": f"Here is the call transcript:\n\n{text}"
                }
            ],
            model="llama3-8b-8192",
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        
        response_content = chat_completion.choices[0].message.content
        result = json.loads(response_content)
        
        classification = result.get("classification", "Error")
        reason = result.get("reason", "Could not parse the model's response.")
        
        icon = "🚨" if classification == "Scam" else "✅"
        
        return f"{icon} {classification}", f"({reason})"

    except json.JSONDecodeError:
        return "❌ Error", "(Failed to decode the JSON response from the model.)"
    except Exception as e:
        return "❌ Error", f"(An API error occurred: {e})"

# --- 2. Main Execution ---
if __name__ == "__main__":
    # --- Get User Input for Language and File Path ---
    lang = input("Choose language for transcription (en/hi): ").strip().lower()
    vosk_model_path = "model-hi" if lang == "hi" else "model-en"
    audio_file_path = input("Enter the full path to the audio file: ").strip().strip('"')

    # --- Validate Inputs ---
    if not os.path.exists(vosk_model_path):
        print(f"❌ Failed to find Vosk model at '{vosk_model_path}'. Please ensure it's downloaded.")
        exit()
    if not os.path.exists(audio_file_path):
        print(f"❌ Audio file not found at: {audio_file_path}")
        exit()
        
    # --- Load Vosk Model ---
    try:
        vosk_model = Model(vosk_model_path)
        recognizer = KaldiRecognizer(vosk_model, 16000)
    except Exception as e:
        print(f"❌ Error loading Vosk model: {e}")
        exit()

    # --- Process the Audio File with Vosk ---
    try:
        print(f"\nLoading and converting audio file: {os.path.basename(audio_file_path)}...")
        audio = AudioSegment.from_file(audio_file_path)
        audio = audio.set_frame_rate(16000).set_channels(1)

        print("🎤 Transcribing the entire file with Vosk...")
        
        recognizer.AcceptWaveform(audio.raw_data)
        
        result_json = recognizer.FinalResult()
        result = json.loads(result_json)
        full_transcript = result.get("text", "").strip()
        
        print("\n✅ Transcription complete.")

        # --- Analyze the Full Transcript with Groq ---
        if full_transcript:
            print("\n" + "="*25 + " Full Transcript " + "="*25)
            print(full_transcript)
            print("="*70)

            print("\nAnalyzing the full transcript with Groq...")
            prediction, note = analyze_text_with_groq(full_transcript)
            print(f"\n>>> Final Analysis: {prediction} {note}\n")
        else:
            print("\n⚠️ No text was transcribed from the audio file.")

    except Exception as e:
        print(f"\n❌ An error occurred during processing: {e}")