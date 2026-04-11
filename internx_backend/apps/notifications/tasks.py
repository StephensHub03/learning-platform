"""
Celery tasks for InternX notification system.
Tasks:
  - send_registration_email: welcome email on sign-up
  - send_enrollment_email: confirmation on course enrollment
  - generate_and_send_certificate: PDF generation + email with attachment
"""
import io
import logging
from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_registration_email(self, user_id: int):
    """Send welcome email to new user after registration."""
    try:
        from apps.users.models import User
        user = User.objects.get(id=user_id)

        subject = 'Welcome to InternX! 🎓'
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; padding: 30px; text-align: center;">
                <h1 style="color: #c9a84c; margin: 0;">InternX</h1>
                <p style="color: white; margin: 5px 0;">AI Internship Learning Platform</p>
            </div>
            <div style="padding: 30px; background: #f8f6f0;">
                <h2 style="color: #1e3a5f;">Welcome, {user.get_full_name()}! 👋</h2>
                <p>Your account has been successfully created.</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.get_role_display()}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/login"
                       style="background: #c9a84c; color: white; padding: 14px 28px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Start Learning →
                    </a>
                </div>
                <p style="color: #666; font-size: 12px; text-align: center;">
                    InternX · education@internx.com
                </p>
            </div>
        </div>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=f'Welcome to InternX, {user.get_full_name()}!',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send()
        logger.info(f'Registration email sent to {user.email}')

    except Exception as exc:
        logger.error(f'Failed to send registration email: {exc}')
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_enrollment_email(self, enrollment_id: int):
    """Send enrollment confirmation email."""
    try:
        from apps.courses.models import Enrollment
        enrollment = Enrollment.objects.select_related('student', 'course').get(
            id=enrollment_id
        )
        user = enrollment.student
        course = enrollment.course

        subject = f'Enrolled in "{course.title}" 🎓'
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; padding: 30px; text-align: center;">
                <h1 style="color: #c9a84c; margin: 0;">InternX</h1>
            </div>
            <div style="padding: 30px; background: #f8f6f0;">
                <h2 style="color: #1e3a5f;">You're enrolled! 🚀</h2>
                <p>Hi {user.first_name}, you've successfully enrolled in:</p>
                <div style="background: white; border-left: 4px solid #c9a84c;
                            padding: 16px; margin: 16px 0; border-radius: 4px;">
                    <h3 style="margin: 0; color: #1e3a5f;">{course.title}</h3>
                    <p style="margin: 6px 0; color: #666;">
                        Faculty: {course.faculty.get_full_name()} ·
                        Duration: {course.duration_weeks} weeks · Level: {course.level}
                    </p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="{settings.FRONTEND_URL}/courses/{course.id}"
                       style="background: #c9a84c; color: white; padding: 14px 28px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Go to Course →
                    </a>
                </div>
            </div>
        </div>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=f'Enrolled in {course.title}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send()
        logger.info(f'Enrollment email sent to {user.email} for {course.title}')

    except Exception as exc:
        logger.error(f'Failed to send enrollment email: {exc}')
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def generate_and_send_certificate(self, result_id: int):
    """
    Generate PDF certificate and email it to the student.
    Steps:
      1. Get/create Certificate record
      2. Generate PDF with ReportLab
      3. Save PDF to media storage
      4. Send email with PDF attachment
    """
    try:
        from apps.results.models import Result
        from apps.certificates.models import Certificate
        from apps.certificates.generator import create_and_save_certificate

        result = Result.objects.select_related(
            'student', 'assignment', 'assignment__course'
        ).get(id=result_id)

        # Get or create certificate record
        cert, created = Certificate.objects.get_or_create(
            student=result.student,
            course=result.assignment.course,
            defaults={'result': result}
        )

        if created or not cert.pdf_file:
            cert = create_and_save_certificate(cert)

        # Send email with PDF attachment
        user = result.student
        course = result.assignment.course

        subject = f'🏆 Your InternX Certificate – {course.title}'
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e3a5f; padding: 30px; text-align: center;">
                <h1 style="color: #c9a84c; margin: 0;">🎓 Congratulations!</h1>
            </div>
            <div style="padding: 30px; background: #f8f6f0;">
                <h2 style="color: #1e3a5f;">
                    Well done, {user.first_name}!
                </h2>
                <p>You have successfully completed <strong>{course.title}</strong>
                   with a score of <strong>{result.percentage:.1f}%</strong>.</p>
                <p>Your certificate is attached to this email and can also be
                   downloaded from your dashboard.</p>
                <p>Certificate ID: <code>{cert.certificate_id}</code></p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="{settings.FRONTEND_URL}/verify-certificate/{cert.certificate_id}"
                       style="background: #c9a84c; color: white; padding: 14px 28px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Verify Certificate →
                    </a>
                </div>
            </div>
        </div>
        """

        msg = EmailMultiAlternatives(
            subject=subject,
            body=f'Your certificate for {course.title} is attached.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')

        # Attach PDF
        if cert.pdf_file:
            with cert.pdf_file.open('rb') as pdf:
                msg.attach(
                    f'InternX_Certificate_{cert.certificate_id}.pdf',
                    pdf.read(),
                    'application/pdf'
                )

        msg.send()

        cert.is_emailed = True
        cert.save(update_fields=['is_emailed'])

        logger.info(
            f'Certificate generated and emailed to {user.email} for {course.title}'
        )

    except Exception as exc:
        logger.error(f'Failed to generate/send certificate: {exc}')
        raise self.retry(exc=exc)
