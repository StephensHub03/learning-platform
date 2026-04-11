"""
Django admin registrations for all apps.
Provides full CRUD for platform management through /admin/.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.users.models import User
from apps.courses.models import Course, Enrollment, Category
from apps.sessions.models import LiveSession
from apps.assignments.models import Assignment, Question, Choice
from apps.results.models import Result, Answer, Progress
from apps.certificates.models import Certificate


# ── Users ──────────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'get_full_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('InternX Info', {'fields': ('role', 'phone', 'bio', 'avatar')}),
    )


# ── Courses ─────────────────────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'faculty', 'level', 'status', 'enrolled_count', 'created_at']
    list_filter = ['status', 'level', 'category']
    search_fields = ['title', 'faculty__email']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'status', 'enrolled_at']
    list_filter = ['status']


# ── Sessions ─────────────────────────────────────────────────────────────
@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = ['course', 'title', 'scheduled_at', 'status']
    list_filter = ['status']


# ── Assignments ──────────────────────────────────────────────────────────
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['course', 'title', 'pass_percentage', 'is_active', 'auto_certificate']
    list_filter = ['is_active', 'auto_certificate']
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'text', 'marks', 'order']
    inlines = [ChoiceInline]


# ── Results ──────────────────────────────────────────────────────────────
@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['student', 'assignment', 'percentage', 'status', 'submitted_at']
    list_filter = ['status']


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'completion_percentage', 'is_completed']


# ── Certificates ─────────────────────────────────────────────────────────
@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'certificate_id', 'issued_at', 'is_emailed']
    list_filter = ['is_emailed']
    search_fields = ['student__email', 'certificate_id']
    readonly_fields = ['certificate_id', 'issued_at']
