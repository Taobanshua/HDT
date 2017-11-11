from statistics import mean

from django.db import connection
from django.utils.timezone import now
from django_hearthstone.cards.models import Card
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.mixins import (
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin
)
from rest_framework.permissions import SAFE_METHODS, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from hearthsim_identity.accounts.models import BlizzardAccount
from hearthstone.enums import PlayState
from hsreplaynet.api.permissions import UserHasFeature
from hsredshift.analytics import filters

from ..utils.db import dictfetchall
from .models import Archetype, Deck


class ArchetypeSerializer(serializers.ModelSerializer):
	player_class_name = serializers.SerializerMethodField()
	url = serializers.ReadOnlyField(source="get_absolute_url")

	class Meta:
		model = Archetype
		fields = (
			"id", "name", "player_class", "player_class_name", "url",
			"standard_signature", "wild_signature"
		)

	def get_player_class_name(self, instance):
		return instance.player_class.name


class ArchetypeListSerializer(ArchetypeSerializer):
	player_class_name = serializers.SerializerMethodField()
	url = serializers.ReadOnlyField(source="get_absolute_url")

	class Meta:
		model = Archetype
		fields = ("id", "name", "player_class", "player_class_name", "url")

	def get_player_class_name(self, instance):
		return instance.player_class.name


class ArchetypeWriteSerializer(serializers.ModelSerializer):
	class Meta:
		model = Archetype
		fields = ("id", "name", "player_class")


class DeckCreationSerializer(serializers.Serializer):
	shortid = serializers.CharField(read_only=True)
	format = serializers.IntegerField(min_value=0)
	heroes = serializers.ListField(
		child=serializers.IntegerField(min_value=1),
		min_length=0, max_length=1
	)
	cards = serializers.ListField(
		child=serializers.IntegerField(min_value=1),
		min_length=30, max_length=30
	)

	def save(self):
		self.validated_data["cards"].sort()
		card_ids = [Card.get_string_id(id) for id in self.validated_data["cards"]]
		deck, created = Deck.objects.get_or_create_from_id_list(card_ids)
		self.validated_data["shortid"] = deck.shortid
		return created


class DeckSerializer(serializers.ModelSerializer):
	archetype = serializers.PrimaryKeyRelatedField(
		queryset=Archetype.objects.live().all(),
		allow_null=True
	)
	digest = serializers.CharField(read_only=True)
	shortid = serializers.CharField(read_only=True)
	cards = serializers.SerializerMethodField(read_only=True)

	class Meta:
		model = Deck
		fields = ("id", "archetype", "shortid", "cards", "digest")

	def get_cards(self, value):
		return value.cards.values_list("dbf_id", flat=True)

	def update(self, instance, validated_data):
		old_archetype = instance.archetype
		new_archetype = validated_data["archetype"]
		result = super(DeckSerializer, self).update(instance, validated_data)

		if old_archetype != new_archetype:
			instance.sync_archetype_to_firehose()

		return result


class GetOrCreateDeckView(APIView):
	authentication_classes = ()
	permission_classes = ()
	serializer_class = DeckCreationSerializer

	def post(self, request, format=None):
		serializer = self.serializer_class(data=request.data)
		if serializer.is_valid():
			created = serializer.save()
			if created:
				status = HTTP_201_CREATED
			else:
				status = HTTP_200_OK
			return Response(serializer.data, status=status)
		return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)


class DeckDetailView(RetrieveUpdateAPIView):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAdminUser, )
	queryset = Deck.objects.all()
	serializer_class = DeckSerializer

	def get_object(self):
		try:
			return self.queryset.model.objects.get_by_shortid(self.kwargs["shortid"])
		except Deck.DoesNotExist:
			raise NotFound()


class ArchetypeViewSet(
	CreateModelMixin, ListModelMixin, RetrieveModelMixin, UpdateModelMixin, GenericViewSet
):
	authentication_classes = (SessionAuthentication, )
	pagination_class = None
	queryset = Archetype.objects.live().all()

	def get_serializer_class(self):
		if self.request.method in ["PATCH", "POST"]:
			return ArchetypeWriteSerializer
		if self.action == "list":
			return ArchetypeListSerializer
		return ArchetypeSerializer

	def get_permission_classes(self):
		if self.request.method in SAFE_METHODS:
			return ()
		return (UserHasFeature("archetype-training"), )


