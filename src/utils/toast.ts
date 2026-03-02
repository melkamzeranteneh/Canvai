type ToastHandle = { close?: () => void };
// Simple wrapper around the officially installed `sileo` package.
// We also add a tiny in-app confirm helper and a loading toast helper
// to provide consistent UX without relying on native alerts.

import { sileo } from 'sileo';

export const toast = sileo;
export default sileo;

// Create a lightweight confirmation toast/modal that resolves a promise.
export function confirmToast(message: string, okLabel = 'OK', cancelLabel = 'Cancel'): Promise<boolean> {
	return new Promise((resolve) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'app-confirm-toast';
		wrapper.style.position = 'fixed';
		wrapper.style.left = '50%';
		wrapper.style.top = '20%';
		wrapper.style.transform = 'translateX(-50%)';
		wrapper.style.zIndex = '99999';
		wrapper.style.background = 'var(--surface-color, #fff)';
		wrapper.style.border = '1px solid rgba(0,0,0,0.08)';
		wrapper.style.padding = '12px 14px';
		wrapper.style.borderRadius = '8px';
		wrapper.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
		wrapper.style.minWidth = '280px';
		wrapper.style.fontFamily = 'inherit';

		const text = document.createElement('div');
		text.style.marginBottom = '10px';
		text.textContent = message;

		const actions = document.createElement('div');
		actions.style.display = 'flex';
		actions.style.justifyContent = 'flex-end';
		actions.style.gap = '8px';

		const btnCancel = document.createElement('button');
		btnCancel.textContent = cancelLabel;
		btnCancel.style.background = 'transparent';
		btnCancel.style.border = 'none';
		btnCancel.style.cursor = 'pointer';

		const btnOk = document.createElement('button');
		btnOk.textContent = okLabel;
		btnOk.style.background = 'var(--accent-color, #2563eb)';
		btnOk.style.color = '#fff';
		btnOk.style.border = 'none';
		btnOk.style.padding = '6px 10px';
		btnOk.style.borderRadius = '6px';
		btnOk.style.cursor = 'pointer';

		actions.appendChild(btnCancel);
		actions.appendChild(btnOk);
		wrapper.appendChild(text);
		wrapper.appendChild(actions);
		document.body.appendChild(wrapper);

		const cleanup = () => { try { document.body.removeChild(wrapper); } catch (e) {} };

		btnCancel.addEventListener('click', () => { cleanup(); resolve(false); });
		btnOk.addEventListener('click', () => { cleanup(); resolve(true); });
	});
}

// Simple loading toast that can be closed programmatically.
export function loadingToast(message: string) : ToastHandle {
	const el = document.createElement('div');
	el.className = 'app-loading-toast';
	el.style.position = 'fixed';
	el.style.right = '20px';
	el.style.bottom = '20px';
	el.style.background = 'var(--surface-color, #fff)';
	el.style.border = '1px solid rgba(0,0,0,0.08)';
	el.style.padding = '10px 12px';
	el.style.borderRadius = '8px';
	el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
	el.style.fontFamily = 'inherit';
	el.textContent = message;
	document.body.appendChild(el);

	return { close: () => { try { document.body.removeChild(el); } catch (e) {} } };
}
