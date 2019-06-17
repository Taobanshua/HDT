import _ from "lodash";
import React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import DataManager from "../DataManager";
import { getManaCost } from "../helpers";
import {
	CardObj,
	DeckObj,
	FragmentChildProps,
	SortDirection,
} from "../interfaces";
import { Collection } from "../utils/api";
import { getDustCostForCollection } from "../utils/collection";
import DeckTile from "./DeckTile";
import InfoIcon from "./InfoIcon";
import Pager from "./Pager";
import SortIndicator from "./SortIndicator";
import { refreshAdUnits } from "./ads/NetworkNAdUnit";

interface AdInfo {
	index: number;
	ids: string[];
	mobile?: boolean;
}

interface Props extends FragmentChildProps, WithTranslation {
	decks: DeckObj[];
	pageSize: number;
	hideTopPager?: boolean;
	compareWith?: CardObj[];
	sortBy?: string;
	setSortBy?: (sortBy: string) => void;
	sortDirection?: SortDirection;
	setSortDirection?: (sortDirection: SortDirection) => void;
	page?: number;
	setPage?: (page: number) => void;
	helpMessage?: any;
	hrefTab?: string;
	lastPlayedColumn?: boolean;
	showGlobalDataNotice?: boolean;
	collection?: Collection | null;
	ads?: AdInfo[];
	pageTop?: HTMLElement | null;
	refreshAdUnits?: boolean;
}

interface State {
	archetypeData: any[];
}

class DeckList extends React.Component<Props, State> {
	private cache: { [id: string]: { dust: number; mana: number } } = {};

	constructor(props: Props, context?: any) {
		super(props, context);
		this.state = {
			archetypeData: [],
		};
		this.cacheDecks(props.decks, props.collection);
	}

	public componentDidMount(): void {
		this.fetchArchetypeDict();
	}

	public componentWillReceiveProps(
		nextProps: Readonly<Props>,
		nextContext: any,
	): void {
		if (
			this.props.setPage &&
			(!_.isEqual(nextProps.decks, this.props.decks) ||
				nextProps.pageSize !== this.props.pageSize ||
				nextProps.sortBy !== this.props.sortBy ||
				nextProps.sortDirection !== this.props.sortDirection)
		) {
			this.props.setPage(1);
		}
		this.cacheDecks(nextProps.decks, nextProps.collection);
	}

	public componentDidUpdate(
		prevProps: Readonly<Props>,
		prevState: Readonly<State>,
		snapshot?: any,
	): void {
		if (this.props.refreshAdUnits && prevProps.page !== this.props.page) {
			refreshAdUnits();
		}
	}

	cacheDecks(decks: DeckObj[], collection: Collection | null) {
		for (const deck of decks) {
			const id = deck.deckId;
			this.cache[id] = {
				dust: getDustCostForCollection(collection, deck.cards),
				mana: getManaCost(deck.cards),
			};
		}
	}

	fetchArchetypeDict() {
		DataManager.get("/api/v1/archetypes/").then(data => {
			if (data) {
				this.setState({ archetypeData: data });
			}
		});
	}

