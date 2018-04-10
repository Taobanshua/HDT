import React from "react";
import ReactDOM from "react-dom";
import CardData from "../CardData";
import Decks from "../pages/Decks";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import { Consumer as HearthstoneAccountConsumer } from "../components/utils/hearthstone-account";
import DataInjector from "../components/DataInjector";
import Root from "../components/Root";
import { isCollectionDisabled } from "../utils/collection";

const container = document.getElementById("decks-container");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Root>
			<HearthstoneAccountConsumer>
				{({ account }) => (
					<DataInjector
						query={{
							key: "collection",
							params: {
								region: "" + (account && account.region),
								account_lo: "" + (account && account.lo),
							},
							url: "/api/v1/collection/",
						}}
						fetchCondition={
							UserData.hasFeature("collection-syncing") &&
							!!account &&
							!isCollectionDisabled()
						}
					>
						{({ collection }) => (
							<Fragments
								defaults={{
									archetypeSelector: "",
									archetypes: [],
									excludedCards: [],
									gameType: "RANKED_STANDARD",
									includedCards: [],
									includedSet: "ALL",
									maxDustCost: -1,
									minGames: 1000,
									opponentClasses: [],
									playerClasses: [],
									rankRange: "ALL",
									region: "ALL",
									timeRange: UserData.hasFeature(
										"current-patch-filter",
									)
										? "CURRENT_PATCH"
										: UserData.hasFeature(
												"current-expansion-filter",
										  )
											? "CURRENT_EXPANSION"
											: "LAST_30_DAYS",
									trainingData: "",
									withStream: false,
								}}
								immutable={
									!UserData.isPremium()
										? [
												"account",
												"opponentClass",
												"rankRange",
												"region",
										  ]
										: null
								}
							>
								<Decks
									cardData={cardData}
									collection={collection}
									latestSet="GILNEAS"
								/>
							</Fragments>
						)}
					</DataInjector>
				)}
			</HearthstoneAccountConsumer>
		</Root>,
		container,
	);
};

render(null);

let myCardData = null;

new CardData().load(cardData => {
	myCardData = cardData;
	render(myCardData);
});
