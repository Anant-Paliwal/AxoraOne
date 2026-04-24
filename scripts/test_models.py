"""
Test script to verify all AI models are working with OpenRouter
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# All models from the /models endpoint
MODELS_TO_TEST = [
    # FREE MODELS
    ("google/gemini-2.0-flash-exp:free", "Gemini 2.0 Flash (Free)"),
    ("nvidia/nemotron-nano-12b-v2-vl:free", "Nemotron Nano 12B (Free)"),
    ("meta-llama/llama-3.2-3b-instruct:free", "Llama 3.2 3B (Free)"),
    ("meta-llama/llama-3.1-8b-instruct:free", "Llama 3.1 8B (Free)"),
    ("microsoft/phi-3-mini-128k-instruct:free", "Phi-3 Mini (Free)"),
    ("qwen/qwen-2-7b-instruct:free", "Qwen 2 7B (Free)"),
    # PAID MODELS (will test if you have credits)
    ("gpt-4o-mini", "GPT-4o Mini"),
    ("anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet"),
]

TEST_PROMPT = "Say 'Hello, I am working!' in one sentence."

async def test_model(model_id: str, model_name: str):
    """Test a single model"""
    print(f"\n{'='*60}")
    print(f"Testing: {model_name}")
    print(f"Model ID: {model_id}")
    print(f"{'='*60}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Axora Learning Platform"
                },
                json={
                    "model": model_id,
                    "messages": [
                        {"role": "user", "content": TEST_PROMPT}
                    ],
                    "max_tokens": 50
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"✅ SUCCESS")
                print(f"Response: {content}")
                return True, content
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                print(f"❌ FAILED (Status {response.status_code})")
                print(f"Error: {error_data}")
                return False, str(error_data)
                
    except Exception as e:
        print(f"❌ EXCEPTION")
        print(f"Error: {str(e)}")
        return False, str(e)

async def main():
    """Test all models"""
    print("\n" + "="*60)
    print("AI MODEL TESTING SUITE")
    print("="*60)
    print(f"OpenRouter API Key: {'✅ Found' if OPENROUTER_API_KEY else '❌ Missing'}")
    print(f"Testing {len(MODELS_TO_TEST)} models...")
    
    if not OPENROUTER_API_KEY:
        print("\n❌ ERROR: OPENROUTER_API_KEY not found in backend/.env")
        return
    
    results = []
    
    for model_id, model_name in MODELS_TO_TEST:
        success, response = await test_model(model_id, model_name)
        results.append({
            "model_id": model_id,
            "model_name": model_name,
            "success": success,
            "response": response
        })
        
        # Small delay between requests to avoid rate limiting
        await asyncio.sleep(2)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    working_models = [r for r in results if r["success"]]
    failed_models = [r for r in results if not r["success"]]
    
    print(f"\n✅ Working Models: {len(working_models)}/{len(results)}")
    for r in working_models:
        print(f"   • {r['model_name']}")
    
    if failed_models:
        print(f"\n❌ Failed Models: {len(failed_models)}/{len(results)}")
        for r in failed_models:
            print(f"   • {r['model_name']}")
            # Show first 100 chars of error
            error_preview = str(r['response'])[:100]
            print(f"     Error: {error_preview}...")
    
    print("\n" + "="*60)
    print("RECOMMENDATIONS")
    print("="*60)
    
    if working_models:
        print(f"\n✅ You can use these models:")
        for r in working_models[:3]:  # Show top 3
            print(f"   • {r['model_name']} ({r['model_id']})")
    else:
        print("\n❌ No models are working. Check:")
        print("   1. OPENROUTER_API_KEY is valid")
        print("   2. You have credits (for paid models)")
        print("   3. Free models are not rate-limited")
        print("   4. Your internet connection is working")

if __name__ == "__main__":
    asyncio.run(main())
