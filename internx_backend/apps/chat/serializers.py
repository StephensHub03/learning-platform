from rest_framework import serializers

from apps.users.models import User

from .models import ChatRoom, Message
from .services import is_user_online


class ChatParticipantSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'role', 'avatar', 'is_online']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_is_online(self, obj):
        return is_user_online(obj.id)


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id',
            'room',
            'sender',
            'sender_username',
            'sender_full_name',
            'content',
            'timestamp',
            'is_read',
        ]
        read_only_fields = fields

    def get_sender_full_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True, read_only=True)
    course_title = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            'id',
            'room_type',
            'course',
            'course_title',
            'room_name',
            'participants',
            'unread_count',
            'last_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_course_title(self, obj):
        return obj.course.title if obj.course_id else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.exclude(sender=request.user).exclude(read_by=request.user).count()

    def get_last_message(self, obj):
        message = obj.messages.select_related('sender').order_by('-timestamp').first()
        if not message:
            return None
        return MessageSerializer(message, context=self.context).data

    def get_room_name(self, obj):
        request = self.context.get('request')
        if obj.room_type == ChatRoom.ROOM_COURSE and obj.course_id:
            return f'{obj.course.title} Group Chat'

        if not request or not request.user.is_authenticated:
            return f'Room #{obj.pk}'

        other = obj.participants.exclude(pk=request.user.pk).first()
        if other:
            return other.get_full_name() or other.username
        return f'Room #{obj.pk}'
