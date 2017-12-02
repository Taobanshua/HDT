# -*- coding: utf-8 -*-
# Generated by Django 1.11.7 on 2017-12-02 07:34
from __future__ import unicode_literals

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('django_reflinks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Referral',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('credited_amount', models.PositiveIntegerField(help_text="The amount credited to the user's balance (in cents).")),
                ('credit_request_id', models.CharField(blank=True, db_index=True, help_text='The Stripe Request-Id for the balance credit.', max_length=255)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('referral_hit', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='django_reflinks.ReferralHit')),
            ],
        ),
    ]
