import * as React from "react";
import {GlobalGamePlayer, ImageProps, CardArtProps} from "../interfaces";
import ClassIcon from "./ClassIcon";
import GameHistoryPlayer from "./GameHistoryPlayer";
import GameModeIcon from "./GameModeIcon";
import GameModeText from "./GameModeText";
import {PlayState, BnetGameType} from "../hearthstone";
import {getDuration, getAge} from "../PrettyTime";


interface GameHistoryTableRowProps extends ImageProps, CardArtProps, React.ClassAttributes<GameHistoryTableRow> {
	shortid: string;
	startTime: Date;
	endTime: Date;
	gameType: number;
	disconnected: boolean;
	scenarioId: number;
	turns: number;
	won: boolean;
	friendlyPlayer: GlobalGamePlayer;
	opposingPlayer: GlobalGamePlayer;
}

export default class GameHistoryTableRow extends React.Component<GameHistoryTableRowProps, any> {
	render(): JSX.Element {
		let url = "/replay/" + this.props.shortid;
		let result = this.props.won ? "result-won" : "result-lost";
		return (
			<a href={url} className={"match-table-row " + result}>
				<div className="match-table-cell auto-size player-icon">
					<ClassIcon player={this.props.friendlyPlayer} />
				</div>
				<div className="match-table-cell auto-size hide-below-768 player-name">
					{this.getHeroName(this.props.friendlyPlayer)}
				</div>
				<div className="match-table-cell auto-size">
					vs
				</div>
				<div className="match-table-cell auto-size opponent-icon">
					<ClassIcon player={this.props.opposingPlayer} />
				</div>
				<div className="match-table-cell hide-below-768 opponent-name">
					{this.getHeroName(this.props.opposingPlayer)}
				</div>
				<div className="match-table-cell hide-below-1100">{this.props.opposingPlayer.name}</div>
				<div className={"match-table-cell " + result}>{this.props.won ? "Won" : "Lost"}</div>
				<div className="match-table-cell">
					<div className="match-table-game-type">
						<GameModeIcon
							className="hsreplay-type-sm"
							player={this.props.friendlyPlayer}
							gameType={this.props.gameType}
							disconnected={this.props.disconnected}
							scenarioId={this.props.scenarioId}
						/>
						<GameModeText
							className="hsreplay-type-sm"
							player={this.props.friendlyPlayer}
							gameType={this.props.gameType}
							scenarioId={this.props.scenarioId}
							/>
					</div>
				</div>
				<div className="match-table-cell hide-below-1600">{getDuration(this.props.startTime, this.props.endTime)}</div>
				<div className="match-table-cell hide-below-768">{this.props.turns}</div>
				<div className="match-table-cell hide-below-500">{getAge(this.props.endTime)}</div>
			</a>
		);
	}

	private getModeText(): string {
		switch (this.props.gameType) {
			case BnetGameType.BGT_ARENA:
				return "Arena";
			case BnetGameType.BGT_RANKED_STANDARD:
			case BnetGameType.BGT_CASUAL_STANDARD:
				return "Standard";
			case BnetGameType.BGT_RANKED_WILD:
			case BnetGameType.BGT_CASUAL_WILD:
				return "Wild";
			case BnetGameType.BGT_TAVERNBRAWL_1P_VERSUS_AI:
			case BnetGameType.BGT_TAVERNBRAWL_2P_COOP:
			case BnetGameType.BGT_TAVERNBRAWL_PVP:
				return "Brawl";
			case BnetGameType.BGT_VS_AI:
				return "Adventure";
			case BnetGameType.BGT_FRIENDS:
				return "Friendly";
			default:
				return null;
		}
	}

	private getHeroName(player: GlobalGamePlayer): string {
		if (!player.hero_id.startsWith("HERO")) {
			return player.name;
		}
		return ["Warrior", "Shaman", "Rogue", "Paladin", "Hunter", "Druid", "Warlock", "Mage", "Priest"][+player.hero_id.substr(6, 1) - 1];
	}
}
