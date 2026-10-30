import { beforeEach } from "vitest";

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

window.matchMedia = ((query: string) => {
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
}) as typeof window.matchMedia;

class MockBroadcastChannel implements BroadcastChannel {
	static instances: MockBroadcastChannel[] = [];
	name: string;
	onmessage: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null =
		null;
	onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null =
		null;

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

window.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;

beforeEach(() => {
	systemDark = false;
	listeners = [];
	MockBroadcastChannel.instances = [];
	document.documentElement.className = "";
	document.documentElement.removeAttribute("style");
	document.documentElement.removeAttribute("data-theme");
	document.head.innerHTML = "";
});
