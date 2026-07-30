FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake the static assets in: whitenoise's manifest storage refuses to serve a
# file that isn't in staticfiles.json, so this must happen before the container
# ever handles a request. Needs no database or secrets.
#
# DJANGO_DEBUG=false is required here, not incidental: the manifest storage is
# only configured in the non-debug branch of settings.py, so building under the
# default DEBUG=true would emit unhashed files with no staticfiles.json and
# every /static/ request would 500 at runtime.
RUN DJANGO_DEBUG=false python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
