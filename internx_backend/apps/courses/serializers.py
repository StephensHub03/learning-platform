"""Serializers for courses and enrollments."""
from rest_framework import serializers
from .models import Course, Enrollment, Category
from apps.users.serializers import UserProfileSerializer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class CourseSerializer(serializers.ModelSerializer):
    """Course with faculty info and enrollment count."""

    faculty_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    enrolled_count = serializers.ReadOnlyField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail',
            'faculty', 'faculty_name', 'category', 'category_name',
            'level', 'status', 'duration_weeks', 'max_students',
            'is_free', 'price', 'enrolled_count', 'is_enrolled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'enrolled_count', 'created_at', 'updated_at']

    def get_faculty_name(self, obj):
        return obj.faculty.get_full_name()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(
                student=request.user, is_active=True
            ).exists()
        return False

    def create(self, validated_data):
        from django.utils.text import slugify
        import uuid
        title = validated_data.get('title', '')
        base_slug = slugify(title)
        slug = base_slug
        # Ensure unique slug
        if Course.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{str(uuid.uuid4())[:8]}'
        validated_data['slug'] = slug
        validated_data['faculty'] = self.context['request'].user
        return super().create(validated_data)


class EnrollmentSerializer(serializers.ModelSerializer):
    """Student enrollment details."""

    course_title = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'course', 'course_title',
            'status', 'is_active', 'enrolled_at', 'completed_at'
        ]
        read_only_fields = ['student', 'enrolled_at']

    def get_course_title(self, obj):
        return obj.course.title

    def get_student_name(self, obj):
        return obj.student.get_full_name()
