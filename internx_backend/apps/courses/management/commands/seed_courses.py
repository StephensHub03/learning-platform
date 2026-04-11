"""
Management command: python manage.py seed_courses
Creates 10 sample courses with categories, assigned to the admin user.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.contrib.auth import get_user_model
from apps.courses.models import Category, Course

User = get_user_model()

COURSES = [
    {
        'category': 'Web Development',
        'title': 'Full-Stack Web Development with React & Django',
        'description': (
            'Master modern full-stack development. Build production-ready web apps '
            'using React on the frontend and Django REST Framework on the backend. '
            'Topics include JWT auth, REST APIs, PostgreSQL, and deployment on Ubuntu VPS.'
        ),
        'level': 'intermediate',
        'duration_weeks': 12,
        'max_students': 50,
        'price': 2999.00,
    },
    {
        'category': 'Web Development',
        'title': 'HTML, CSS & JavaScript for Beginners',
        'description': (
            'Start your web journey from scratch. Learn HTML5 semantic structure, '
            'CSS3 Flexbox and Grid, and vanilla JavaScript. Build 5 real projects '
            'including a portfolio site and a to-do app.'
        ),
        'level': 'beginner',
        'duration_weeks': 6,
        'max_students': 80,
        'price': 999.00,
    },
    {
        'category': 'Data Science',
        'title': 'Python for Data Science and Machine Learning',
        'description': (
            'Learn Python from the ground up and apply it to real data problems. '
            'Covers NumPy, Pandas, Matplotlib, Scikit-learn, and an introduction '
            'to deep learning with TensorFlow. Includes 3 capstone projects.'
        ),
        'level': 'intermediate',
        'duration_weeks': 10,
        'max_students': 60,
        'price': 3499.00,
    },
    {
        'category': 'Data Science',
        'title': 'SQL and Database Design Fundamentals',
        'description': (
            'Understand relational databases from the ground up. Learn SQL queries, '
            'joins, subqueries, indexing, normalization, and database design best '
            'practices using PostgreSQL and MySQL.'
        ),
        'level': 'beginner',
        'duration_weeks': 4,
        'max_students': 100,
        'price': 799.00,
    },
    {
        'category': 'Cloud and DevOps',
        'title': 'DevOps Engineering with Docker and Kubernetes',
        'description': (
            'Go from code to production confidently. Learn Docker containerization, '
            'GitHub Actions CI/CD pipelines, Kubernetes orchestration, and cloud '
            'deployment on AWS. Hands-on labs for every topic.'
        ),
        'level': 'advanced',
        'duration_weeks': 16,
        'max_students': 40,
        'price': 4999.00,
    },
    {
        'category': 'Cloud and DevOps',
        'title': 'Linux and Shell Scripting for Developers',
        'description': (
            'Get comfortable with the Linux command line. Master shell scripting, '
            'process management, networking commands, cron jobs, and system '
            'administration tasks needed for any backend or DevOps role.'
        ),
        'level': 'beginner',
        'duration_weeks': 5,
        'max_students': 70,
        'price': 1299.00,
    },
    {
        'category': 'Mobile Development',
        'title': 'React Native: Build iOS and Android Apps',
        'description': (
            'Build cross-platform mobile apps with a single codebase using React Native. '
            'Covers navigation, state management with Redux, REST API integration, '
            'push notifications, and publishing to App Store and Play Store.'
        ),
        'level': 'intermediate',
        'duration_weeks': 10,
        'max_students': 45,
        'price': 3499.00,
    },
    {
        'category': 'Cybersecurity',
        'title': 'Ethical Hacking and Penetration Testing',
        'description': (
            'Learn how to think like a hacker to defend systems. Covers network '
            'scanning, vulnerability assessment, web application attacks (OWASP Top 10), '
            'social engineering, and writing professional pentest reports.'
        ),
        'level': 'advanced',
        'duration_weeks': 14,
        'max_students': 35,
        'price': 5499.00,
    },
    {
        'category': 'Artificial Intelligence',
        'title': 'Generative AI and Prompt Engineering',
        'description': (
            'Harness the power of large language models. Learn prompt engineering, '
            'RAG pipelines, LangChain, OpenAI API integration, and how to build '
            'AI-powered applications. No ML background required.'
        ),
        'level': 'beginner',
        'duration_weeks': 6,
        'max_students': 90,
        'price': 1999.00,
    },
    {
        'category': 'Artificial Intelligence',
        'title': 'Deep Learning with PyTorch',
        'description': (
            'Dive deep into neural networks. Build CNNs for image classification, '
            'RNNs for sequence modelling, and transformer-based NLP models from '
            'scratch using PyTorch. Includes GPU training on Google Colab.'
        ),
        'level': 'advanced',
        'duration_weeks': 14,
        'max_students': 40,
        'price': 4499.00,
    },
]


class Command(BaseCommand):
    help = 'Seeds the database with 10 sample courses'

    def handle(self, *args, **kwargs):
        # Use any superuser or first user as course owner
        faculty = User.objects.filter(is_superuser=True).first()
        if not faculty:
            faculty = User.objects.first()
        if not faculty:
            self.stderr.write(self.style.ERROR(
                'No users found. Run python manage.py createsuperuser first.'
            ))
            return

        created_count = 0
        for data in COURSES:
            cat_name = data['category']
            category, _ = Category.objects.get_or_create(
                name=cat_name,
                defaults={'description': f'Courses related to {cat_name}'}
            )

            title = data['title']
            base_slug = slugify(title)
            slug = base_slug
            # Ensure slug uniqueness
            counter = 1
            while Course.objects.filter(slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1

            course, created = Course.objects.get_or_create(
                title=title,
                defaults={
                    'slug': slug,
                    'description': data['description'],
                    'level': data['level'],
                    'duration_weeks': data['duration_weeks'],
                    'max_students': data['max_students'],
                    'price': data['price'],
                    'is_free': data['price'] == 0,
                    'category': category,
                    'faculty': faculty,
                    'status': 'published',
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {course.title}'))
            else:
                self.stdout.write(f'  – Already exists: {course.title}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {created_count} new course(s) added.'
        ))
