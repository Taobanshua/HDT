from django_hearthstone.cards.models import Card
from hearthstone import enums
from oauth2_provider.contrib.rest_framework import OAuth2Authentication, TokenHasScope
from rest_framework import status, views
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from hsreplaynet.api.partner.serializers import ArchetypeSerializer, ClassSerializer
from hsreplaynet.api.partner.utils import QueryDataNotAvailableException
from hsreplaynet.decks.api import Archetype
from hsreplaynet.utils import influx
from hsreplaynet.utils.aws.redshift import get_redshift_query

from .permissions import PartnerStatsPermission


class PartnerStatsView(views.APIView):
	authentication_classes = (OAuth2Authentication, )
	permission_classes = (PartnerStatsPermission, TokenHasScope)
	required_scopes = ["stats.partner:read"]


class ExampleView(PartnerStatsView):
	def get(self, request, format=None):
		content = {
			"Hello": "World!"
		}
		return Response(content)


class ArchetypesView(ListAPIView):
	authentication_classes = (OAuth2Authentication, )
	permission_classes = (TokenHasScope, PartnerStatsPermission)
	required_scopes = ["stats.partner:read"]
	pagination_class = None
	serializer_class = ArchetypeSerializer

	supported_game_types = ["RANKED_STANDARD"]

	def list(self, request, *args, **kwargs):
		error = None
		try:
			queryset = self.get_queryset()
			serializer = self.get_serializer(queryset, many=True)
			return Response(d for d in serializer.data if d)
		except QueryDataNotAvailableException as e:
			error = type(e).__name__
			return Response(status=status.HTTP_202_ACCEPTED)
		except Exception as e:
			error = type(e).__name__
			raise e
		finally:
			influx.influx_metric(
				"hsreplaynet_partner_api",
				{"count": 1},
				view="Archetypes",
				application=request.auth.application,
				error=error
			)

	def get_serializer_context(self):
		context = super().get_serializer_context()
		context.update(dict(
			(game_type, dict(
				deck_data=self._get_decks(game_type),
				popularity_data=self._get_archetype_popularity(game_type),
				matchup_data=self._get_archetype_matchups(game_type)
			)) for game_type in self.supported_game_types
		))
		return context

	def get_queryset(self):
		queryset = []
		for game_type in self.supported_game_types:
			for archetype in self._get_archetypes():
				queryset.append(dict(
					archetype=archetype,
					game_type=game_type
				))
		return queryset

	def _is_valid_archetype(self, archetype):
		return (
			archetype.standard_ccp_signature and
			archetype.standard_ccp_signature["components"]
		)

	def _get_archetypes(self):
		return [
			archetype for archetype in Archetype.objects.live().all() if
			self._is_valid_archetype(archetype)
		]

	def _get_decks(self, game_type):
		return self._get_query_data("list_decks_by_win_rate", game_type)

	def _get_archetype_popularity(self, game_type):
		return self._get_query_data("archetype_popularity_distribution_stats", game_type)

	def _get_archetype_matchups(self, game_type):
		return self._get_query_data("head_to_head_archetype_matchups", game_type)

	def _get_query_data(self, query_name, game_type):
		query = get_redshift_query(query_name)
		parameterized_query = query.build_full_params(dict(
			GameType=game_type
		))
		if not parameterized_query.result_available:
			raise QueryDataNotAvailableException()
		response = parameterized_query.response_payload
		return response["series"]["data"]


class ClassesView(ListAPIView):
	"""View implementation for the partner API "classes" endpoint"""

	authentication_classes = (OAuth2Authentication, )
	permission_classes = (TokenHasScope, PartnerStatsPermission)
	required_scopes = ["stats.partner:read"]
	pagination_class = None
	serializer_class = ClassSerializer

	supported_game_types = ["RANKED_STANDARD"]

	def list(self, request, *args, **kwargs):
		try:
			queryset = self.get_queryset()
			serializer = self.get_serializer(queryset, many=True)
			return Response(serializer.data)
		except QueryDataNotAvailableException:
			return Response(status=status.HTTP_202_ACCEPTED)

	def get_serializer_context(self):

		# The archetype popularity query that powers this endpoint includes
		# data about all classes, so include it as a context object that
		# the serializer can use across the serialization of individual
		# class summaries.

		context = super().get_serializer_context()

		archetype_popularity_by_game_type = dict(
			(game_type, self._get_archetype_popularity(game_type))
			for game_type in self.supported_game_types
		)

		context.update({
			"archetype_stats": archetype_popularity_by_game_type
		})

		return context

	def get_queryset(self):
		queryset = []

		for hsclass in enums.CardClass:
			if hsclass.is_playable:

				# This combination of criteria appears to correctly limit the
				# resulting cards to HERO_* cards.

				hero_cards = Card.objects.filter(
					card_class=hsclass,
					card_set__in=[enums.CardSet.CORE, enums.CardSet.HERO_SKINS],
					collectible=True,
					type=enums.CardType.HERO
				)
				queryset.append(dict(
					archetypes=Archetype.objects.filter(player_class=hsclass),
					player_class=hsclass,
					hero_cards=hero_cards
				))

		return queryset

	def _get_archetype_popularity(self, game_type):
		return self._get_query_data("archetype_popularity_distribution_stats", game_type)

	def _get_query_data(self, query_name, game_type):
		query = get_redshift_query(query_name)
		parameterized_query = query.build_full_params(dict(
			GameType=game_type
		))
		if not parameterized_query.result_available:
			raise QueryDataNotAvailableException()
		response = parameterized_query.response_payload
		return response["series"]["data"]