	public render(): React.ReactNode {
		const { t } = this.props;
		const currentPage =
			typeof this.props.page !== "undefined" ? this.props.page : 1;
		const pageOffset = (currentPage - 1) * this.props.pageSize;
		const nextPageOffset = pageOffset + this.props.pageSize;
		const deckCount = this.props.decks.length;

		let cacheProp = null;
		let sortProp = this.props.sortBy;
		let reversed = false;

		switch (sortProp) {
			case "winrate":
				sortProp = "winrate";
				break;
			case "popularity":
				sortProp = "numGames";
				break;
			case "duration":
				sortProp = "duration";
				break;
			case "lastPlayed":
				sortProp = "lastPlayed";
				reversed = true;
				break;
			case "dust":
				cacheProp = "dust";
				break;
			case "mana":
				cacheProp = "mana";
				break;
		}

		const decks = this.props.decks.slice(0);

		if (sortProp) {
			const direction =
				(this.props.sortDirection === "ascending" ? 1 : -1) *
				(reversed ? -1 : 1);
			decks.sort((a: DeckObj, b: DeckObj) => {
				let x = +a[sortProp];
				let y = +b[sortProp];
				if (cacheProp !== null) {
					x = +this.cache[a.deckId][cacheProp];
					y = +this.cache[b.deckId][cacheProp];
				}
				if (x !== y) {
					return (x - y) * direction;
				}
				return a.deckId.localeCompare(b.deckId) * direction;
			});
		}

		const deckTiles = [];
		const visibleDecks = decks.slice(pageOffset, nextPageOffset);
		visibleDecks.forEach((deck, index) => {
			const archetype = this.state.archetypeData.find(
				x => x.id === deck.archetypeId,
			);
			deckTiles.push(
				<DeckTile
					key={deck.deckId}
					cards={deck.cards}
					deckId={deck.deckId}
					duration={deck.duration}
					playerClass={deck.playerClass}
					numGames={deck.numGames}
					winrate={deck.winrate}
					compareWith={this.props.compareWith}
					hasGlobalData={
						this.props.showGlobalDataNotice && deck.hasGlobalData
					}
					archetypeName={archetype && archetype.name}
					archetypeId={archetype && archetype.id}
					hrefTab={this.props.hrefTab}
					lastPlayed={deck.lastPlayed}
					collection={this.props.collection}
				/>,
			);
		});

		const pager = top => {
			if (
				this.props.decks.length <= this.props.pageSize ||
				!this.props.setPage
			) {
				return null;
			}
			return (
				<div
					className={
						"paging " +
						(top ? "pull-right paging-top" : "text-center")
					}
				>
					<Pager
						currentPage={this.props.page}
						setCurrentPage={this.props.setPage}
						pageCount={Math.ceil(deckCount / this.props.pageSize)}
						scrollTo={
							this.props.pageTop ? this.props.pageTop : undefined
						}
					/>
				</div>
			);
		};

		const isSortable =
			typeof this.props.setSortBy === "function" &&
			typeof this.props.setSortDirection === "function";
		const sortIndicator = (name: string): React.ReactNode => {
			if (!isSortable) {
				return null;
			}
			return (
				<SortIndicator
					direction={
						name === this.props.sortBy
							? this.props.sortDirection
							: null
					}
				/>
			);
		};

		const headerSortable = isSortable ? "header-sortable " : "";

		const sort = (name: string, reversed?: boolean): void => {
			if (this.props.sortBy === name) {
				if (this.props.setSortDirection) {
					this.props.setSortDirection(
						this.props.sortDirection === "ascending"
							? "descending"
							: "ascending",
					);
				}
			} else {
				this.props.setSortDirection &&
					this.props.setSortDirection(
						reversed ? "ascending" : "descending",
					);
				this.props.setSortBy && this.props.setSortBy(name);
			}
		};

		const onClick = (
			name: string,
			event?: React.MouseEvent<HTMLElement>,
			reversed?: boolean,
		) => {
			if (!this.props.setSortDirection && !this.props.setSortBy) {
				return;
			}
			if (event) {
				event.preventDefault();
				if (event.currentTarget) {
					event.currentTarget.blur();
				}
			}
			sort(name, reversed);
		};

		const onKeyPress = (
			name: string,
			event?: React.KeyboardEvent<HTMLElement>,
			reversed?: boolean,
		) => {
			if (event && event.which !== 13) {
				return;
			}
			sort(name, reversed);
		};

		const sortDirection = (name: string) =>
			this.props.sortBy === name ? this.props.sortDirection : "none";

		const tabIndex = isSortable ? 0 : -1;

		let firstHeader = null;
		if (this.props.lastPlayedColumn) {
			firstHeader = (
				<div
					className={
						headerSortable + "col-lg-2 col-md-2 col-sm-2 col-xs-6"
					}
					onClick={e => onClick("lastPlayed", e, true)}
					onKeyPress={e => onKeyPress("lastPlayed", e, true)}
					tabIndex={tabIndex}
					role="columnheader"
					aria-sort={sortDirection("lastPlayed")}
				>
					<span>{t("Deck / Last played")}</span>
					{sortIndicator("lastPlayed")}
					<InfoIcon
						header={t("Last played")}
						content={t("Time since you last played the deck.")}
					/>
				</div>
			);
		} else {
			firstHeader = (
				<div
					className={
						headerSortable + "col-lg-2 col-md-2 col-sm-2 col-xs-6"
					}
					onClick={e => onClick("dust", e)}
					onKeyPress={e => onKeyPress("dust", e)}
					tabIndex={tabIndex}
					role="columnheader"
					aria-sort={sortDirection("dust")}
				>
					<span>{t("Deck / Cost")}</span>
					{sortIndicator("dust")}
					<InfoIcon
						header={t("Crafting cost")}
						content={t(
							"Total amount of dust required to craft the deck.",
						)}
					/>
				</div>
			);
		}

		return (
			<section className="deck-list">
				<h2 className="sr-only">{t("List of decks")}</h2>
				{this.props.helpMessage ? (
					<p className="help-block pull-left">
						<span className="visible-sm-inline">&nbsp;</span>
						{this.props.helpMessage}
					</p>
				) : null}
				{!this.props.hideTopPager && pager(true)}
				<div className="clearfix" />
				<div className="row header-row">
					{firstHeader}
					<div
						className={
							headerSortable +
							"header-center col-lg-1 col-md-1 col-sm-1 col-xs-3"
						}
						onClick={e => onClick("winrate", e)}
						onKeyPress={e => onKeyPress("winrate", e)}
						tabIndex={tabIndex}
						role="columnheader"
						aria-sort={sortDirection("winrate")}
					>
						<span aria-hidden="true">{t("Winrate")}</span>
						{sortIndicator("winrate")}
						<InfoIcon
							header={t("Winrate")}
							content={t("Percentage of games won by the deck.")}
						/>
					</div>
					<div
						className={
							headerSortable +
							"header-center col-lg-1 col-md-1 col-sm-1 col-xs-3"
						}
						onClick={e => onClick("popularity", e)}
						onKeyPress={e => onKeyPress("popularity", e)}
						tabIndex={tabIndex}
						role="columnheader"
						aria-sort={sortDirection("popularity")}
					>
						<span aria-hidden="true">{t("Games")}</span>
						{sortIndicator("popularity")}
						<InfoIcon
							header={t("Games played")}
							content={t(
								"Number of recorded games where the deck is played.",
							)}
						/>
					</div>
					<div
						className={
							headerSortable +
							"header-center col-lg-1 col-md-1 hidden-sm hidden-xs"
						}
						onClick={e => onClick("duration", e)}
						onKeyPress={e => onKeyPress("duration", e)}
						tabIndex={tabIndex}
						role="columnheader"
						aria-sort={sortDirection("duration")}
					>
						<span aria-hidden="true">{t("Duration")}</span>
						{sortIndicator("duration")}
						<InfoIcon
							header={t("Game duration")}
							content={t(
								"How long a game takes on average when the deck is played.",
							)}
						/>
					</div>
					<div
						className={
							headerSortable +
							"header-center col-lg-1 hidden-md hidden-sm hidden-xs"
						}
						onClick={e => onClick("mana", e)}
						onKeyPress={e => onKeyPress("mana", e)}
						tabIndex={tabIndex}
						role="columnheader"
						aria-sort={sortDirection("mana")}
					>
						<span aria-hidden="true">{t("Mana")}</span>
						{sortIndicator("mana")}
						<InfoIcon
							header={t("Mana curve")}
							content={t(
								"Distribution of card costs for the deck.",
							)}
						/>
					</div>
					<div
						className="col-lg-6 col-md-7 col-sm-8 hidden-xs"
						role="columnheader"
					>
						{this.props.compareWith ? t("Changes") : t("Cards")}
					</div>
				</div>
				<ul>
					{this.props.children}
					{deckTiles}
				</ul>
				{pager(false)}
			</section>
		);
	}
}
export default withTranslation()(DeckList);
