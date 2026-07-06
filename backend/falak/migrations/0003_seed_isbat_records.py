from django.db import migrations

# TODO(user): every row below needs a real, citable Kemenag sidang isbat
# date + source_note before this migration is considered mergeable/complete.
# These are NOT researched/verified - do not trust or display them as fact.
# Leave `verified=False` (the model default) until a maintainer has
# cross-checked each entry against a primary Kemenag press release or Bimas
# Islam Kemenag publication.
#
# Expected shape per entry:
#   dict(
#       hijri_year=1445,
#       hijri_month=9,  # 9=Ramadhan, 10=Syawal, 12=Dzulhijjah
#       gregorian_start_date="2024-03-12",
#       source_note="Kemenag sidang isbat press release, <date>, <URL>",
#   ),
SEED_RECORDS: list[dict] = []


def seed(apps, schema_editor):
    IsbatRecord = apps.get_model("falak", "IsbatRecord")
    for rec in SEED_RECORDS:
        IsbatRecord.objects.get_or_create(
            hijri_year=rec["hijri_year"],
            hijri_month=rec["hijri_month"],
            defaults={
                "gregorian_start_date": rec["gregorian_start_date"],
                "source_note": rec["source_note"],
                "verified": False,
            },
        )


def unseed(apps, schema_editor):
    IsbatRecord = apps.get_model("falak", "IsbatRecord")
    for rec in SEED_RECORDS:
        IsbatRecord.objects.filter(hijri_year=rec["hijri_year"], hijri_month=rec["hijri_month"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("falak", "0002_isbatrecord"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
