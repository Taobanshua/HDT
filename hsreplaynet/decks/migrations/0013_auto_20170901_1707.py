# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-09-01 17:07
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('decks', '0012_clustersnapshot_external_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='clustersnapshotmember',
            name='cluster',
        ),
        migrations.RemoveField(
            model_name='clustersnapshotmember',
            name='deck',
        ),
        migrations.RemoveField(
            model_name='clustersnapshot',
            name='archetype',
        ),
        migrations.RemoveField(
            model_name='clustersnapshot',
            name='data_points',
        ),
        migrations.DeleteModel(
            name='ClusterSnapshotMember',
        ),
    ]