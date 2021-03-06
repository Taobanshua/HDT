import JoustEmbedder from "../JoustEmbedder";
import i18n from "../i18n";
import UserData from "../UserData";

// Joust
const embedder = new JoustEmbedder();

const container = document.getElementById("joust-container");

// shared url decoding
if (location.hash) {
	let ret = location.hash.match(/turn=(\d+)(a|b)/);
	if (ret) {
		embedder.turn = +ret[1] * 2 + +(ret[2] === "b") - 1;
	}
	ret = location.hash.match(/reveal=(0|1)/);
	if (ret) {
		embedder.reveal = +ret[1] === 1;
	}
	ret = location.hash.match(/swap=(0|1)/);
	if (ret) {
		embedder.swap = +ret[1] === 1;
	}
}

UserData.create();
embedder.embed(container, i18n.getFixedT(UserData.getLocale()));
