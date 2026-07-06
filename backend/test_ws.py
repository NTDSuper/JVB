import asyncio
import websockets

async def test_ws():
    uri = "ws://localhost:8000/api/chat/ws/test-session?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBzdXBlcm1hcmtldC5jb20iLCJ1c2VybmFtZSI6ImFkbWluIiwiZXhwIjoxNzgzMDA5MTY4LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiNjRlODYzMDItNDA0Yi00YmUyLTg5YzktMjE2ZDhkMjAyMjlmIn0.f1gBrz87eFFij7Q0pKQ3-yzFNHL9dv2s-of0XA-A2RM"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected!")
            await ws.send('{"message": "test"}')
            res = await ws.recv()
            print("Received:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(test_ws())
