import boto3
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

region = "ap-southeast-2"

client = boto3.client(
    "bedrock-runtime",
    region_name=region,
)

print("Testing Amazon Bedrock...")

try:
    response = client.converse(
        modelId="amazon.nova-micro-v1:0",
        messages=[
            {
                "role": "user",
                "content": [
                    {"text": "Hello! Introduce yourself as AirGuard AI."}
                ],
            }
        ],
    )

    print(response["output"]["message"]["content"][0]["text"])

except Exception as e:
    print(type(e).__name__, str(e))
