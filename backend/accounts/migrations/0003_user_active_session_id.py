from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_phone_country_code_user_phone_number"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="active_session_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
