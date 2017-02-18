from django.conf.urls import url
from .views import (
	archetypes, winrates, counters, canonicals, carddetail,
	popular_cards, deckdetail, discover, deck_discover
)


urlpatterns = [
	url(r"^$", discover, name="card_discover"),
	url(r"^winrates/$", winrates, name="deck_winrates"),
	url(r"^counters/$", counters, name="deck_counters"),
	url(r"^archetypes/$", archetypes, name="deck_archetypes"),
	url(r"^canonicals/$", canonicals, name="canonical_decks"),
	url(r"^popular/$", popular_cards, name="popular_cards"),
	url(r"^(?P<card_id>\w+)$", carddetail, name="card_detail"),
	url(r"^decks/discover/$", deck_discover, name="deck_discover"),
	url(r"^decks/(?P<deck_id>\w+)$", deckdetail, name="deck_detail"),
]
