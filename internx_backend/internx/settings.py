"""
Django settings for InternX platform.
"""
import os
import importlib.util
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import environ
import dj_database_url
from datetime import timedelta
# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = env.bool('DEBUG', default=False)
if os.getenv('VERCEL'):
    DEBUG = False
ALLOWED_HOSTS = list(
    dict.fromkeys(
        env.list('ALLOWED_HOSTS', default=['*']) + [
            '.vercel.app',
            '.railway.app',
        ]
    )
)

# Application definition
HAS_CHANNELS = importlib.util.find_spec('channels') is not None

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    # Internal apps
    'apps.users',
    'apps.courses',
    'apps.sessions',
    'apps.assignments',
    'apps.results',
    'apps.certificates',
    'apps.notifications',
    'apps.chat',
]

if HAS_CHANNELS:
    INSTALLED_APPS.insert(6, 'channels')

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'internx.urls'
if HAS_CHANNELS:
    ASGI_APPLICATION = 'internx.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'internx.wsgi.application'


def build_database_config():
    database_url = env('DATABASE_URL', default='').strip()
    if database_url:
        config = dj_database_url.parse(
            database_url,
            conn_max_age=600,
            ssl_require=not DEBUG,
        )

        # Some hosted providers expose partial URLs or split credentials across PG* vars.
        parsed = urlparse(database_url)
        query_params = parse_qs(parsed.query)
        db_name = (
            config.get('NAME')
            or parsed.path.lstrip('/')
            or env('PGDATABASE', default='')
            or env('POSTGRES_DB', default='')
            or env('DB_NAME', default='')
            or query_params.get('dbname', [''])[0]
        )
        db_host = (
            config.get('HOST')
            or parsed.hostname
            or env('PGHOST', default='')
            or env('POSTGRES_HOST', default='')
            or env('DB_HOST', default='')
        )
        db_port = (
            str(config.get('PORT') or '')
            or (str(parsed.port) if parsed.port else '')
            or env('PGPORT', default='')
            or env('POSTGRES_PORT', default='')
            or env('DB_PORT', default='')
        )
        db_user = (
            config.get('USER')
            or parsed.username
            or env('PGUSER', default='')
            or env('POSTGRES_USER', default='')
            or env('DB_USER', default='')
        )
        db_password = (
            config.get('PASSWORD')
            or parsed.password
            or env('PGPASSWORD', default='')
            or env('POSTGRES_PASSWORD', default='')
            or env('DB_PASSWORD', default='')
        )

        if db_name:
            config['NAME'] = db_name
        if db_host:
            config['HOST'] = db_host
        if db_port:
            config['PORT'] = db_port
        if db_user:
            config['USER'] = db_user
        if db_password:
            config['PASSWORD'] = db_password

        return {'default': config}

    return {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', default='internx_db'),
            'USER': env('DB_USER', default='internx_user'),
            'PASSWORD': env('DB_PASSWORD', default='123'),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5433'),
        }
    }

# Database
DATABASES = build_database_config()

# Cache (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

if HAS_CHANNELS:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [env('REDIS_URL', default='redis://localhost:6379/0')],
            },
        },
    }

# Auth
AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# CORS
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        FRONTEND_URL,
    ],
)
CORS_ALLOWED_ORIGIN_REGEXES = env.list(
    'CORS_ALLOWED_ORIGIN_REGEXES',
    default=[
        r'^https://.*\.vercel\.app$',
        r'^https://.*\.railway\.app$',
    ],
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list(
    'CSRF_TRUSTED_ORIGINS',
    default=[
        FRONTEND_URL,
        'https://*.vercel.app',
        'https://*.railway.app',
    ],
)

# Celery
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_BEAT_SCHEDULE = {
    'schedule-upcoming-google-meet-sessions-every-minute': {
        'task': 'apps.sessions.tasks.schedule_upcoming_google_meet_sessions',
        'schedule': 60.0,
    },
    'sync-ended-sessions-every-minute': {
        'task': 'apps.sessions.tasks.sync_session_end_states',
        'schedule': 60.0,
    },
}

# Email
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='InternX <noreply@internx.com>')

# Google Calendar
GOOGLE_CALENDAR_CREDENTIALS_PATH = env(
    'GOOGLE_CALENDAR_CREDENTIALS_PATH', default='credentials.json'
)
GOOGLE_CALENDAR_CLIENT_SECRET_PATH = env(
    'GOOGLE_CALENDAR_CLIENT_SECRET_PATH',
    default=GOOGLE_CALENDAR_CREDENTIALS_PATH,
)
GOOGLE_CALENDAR_TOKEN_PATH = env(
    'GOOGLE_CALENDAR_TOKEN_PATH',
    default=str(BASE_DIR / 'google_calendar_token.json'),
)
GOOGLE_CALENDAR_REDIRECT_URI = env(
    'GOOGLE_CALENDAR_REDIRECT_URI',
    default='http://127.0.0.1:8000',
)
GOOGLE_CALENDAR_ID = env('GOOGLE_CALENDAR_ID', default='primary')

# Frontend URL (for QR verification links)
# Defined above for CORS and reused here for QR verification links.

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# API Docs
SPECTACULAR_SETTINGS = {
    'TITLE': 'InternX API',
    'DESCRIPTION': 'AI Internship Learning Platform REST API',
    'VERSION': '1.0.0',
}
