import React from "react";
import { getCardUrl, getFragments } from "../helpers";
import Tooltip from "./Tooltip";

interface Props {
	card: any;
	size?: number;
	mark?: string;
	markStyle?: any;
	tabIndex?: number;
}

interface State {
	backgroundLoaded: boolean;
}

export default class CardIcon extends React.Component<Props, State> {
	readonly baseSize = 34;
	readonly baseBackgroundWidth = 126;
	readonly baseOffset = -70;

	constructor(props: Props, context: any) {
		super(props, context);
		this.state = {
			backgroundLoaded: false,
		};
	}

	public componentDidMount(): void {
		this.loadBackgroundImage();
	}

	public componentWillReceiveProps(
		nextProps: Readonly<Props>,
		nextContext: any,
	): void {
		if (
			!this.props.card ||
			(!nextProps.card && this.props.card.id !== nextProps.card.id)
		) {
			this.loadBackgroundImage();
		}
	}

	buildBackgroundImageUrl(): string {
		return (
			"https://art.hearthstonejson.com/v1/tiles/" +
			this.props.card.id +
			".jpg"
		);
	}

	loadBackgroundImage() {
		if (!this.props.card) {
			return;
		}
		const image = new Image();
		image.onload = () => {
			this.setState({ backgroundLoaded: true });
		};
		image.src = this.buildBackgroundImageUrl();
	}

	public render(): React.ReactNode {
		const classNames = ["card-icon"];

		if (this.props.card) {
			const size = this.props.size || this.baseSize;
			const style: any = {
				height: size + "px",
				width: size + "px",
			};

			let mark = null;

			if (this.state.backgroundLoaded) {
				style.backgroundImage = `url(${this.buildBackgroundImageUrl()})`;
				style.backgroundPosition =
					this.baseOffset * (size / this.baseSize) + "px 0";
				style.backgroundSize =
					this.baseBackgroundWidth * (size / this.baseSize) +
					"px " +
					(size - 2) +
					"px";

				if (this.props.mark !== undefined) {
					mark = (
						<span style={this.props.markStyle}>
							{this.props.mark}
						</span>
					);
				}
			} else {
				classNames.push("loading");
			}

			const tooltip = (
				<img
					className="card-image"
					src={
						"https://art.hearthstonejson.com/v1/render/latest/enUS/256x/" +
						this.props.card.id +
						".png"
					}
					alt={this.props.card ? this.props.card.name : null}
				/>
			);

			const url =
				getCardUrl(this.props.card) +
				getFragments(["gameType", "rankRange"]);

			return (
				<Tooltip content={tooltip} noBackground>
					<a
						href={url}
						tabIndex={
							typeof this.props.tabIndex !== "undefined"
								? this.props.tabIndex
								: 0
						}
						className="card-icon-link"
					>
						<div
							className={classNames.join(" ")}
							style={style}
							aria-label={
								this.props.card.name +
								(this.props.mark ? " " + this.props.mark : "")
							}
						>
							{mark}
						</div>
					</a>
				</Tooltip>
			);
		}
	}
}
