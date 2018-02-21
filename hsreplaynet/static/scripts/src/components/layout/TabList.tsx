import React from "react";
import Tab from "./Tab";

interface Props {
	tab: string;
	setTab(tab?: string): void;
	tabFragment?: string;
}

export default class TabList extends React.Component<Props> {
	public render(): React.ReactNode {
		const children = TabList.getValidChildren(this.props.children);

		if (!children.length) {
			return;
		}

		const canSwitch = typeof this.props.setTab === "function";

		const tabs = children.map((child: any) => {
			const { id, disabled, highlight } = child.props;
			const isActive = id === this.props.tab;

			const label = (
				<a
					id={TabList.makeTabId(id)}
					href={`#${this.props.tabFragment || "tab"}=${id}`}
					onClick={event => {
						event.preventDefault();
						if (isActive || !canSwitch || disabled) {
							return;
						}
						this.props.setTab(id);
					}}
					role="tab"
					aria-controls={id}
					aria-selected={isActive}
				>
					{child.props.label}
				</a>
			);

			const classNames = [];
			if (isActive) {
				classNames.push("active");
			}
			if (disabled) {
				classNames.push("disabled");
			}
			if (highlight) {
				classNames.push("highlight");
			}

			return (
				<li key={id} className={classNames.join(" ")}>
					{label}
				</li>
			);
		});

		const body = children.map((child: any) => {
			if (child.props.disabled) {
				return null;
			}
			const id = child.props.id;
			const classNames = ["tab-pane"];
			const isActive = id === this.props.tab;
			if (isActive) {
				classNames.push("active");
			}
			return (
				<div
					id={id}
					key={id}
					className={classNames.join(" ")}
					role="tabpanel"
					aria-labelledby={TabList.makeTabId(id)}
					aria-expanded={isActive}
				>
					{child}
				</div>
			);
		});

		return (
			<div>
				<ul className="nav nav-tabs content-tabs" role="tablist">
					{tabs}
				</ul>
				<section className="tab-content">{body}</section>
			</div>
		);
	}

	public componentDidMount(): void {
		TabList.ensureVisibleTab(this.props);
	}

	public componentWillReceiveProps(
		nextProps: Readonly<Props>,
		nextContext: any
	): void {
		TabList.ensureVisibleTab(nextProps);
	}

	private static getValidChildren(
		children,
		excludeDisabled?: boolean,
		warn?: boolean
	): React.ReactChild[] {
		return React.Children.toArray(children).filter((child: any) => {
			if (child.type !== Tab) {
				if (warn) {
					console.warn(
						"TabList requires <Tab> components as children"
					);
				}
				return false;
			}
			if (!child.props) {
				return false;
			}
			if (child.props.hidden) {
				return false;
			}
			if (excludeDisabled && child.props.disabled) {
				return false;
			}
			return true;
		});
	}

	private static ensureVisibleTab(props): void {
		if (typeof props.setTab !== "function") {
			// if we can't switch tab there's nothing we can do
			return;
		}

		const validChildren = this.getValidChildren(
			props.children,
			true,
			true
		) as any[];
		if (!validChildren.length) {
			// no valid tabs, nothing we can do
			return;
		}

		if (!validChildren.find(child => child.props.id === props.tab)) {
			// no selected child, manually select closest
			props.setTab(validChildren[0].props.id);
		}
	}

	private static makeTabId(id: string) {
		return `tab-${id}`;
	}
}
