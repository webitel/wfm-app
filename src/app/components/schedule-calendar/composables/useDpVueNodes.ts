import { getCurrentInstance, onBeforeUnmount, render, type VNode } from 'vue';

// [Claude] DayPilot asks for a DOM node in onBefore*DomAdd and hands it back in onBefore*DomRemove.
// [Claude] mount() renders a Vue vnode into a fresh node with the app context (global wt-*
// [Claude] components, i18n, directives work); unmount() tears it down when DayPilot drops it.
export const useDpVueNodes = () => {
	const appContext = getCurrentInstance()?.appContext ?? null;
	const mounted = new Set<HTMLElement>();

	const mount = (vnode: VNode): HTMLElement => {
		const node = document.createElement('div');
		node.className = 'wfm-dp-node';
		vnode.appContext = appContext;
		render(vnode, node);
		mounted.add(node);
		return node;
	};

	const unmount = (node: unknown) => {
		if (!(node instanceof HTMLElement) || !mounted.has(node)) return;
		render(null, node);
		mounted.delete(node);
	};

	onBeforeUnmount(() => {
		for (const node of mounted) render(null, node);
		mounted.clear();
	});

	return {
		mount,
		unmount,
	};
};
