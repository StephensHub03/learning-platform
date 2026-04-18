from django.db import transaction
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.courses.models import Course
from apps.users.models import User

from .models import ChatRoom
from .serializers import ChatRoomSerializer, MessageSerializer
from .services import find_direct_room, sync_course_room_participants, user_can_access_course


class ChatRoomViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ChatRoom.objects.filter(participants=self.request.user)
            .select_related('course')
            .prefetch_related('participants')
            .distinct()
        )

    def _get_course_or_404(self, course_id):
        return Course.objects.select_related('faculty').get(pk=course_id)

    def _validate_direct_room_access(self, user, participant, course=None):
        if user == participant:
            return 'You cannot open a direct chat with yourself.'

        if user.role == 'admin' or participant.role == 'admin':
            return None

        roles = {user.role, participant.role}
        if roles != {'student', 'faculty'}:
            return 'Direct chat is limited to student and faculty pairs.'

        if course:
            if not user_can_access_course(user, course):
                return 'You do not have access to that course.'
            if course.faculty_id not in {user.id, participant.id}:
                return 'The selected faculty member is not assigned to this course.'
            if course.enrollments.filter(student_id__in=[user.id, participant.id], is_active=True).count() == 0:
                return 'Direct chat requires an active course relationship.'
            return None

        if user.role == 'student':
            shared_course_exists = Course.objects.filter(
                faculty=participant,
                enrollments__student=user,
                enrollments__is_active=True,
            ).exists()
        else:
            shared_course_exists = Course.objects.filter(
                faculty=user,
                enrollments__student=participant,
                enrollments__is_active=True,
            ).exists()

        if not shared_course_exists:
            return 'Direct chat requires the student and faculty member to share an active course.'

        return None

    @action(detail=False, methods=['post'], url_path='direct')
    def direct(self, request):
        participant_id = request.data.get('participant_id')
        course_id = request.data.get('course_id')

        if not participant_id:
            return Response({'detail': 'participant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            participant = User.objects.get(pk=participant_id)
        except User.DoesNotExist:
            return Response({'detail': 'Participant not found.'}, status=status.HTTP_404_NOT_FOUND)

        course = None
        if course_id:
            try:
                course = self._get_course_or_404(course_id)
            except Course.DoesNotExist:
                return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        validation_error = self._validate_direct_room_access(request.user, participant, course)
        if validation_error:
            return Response({'detail': validation_error}, status=status.HTTP_403_FORBIDDEN)

        room = find_direct_room(request.user.id, participant.id)
        if not room:
            with transaction.atomic():
                room = ChatRoom.objects.create(room_type=ChatRoom.ROOM_DIRECT, course=course)
                room.participants.add(request.user, participant)

        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='course-room')
    def course_room(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'detail': 'course_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = self._get_course_or_404(course_id)
        except Course.DoesNotExist:
            return Response({'detail': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_course(request.user, course):
            return Response({'detail': 'You do not have access to this course chat.'}, status=status.HTTP_403_FORBIDDEN)

        room = ChatRoom.objects.filter(room_type=ChatRoom.ROOM_COURSE, course=course).first()
        if not room:
            room = ChatRoom.objects.create(room_type=ChatRoom.ROOM_COURSE, course=course)

        sync_course_room_participants(room)
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        room = self.get_object()
        try:
            limit = min(int(request.query_params.get('limit', 100)), 200)
        except (TypeError, ValueError):
            limit = 100
        queryset = room.messages.select_related('sender').order_by('-timestamp')[:limit]
        serializer = MessageSerializer(list(reversed(queryset)), many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        room = self.get_object()
        messages = room.messages.exclude(sender=request.user).exclude(read_by=request.user)
        updated_message_ids = []
        for message in messages:
            message.read_by.add(request.user)
            if not message.is_read:
                message.is_read = True
                message.save(update_fields=['is_read'])
            updated_message_ids.append(message.id)

        return Response({'message_ids': updated_message_ids})
