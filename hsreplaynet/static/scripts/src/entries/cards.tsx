import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Cards from "../pages/Cards";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("card-container");
const personal = container.getAttribute("data-view-type") === "personal";

UserData.create();
const availableAccounts = UserData.getAccounts();
const defaultAccount = UserData.getDefaultAccountKey();

if (personal && !defaultAccount) {
	if (typeof ga === "function") {
		ga("send", {
			hitType: "event",
			eventCategory: "Pegasus Account",
			eventAction: "missing",
			eventLabel: "My Cards",
			nonInteraction: true,
		});
	}
}

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				text: "",
				showSparse: false,
				format: "",
				gameType: "RANKED_STANDARD",
				playerClass: "ALL",
				rankRange: "ALL",
				timeRange: personal ? "LAST_30_DAYS" : "LAST_14_DAYS",
				exclude: "",
				cost: [],
				rarity: [],
				set: [],
				type: [],
				race: [],
				mechanics: [],
				sortBy: "timesPlayed",
				sortDirection: "descending",
				display: "statistics",
				uncollectible: "",
			}}
			debounce="text"
			immutable={UserData.isPremium() ? null : ["rankRange"]}
		>
			<Cards
				cardData={cardData}
				personal={personal}
				accounts={availableAccounts}
			/>
		</Fragments>,
		container,
	);
};

render(null);

const addMechanics = (card: any) => {
	const add = (card: any, mechanic: string) => {
		if (!card.mechanics) {
			card.mechanics = [];
		}
		if (card.mechanics.indexOf(mechanic) === -1) {
			card.mechanics.push(mechanic);
		}
	};
	if (card.referencedTags) {
		card.referencedTags.forEach((tag) => add(card, tag));
	}
};

new CardData(addMechanics).load(render);
