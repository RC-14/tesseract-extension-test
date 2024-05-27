const PAGE_URL = browser.runtime.getURL('./index.html');

browser.runtime.onInstalled.addListener((details) => {
	browser.menus.create({
		id: '0',
		contexts: ['image'],
		title: 'tesseract.js test'
	});

	// for testing
	browser.tabs.create({ url: PAGE_URL + '?img=https%3A%2F%2Fasuratoon.com%2Fwp-content%2Fuploads%2Fcustom-upload%2F79451%2F78%2F00%2520kopya_result.webp&lang=ENG' });
});

browser.menus.onClicked.addListener(async (info, tab) => {
	if (!info?.srcUrl) throw new Error('No srcUrl.');

	const url = new URL(PAGE_URL);
	url.searchParams.set('img', info.srcUrl);

	browser.tabs.create({ url: url.href });
});
