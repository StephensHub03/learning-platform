from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import ChatRoom, Message
from .services import (
    mark_user_offline,
    mark_user_online,
    refresh_user_online,
    sync_course_room_participants,
)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room = await self.get_room()
        if not self.room:
            await self.close(code=4004)
            return

        self.room_group_name = f'chat_room_{self.room_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.mark_online()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence.event',
                'user_id': self.user.id,
                'is_online': True,
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        user = getattr(self, 'user', None)
        if user and user.is_authenticated:
            await self.mark_offline()
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'presence.event',
                        'user_id': user.id,
                        'is_online': False,
                    },
                )

    async def receive_json(self, content, **kwargs):
        await self.refresh_online()
        event_type = content.get('type')

        if event_type == 'message':
            text = (content.get('message') or '').strip()
            if not text:
                return

            message = await self.create_message(text)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'message': message,
                },
            )
            return

        if event_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.typing',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_typing': bool(content.get('is_typing')),
                },
            )
            return

        if event_type == 'read':
            message_ids = await self.mark_room_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.read_receipt',
                    'user_id': self.user.id,
                    'message_ids': message_ids,
                },
            )

    async def chat_message(self, event):
        await self.send_json(
            {
                'type': 'message',
                **event['message'],
            }
        )

    async def chat_typing(self, event):
        await self.send_json(
            {
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }
        )

    async def chat_read_receipt(self, event):
        await self.send_json(
            {
                'type': 'read_receipt',
                'user_id': event['user_id'],
                'message_ids': event['message_ids'],
            }
        )

    async def presence_event(self, event):
        await self.send_json(
            {
                'type': 'presence',
                'user_id': event['user_id'],
                'is_online': event['is_online'],
            }
        )

    @database_sync_to_async
    def get_room(self):
        room = (
            ChatRoom.objects.select_related('course')
            .prefetch_related('participants')
            .filter(pk=self.room_id, participants=self.user)
            .first()
        )
        if room and room.course_id:
            sync_course_room_participants(room)
            if not room.participants.filter(pk=self.user.pk).exists():
                return None
        return room

    @database_sync_to_async
    def create_message(self, text):
        message = Message.objects.create(room_id=self.room_id, sender=self.user, content=text)
        message.read_by.add(self.user)
        return {
            'id': message.id,
            'sender': self.user.username,
            'sender_id': self.user.id,
            'message': message.content,
            'content': message.content,
            'timestamp': message.timestamp.isoformat(),
            'is_read': message.is_read,
        }

    @database_sync_to_async
    def mark_room_read(self):
        room = ChatRoom.objects.get(pk=self.room_id)
        message_ids = []
        for message in room.messages.exclude(sender=self.user).exclude(read_by=self.user):
            message.read_by.add(self.user)
            if not message.is_read:
                message.is_read = True
                message.save(update_fields=['is_read'])
            message_ids.append(message.id)
        return message_ids

    @database_sync_to_async
    def mark_online(self):
        mark_user_online(self.user.id)

    @database_sync_to_async
    def refresh_online(self):
        refresh_user_online(self.user.id)

    @database_sync_to_async
    def mark_offline(self):
        mark_user_offline(self.user.id)
