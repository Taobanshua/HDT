import * as React from "react";
import CardTile from "./CardTile";
import {cleanText} from "../helpers";

interface CardSearchState {
	cardSearchText?: string;
	cardSearchHasFocus?: boolean;
	cardSearchCount?: number;
	selectedIndex?: number;
}

interface CardSearchProps extends React.ClassAttributes<CardSearch> {
	availableCards: any[]
	onCardsChanged: (cards: any[]) => void;
	selectedCards: any[];
}

export default class CardSearch extends React.Component<CardSearchProps, CardSearchState> {
	readonly defaultCardCount = 10;
	private search: HTMLDivElement;

	constructor(props: CardSearchProps, state: CardSearchState) {
		super(props, state);
		this.state = {
			cardSearchText: "",
			cardSearchHasFocus: false,
			cardSearchCount: this.defaultCardCount,
			selectedIndex: 0,
		}
	}

	render(): JSX.Element {
		const searchLostFocus = () => {
			this.setState({cardSearchHasFocus: false});
		}

		const cards = [];
		const matches = this.getFilteredCards();
		matches.slice(0, this.state.cardSearchCount).forEach((card, index) => {
			const selected = this.state.selectedIndex === index;
			cards.push(
				<li key={card.id}
					onMouseEnter={() => this.setState({selectedIndex: index})}
					className={selected ? "selected" : undefined}
					onMouseDown={() => this.addCard(card)}
				>
					<CardTile card={card} count={1} height={34} rarityColored tooltip/>
				</li>
			);
		});

		if (this.state.cardSearchText && !matches.length) {
			cards.push(
				<li>
					<div className="search-message">No cards found</div>
				</li>
			);
		}

		const onSearchScroll = (event: React.UIEvent<HTMLDivElement>) => {
			if (event.target["scrollTop"] + 200 >= event.target["scrollHeight"]) {
				if (matches.length > this.state.cardSearchCount) {
					this.setState({cardSearchCount: this.state.cardSearchCount + this.defaultCardCount});
				}
			}
		}

		let cardSearchResults = null;
		if (this.state.cardSearchHasFocus && cards.length && this.state.cardSearchText.length) {
			cardSearchResults = (
				<div className="card-search-results" onScroll={onSearchScroll} ref={(search) => this.search = search}>
					<ul>
						{cards}
					</ul>
				</div>
			);
		}

		return (
			<div className="card-search search-wrapper">
				<input
					className="form-control"
					type="search"
					placeholder="Search..."
					onFocus={() => this.setState({cardSearchHasFocus: true})}
					onBlur={() => this.setState({cardSearchHasFocus: false})}
					value={this.state.cardSearchText}
					onChange={(e) => this.setState({cardSearchText: e.target["value"]})}
					onKeyDown={(e) => this.onKeyDown(e, cards.length)}
				/>
				{cardSearchResults}
				<ul>
					{this.getSelectedCards()}
				</ul>
			</div>
		);
	}

	addCard(card: any): void {
		const selected = this.props.selectedCards || [];
		if (selected.indexOf(card) === -1) {
			const newSelectedCards = selected.concat([card]);
			newSelectedCards.sort((a, b) => a["name"] > b["name"] ? 1 : -1);
			newSelectedCards.sort((a, b) => a["cost"] > b["cost"] ? 1 : -1);
			this.props.onCardsChanged(newSelectedCards);
		}
		this.setState({cardSearchText: "", cardSearchCount: this.defaultCardCount, selectedIndex: 0});
	};

	onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, numCards: number): void {
		switch (event.key) {
			case "ArrowDown":
				if(!this.search) {
					return;
				}
				this.setState({selectedIndex: Math.min(numCards - 1, this.state.selectedIndex + 1)});
				if (this.search["scrollTop"] === 0) {
					this.search["scrollTop"] += 5;
				}
				this.search["scrollTop"] += 35;
				break;
			case "ArrowUp":
				if(!this.search) {
					return;
				}
				this.setState({selectedIndex: Math.max(0, this.state.selectedIndex - 1)});
				this.search["scrollTop"] -= 35;
				break;
			case "Enter":
				const filteredCards = this.getFilteredCards();
				if(!filteredCards.length) {
					return;
				}
				this.addCard(this.getFilteredCards()[this.state.selectedIndex]);
				break;
		}
	}

	getFilteredCards(): any[] {
		if (!this.props.availableCards) {
			return [];
		}
		return this.props.availableCards.filter(card => !this.state.cardSearchText || cleanText(card.name).indexOf(cleanText(this.state.cardSearchText)) !== -1);
	}

	getSelectedCards(): JSX.Element[] {
		if (!this.props.selectedCards) {
			return null;
		}
		const selectedCards = [];
		this.props.selectedCards.forEach(card => {
			const removeCard = () => {
				const newSelectedCards = this.props.selectedCards.filter(x => x !== card);
				this.props.onCardsChanged(newSelectedCards)
			};
			selectedCards.push(
				<li onClick={removeCard}>
					<div className="glyphicon glyphicon-remove" />
					<CardTile card={card} count={1} height={34} rarityColored tooltip />
				</li>
			);
		});
		return selectedCards;
	}
}
