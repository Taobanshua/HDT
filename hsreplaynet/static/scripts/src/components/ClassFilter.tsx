import * as React from "react";
import {getHeroColor, toTitleCase} from "../helpers";
import ClassIcon from "./ClassIcon";

export type FilterOption = "ALL" | "DRUID" | "HUNTER" | "MAGE"
	| "PALADIN" | "PRIEST" | "ROGUE" | "SHAMAN"
	| "WARLOCK" | "WARRIOR" | "NEUTRAL";

type FilterPreset = "All" | "AllNeutral" | "Neutral" | "ClassesOnly";

interface ClassFilterProps extends React.ClassAttributes<ClassFilter> {
	disabled?: boolean;
	filters: FilterOption[] | FilterPreset;
	hideAll?: boolean;
	minimal?: boolean;
	multiSelect: boolean;
	selectedClasses: FilterOption[];
	selectionChanged: (selected: FilterOption[]) => void;
}

export default class ClassFilter extends React.Component<ClassFilterProps, void> {
	private readonly classes: FilterOption[] = [
		"DRUID", "HUNTER", "MAGE",
		"PALADIN", "PRIEST", "ROGUE",
		"SHAMAN", "WARLOCK", "WARRIOR"
	];

	private readonly presets = new Map<FilterPreset, FilterOption[]>([
		["All", ["ALL"].concat(this.classes) as FilterOption[]],
		["AllNeutral", ["ALL"].concat(this.classes).concat(["NEUTRAL"]) as FilterOption[]],
		["Neutral", this.classes.concat(["NEUTRAL"]) as FilterOption[]],
		["ClassesOnly", this.classes]
	]);

	constructor(props: ClassFilterProps) {
		super(props);
	}

	getAvailableFilters(): FilterOption[] {
		const fromPreset = this.presets.get(this.props.filters as FilterPreset);
		return fromPreset || this.props.filters as FilterOption[];
	}

	render(): JSX.Element {
		const filters = [];
		this.getAvailableFilters().forEach(key => {
			if (this.props.hideAll && key === "ALL") {
				return;
			}
			const selected = this.props.selectedClasses.indexOf(key) !== -1;
			filters.push(this.buildIcon(key, selected));
		});
		return <div className="class-filter-wrapper">
			{filters}
		</div>;
	}

	buildIcon(className: FilterOption, selected: boolean): JSX.Element {
		const isSelected = selected || this.props.selectedClasses.indexOf("ALL") !== -1;
		const wrapperClassNames = ["class-icon-label-wrapper"];
		if (this.props.disabled || !isSelected) {
			wrapperClassNames.push("deselected");
		}
		if (!this.props.disabled && selected) {
			wrapperClassNames.push("selected");
		}
		let label = null;
		if (!this.props.minimal) {
			const labelClassNames = ["class-label hidden-xs "];
			if (this.props.disabled || !isSelected) {
				labelClassNames.push("deselected");
			}
			else {
				labelClassNames.push(className.toLowerCase());
			}
			label = <div className={labelClassNames.join(" ")}>{toTitleCase(className)}</div>;
		}

		return <span className={wrapperClassNames.join(" ")} onClick={() => this.onLabelClick(className, selected)}>
			<ClassIcon heroClassName={className} small tooltip={toTitleCase(className)} />
			{label}
		</span>;
	}

	onLabelClick(className: FilterOption, selected: boolean) {
		if (this.props.disabled) {
			return;
		}
		let newSelected = this.props.selectedClasses;

		const clickedLastSelected = newSelected.length == 1 && newSelected[0] === className;

		if(this.props.multiSelect) {
			if (clickedLastSelected) {
				newSelected = this.getAvailableFilters();
			}
			else if (selected) {
				newSelected = newSelected.filter(x => x !== className);
			}
			else {
				newSelected.push(className);
			}
		}
		else {
			if (clickedLastSelected && this.getAvailableFilters().indexOf("ALL") !== -1) {
				newSelected = ["ALL"];
			}
			else {
				newSelected = [className]
			}
		}
		this.props.selectionChanged(newSelected);
	}
}
