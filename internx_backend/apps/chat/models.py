from django.conf import settings
from django.db import models

from apps.courses.models import Course


class ChatRoom(models.Model):
    ROOM_DIRECT = 'direct'
    ROOM_COURSE = 'course'

    ROOM_TYPE_CHOICES = [
        (ROOM_DIRECT, 'Direct'),
        (ROOM_COURSE, 'Course'),
    ]

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='chat_rooms',
        null=True,
        blank=True,
    )
    room_type = models.CharField(
        max_length=20,
        choices=ROOM_TYPE_CHOICES,
        default=ROOM_DIRECT,
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='chat_rooms',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        if self.course_id:
            return f'{self.get_room_type_display()} room for {self.course.title}'
        return f'{self.get_room_type_display()} room #{self.pk}'


class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='read_chat_messages',
        blank=True,
    )

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f'Message #{self.pk} in room #{self.room_id}'