class MyDecksAPIView(APIView):
	authentication_classes = (SessionAuthentication, )
	permission_classes = (IsAuthenticated, )

	def _get_filter(self, filter_name, filter_cls):
		filter_value = self.request.GET.get(filter_name, "")
		if filter_value not in filter_cls.__members__:
			raise ValidationError({filter_name: "Invalid value: %r" % (filter_value)})

		return filter_cls[filter_value]

	def _get_time_range(self):
		filter_cls = filters.TimeRange
		time_range = self._get_filter("TimeRange", filter_cls)
		start_of_this_season = "date_trunc('month', now())"
		start_of_previous_season = "date_trunc('month', now()) - interval '1 month'"

		if time_range == filter_cls.LAST_30_DAYS:
			return ("now() - interval '30 days'", "now()")
		elif time_range == filter_cls.CURRENT_SEASON:
			return (start_of_this_season, "now()")
		elif time_range == filter_cls.PREVIOUS_SEASON:
			return (start_of_previous_season, start_of_this_season)
		else:
			raise ValidationError({"TimeRange": "Unsupported value: %r" % (time_range.name)})

	def _get_int_filter(self, filter_name):
		param = self.request.GET.get(filter_name)
		if not param or not param.isdigit():
			raise ValidationError({filter_name: "Required parameter must be a digit."})
		return int(param)

	def get(self, request, format=None):
		region = self._get_int_filter("Region")
		account_lo = self._get_int_filter("account_lo")
		as_of = now()

		try:
			blizzard_account = BlizzardAccount.objects.get(
				region=region, account_lo=account_lo, user=request.user
			)
		except BlizzardAccount.DoesNotExist:
			raise NotFound()

		game_type = self._get_filter("GameType", filters.GameType).value[0]
		time_start, time_end = self._get_time_range()

		query = """
		SELECT
			(gg.match_end - gg.match_start)::interval as "duration",
			gg.match_start as "match_start",
			gg.num_turns as "num_turns",
			ggp.deck_list_id as "deck_list_id",
			ggp.final_state as "final_state",
			ggp.is_first as "is_first",
			ggp.rank as "rank",
			ggp.legend_rank as "legend_rank",
			ggp.stars as "stars",
			ggp.hero_id as "hero_card_id",
			c.dbf_id as "hero_dbf_id",
			c.card_class as "card_class"
		FROM
			games_globalgameplayer ggp
		JOIN
			games_globalgame gg on gg.id = ggp.game_id
		JOIN
			card c on ggp.hero_id = c.card_id
		WHERE
			ggp.pegasus_account_id = %%s AND
			gg.game_type = %%s AND
			gg.match_start >= %s AND
			gg.match_start < %s
		""" % (time_start, time_end)  # time_start / time_end are safe (not user input)

		with connection.cursor() as cursor:
			cursor.execute(query, [blizzard_account.id, game_type])
			data = dictfetchall(cursor)

		data_by_deck = {}
		deck_ids = set(row["deck_list_id"] for row in data)
		decks_played = {deck.id: deck for deck in Deck.objects.filter(id__in=deck_ids)}

		for row in data:
			if row["deck_list_id"] not in data_by_deck:
				data_by_deck[row["deck_list_id"]] = {
					"player_class": row["card_class"],
					"game_dates": [],
					"player_turns": [],
					"game_duration": [],
					"games_won": 0,
					"actual_deck": decks_played[row["deck_list_id"]],
				}

			data_by_deck[row["deck_list_id"]]["player_turns"].append(row["num_turns"])
			data_by_deck[row["deck_list_id"]]["game_duration"].append(row["duration"].seconds)
			data_by_deck[row["deck_list_id"]]["game_dates"].append(row["match_start"])

			if row["final_state"] == PlayState.WON:
				data_by_deck[row["deck_list_id"]]["games_won"] += 1

		final_series = {}

		for row in data_by_deck.values():
			total_games = len(row["game_dates"])
			final_series[row["actual_deck"].shortid] = {
				"player_class": row["player_class"],
				"total_games": total_games,
				"last_played": max(row["game_dates"]),
				"win_rate": (row["games_won"] / total_games) * 100.0,
				"avg_game_length_seconds": mean(row["game_duration"]),
				"avg_num_player_turns": mean(row["player_turns"]),
				"deck_list": row["actual_deck"].card_dbf_id_packed_list,
			}

		ret = {
			"render_as": "table",
			"series": final_series,
			"as_of": as_of,
		}

		return Response(ret)
