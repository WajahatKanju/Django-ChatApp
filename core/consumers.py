import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model

from asgiref.sync import sync_to_async
from datetime import datetime
from core.models import MessageModel
from django.contrib.auth.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.sender_username = self.scope["url_route"]["kwargs"]["sender"]
        self.recipient_username = self.scope["url_route"]["kwargs"][
            "recipient"
        ]  # noqa:
        self.user = await self.user_exists(self.sender_username)
        self.recipient = await self.user_exists(self.recipient_username)

        if self.user and self.recipient:
            room = [self.user.username, self.recipient.username]
            room.sort()
            self.room_group_name = "".join(map(str, room))

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name,
            )
            await self.accept()
        else:
            # User is not authenticated, session key is invalid,
            # or recipient does not exist
            await self.close(code=403)

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data)
        message = data["message"]
        sender = self.user.username  # Get the sender from the current user

        # Check if the sender is not the recipient before sending the message
        if self.user != self.recipient:
            await self.save_message(self.user, self.recipient, message)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": message,
                    "sender": sender,
                    # Include the sender information in the event
                },
            )

    async def chat_message(self, event):
        message = event["message"]
        sender = event["sender"]  # Use the sender from the event parameter

        message_object = {
            "user": sender,
            "recipient": self.recipient.username,
            "body": message,
            "timestamp": str(datetime.now()),
        }
        await self.send(text_data=json.dumps(message_object))

    async def get_user_from_session_key(self, session_key):
        session = await database_sync_to_async(Session.objects.get)(
            session_key=session_key
        )
        user_id = session.get_decoded().get("_auth_user_id")

        if user_id:
            User = get_user_model()
            user = await database_sync_to_async(User.objects.get)(pk=user_id)
            return user
        else:
            return None

    async def user_exists(self, username):
        User = get_user_model()
        return await database_sync_to_async(User.objects.get)(
            username=username,
        )

    @sync_to_async
    def save_message(self, user, recipient, body):
        pass

        user = User.objects.get(username=user.username)
        recipient = User.objects.get(username=recipient.username)
        MessageModel.objects.create(user=user, recipient=recipient, body=body)
