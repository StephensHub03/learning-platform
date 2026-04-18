from django.core.cache import cache
from django.db.models import Count

from apps.courses.models import Course

from .models import ChatRoom


ONLINE_CONNECTION_TTL = 60 * 10
ONLINE_STATUS_TTL = 60 * 2


def get_user_connection_key(user_id):
    return f'chat:user:{user_id}:connections'


def get_user_online_key(user_id):
    return f'chat:user:{user_id}:online'


def mark_user_online(user_id):
    connection_key = get_user_connection_key(user_id)
    count = int(cache.get(connection_key, 0) or 0) + 1
    cache.set(connection_key, count, timeout=ONLINE_CONNECTION_TTL)
    cache.set(get_user_online_key(user_id), True, timeout=ONLINE_STATUS_TTL)


def refresh_user_online(user_id):
    if cache.get(get_user_online_key(user_id)):
        cache.set(get_user_online_key(user_id), True, timeout=ONLINE_STATUS_TTL)


def mark_user_offline(user_id):
    connection_key = get_user_connection_key(user_id)
    count = int(cache.get(connection_key, 0) or 0)
    if count <= 1:
        cache.delete(connection_key)
        cache.delete(get_user_online_key(user_id))
        return

    cache.set(connection_key, count - 1, timeout=ONLINE_CONNECTION_TTL)
    cache.set(get_user_online_key(user_id), True, timeout=ONLINE_STATUS_TTL)


def is_user_online(user_id):
    return bool(cache.get(get_user_online_key(user_id)))


def user_can_access_course(user, course):
    if user.role == 'admin':
        return True
    if course.faculty_id == user.id:
        return True
    return course.enrollments.filter(student=user, is_active=True).exists()


def sync_course_room_participants(room):
    if not room.course_id:
        return room

    course = Course.objects.select_related('faculty').prefetch_related(
        'enrollments__student'
    ).get(pk=room.course_id)

    participant_ids = [course.faculty_id]
    participant_ids.extend(
        course.enrollments.filter(is_active=True).values_list('student_id', flat=True)
    )
    room.participants.set(sorted(set(participant_ids)))
    return room


def find_direct_room(user_a_id, user_b_id):
    return (
        ChatRoom.objects.filter(room_type=ChatRoom.ROOM_DIRECT, participants=user_a_id)
        .filter(participants=user_b_id)
        .annotate(participant_count=Count('participants', distinct=True))
        .filter(participant_count=2)
        .first()
    )
