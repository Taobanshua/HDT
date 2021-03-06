import React from "react";
import { ApiArchetypePopularity, SortableProps } from "../../interfaces";
import { withLoading } from "../loading/Loading";
import CardData from "../../CardData";
import LowDataWarning from "./LowDataWarning";
import ClassArchetypesBox from "./ClassArchetypesBox";
import { Archetype } from "../../utils/api";

interface ClassArchetypeData {
	[playerClass: string]: ApiArchetypePopularity[];
}

interface Props extends SortableProps {
	data?: ClassArchetypeData;
	archetypeData?: Archetype[];
	cardData: CardData;
	gameType: string;
	timestamp?: string;
}

class ArchetypeList extends React.Component<Props> {
	public render(): React.ReactNode {
		const { data } = this.props;
		const tiles = Object.keys(data)
			.sort()
			.map(key => (
				<ClassArchetypesBox
					key={key}
					archetypeData={this.props.archetypeData}
					cardData={this.props.cardData}
					data={data[key]}
					gameType={this.props.gameType}
					onSortChanged={this.props.onSortChanged}
					playerClass={key}
					sortBy={this.props.sortBy}
					sortDirection={this.props.sortDirection}
					totalPopularity
				/>
			));
		return (
			<div className="class-box-container">
				<LowDataWarning
					date={new Date(this.props.timestamp)}
					numArchetypes={Object.keys(data)
						.map(key => data[key].length)
						.reduce((a, b) => a + b)}
				/>
				{tiles}
			</div>
		);
	}
}

export default withLoading()(ArchetypeList);
