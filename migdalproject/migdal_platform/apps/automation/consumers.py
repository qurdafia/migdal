import json
from channels.generic.websocket import AsyncWebsocketConsumer

class JobLogConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Grab the Job Run ID from the URL
        self.run_id = self.scope['url_route']['kwargs']['run_id']
        
        # 2. Define the unique Redis channel name for this specific job run
        self.room_group_name = f'job_logs_{self.run_id}'

        # 3. Join the Redis channel
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # 4. Accept the WebSocket connection from React
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the Redis channel when React closes the terminal or the job finishes
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # 5. This is triggered by Celery whenever there is a new log line!
    async def job_log_message(self, event):
        message = event['message']

        # 6. Push the log line down the WebSocket to React
        await self.send(text_data=json.dumps({
            'message': message
        }))