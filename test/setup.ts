import { beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost/",
	pretendToBeVisual: true,
});

type ChangeListener = (event: MediaQueryListEvent) => void;

let systemDark = false;
let listeners: ChangeListener[] = [];

export function setSystemPrefersDark(matches: boolean): void {
	systemDark = matches;
}

export function emitSystemChange(): void {
	for (const listener of listeners) {
		listener({ matches: systemDark } as MediaQueryListEvent);
	}
}

function createMediaQueryList(query: string): MediaQueryList {
	const list = {
		// Live view, like the real MediaQueryList.
		get matches() {
			return systemDark;
		},
		media: query,
		onchange: null,
		addEventListener: (_type: string, listener: ChangeListener) => {
			listeners.push(listener);
		},
		removeEventListener: (_type: string, listener: ChangeListener) => {
			listeners = listeners.filter((registered) => registered !== listener);
		},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	};
	return list as MediaQueryList;
}

Object.defineProperty(dom.window, "matchMedia", {
	value: createMediaQueryList,
	writable: true,
	configurable: true,
});

class MockBroadcastChannel implements BroadcastChannel {
	static instances: MockBroadcastChannel[] = [];
	name: string;
	onmessage: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null =
		null;
	onmessageerror:
		| ((this: BroadcastChannel, ev: MessageEvent) => unknown)
		| null = null;

	constructor(name: string) {
		this.name = name;
		MockBroadcastChannel.instances.push(this);
	}

	postMessage(message: unknown): void {
		for (const instance of MockBroadcastChannel.instances.slice()) {
			if (instance !== this && instance.name === this.name) {
				instance.onmessage?.({ data: message } as MessageEvent);
			}
		}
	}

	close(): void {
		MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
			(instance) => instance !== this,
		);
	}

	addEventListener = () => {};
	removeEventListener = () => {};
	dispatchEvent = () => false;
}

Object.defineProperty(dom.window, "BroadcastChannel", {
	value: MockBroadcastChannel,
	writable: true,
	configurable: true,
});

// Register the jsdom globals for tests (bun has no DOM built in).
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;

function defineGlobal(key: string): void {
	try {
		Object.defineProperty(globalThis, key, {
			value: (dom.window as unknown as Record<string, unknown>)[key],
			writable: true,
			configurable: true,
		});
	} catch {
		// Some globals may be non-configurable in the runtime; skip them.
	}
}

for (const key of [
	"navigator",
	"Node",
	"Element",
	"HTMLElement",
	"HTMLInputElement",
	"SVGElement",
	"Event",
	"CustomEvent",
	"KeyboardEvent",
	"MouseEvent",
	"InputEvent",
	"EventTarget",
	"DocumentFragment",
	"Text",
	"Comment",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"getComputedStyle",
]) {
	defineGlobal(key);
}

beforeEach(() => {
	systemDark = false;
	listeners = [];
	MockBroadcastChannel.instances = [];
	document.documentElement.className = "";
	document.documentElement.removeAttribute("style");
	document.documentElement.removeAttribute("data-theme");
	document.head.innerHTML = "";
});
