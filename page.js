const urlLocation = new URL(location.href);

const inputContainer = document.body.querySelector('div#input-container');
const imageSrcInput = inputContainer.querySelector('input#image-src-input');
const languageInput = inputContainer.querySelector('select#language-input');
const confirmInputButton = inputContainer.querySelector('button#confirm-input-button');

const mainElement = document.body.querySelector('main');

const workers = new Map();

let iamgePromise = null;
let imageBlob = null;

const getWorker = async (lang) => {
	if (!(lang in Tesseract.languages)) throw new Error('Language "' + lang + '" not found.');
	if (workers.has(lang)) return workers.get(lang);

	const worker = await Tesseract.createWorker(Tesseract.languages.JPN, undefined, {
		corePath: browser.runtime.getURL('./node_modules/tesseract.js-core/'),
		workerPath: browser.runtime.getURL('./node_modules/tesseract.js/dist/worker.min.js'),
		langPath: browser.runtime.getURL('./languages/')
	});

	workers.set(lang, worker);

	return worker;
};

const addTextBox = (info, type) => {
	const elem = document.createElement('p');
	elem.classList.add('text-box-' + type);

	elem.style.left = info.bbox.x0 + 50 + 'px';
	elem.style.top = info.bbox.y0 + 50 + 'px';

	elem.style.width = info.bbox.x1 - info.bbox.x0 + 'px';
	elem.style.height = info.bbox.y1 - info.bbox.y0 + 'px';

	elem.style.fontSize = info.bbox.y1 - info.bbox.y0 + 'px';

	elem.dataset.confidence = info.confidence;

	elem.innerText = info.text;

	mainElement.append(elem);
};

const setImage = (src) => {
	const promise = new Promise(async (resolve, reject) => {
		imageBlob = await fetch(src).then(r => r.blob()).catch(error => reject(error));

		const imgBmp = await createImageBitmap(imageBlob);
		mainElement.style.backgroundImage = `url(${URL.createObjectURL(imageBlob)})`;
		mainElement.style.width = imgBmp.width + 'px';
		mainElement.style.height = imgBmp.height + 'px';
		imgBmp.close();

		resolve();
	});

	mainElement.innerHTML = '';

	iamgePromise = promise;

	mainElement.classList.add('loading');
	promise.finally(() => {
		if (iamgePromise !== promise) return;
		mainElement.classList.remove('loading');
	});

	return promise;
};

const recognize = async (blob, lang = 'ENG') => {
	const worker = await getWorker(lang);

	const promise = worker.recognize(
		blob,
		{},
		{
			text: false,
			blocks: true,
			hocr: false,
			tsv: false
		}
	);

	mainElement.classList.add('processing');

	const result = (await promise).data;

	mainElement.classList.remove('processing');

	console.log(result);

	for (const word of result.words) {
		addTextBox(word, 'word');
	}
};

const init = () => {
	let n = 0;

	if (urlLocation.searchParams.has('lang')) {
		n++;
		languageInput.value = urlLocation.searchParams.get('lang');
	}

	if (urlLocation.searchParams.has('img')) {
		imageSrcInput.value = urlLocation.searchParams.get('img');

		if (URL.canParse(urlLocation.searchParams.get('img'))) {
			n++;
			setImage(urlLocation.searchParams.get('img'));
		}
	}

	if (n === 2) {
		confirmInputButton.disabled = true;
		iamgePromise.then(() => {
			recognize(imageBlob, languageInput.value);
			confirmInputButton.disabled = false;
		});
	}
};

languageInput.append(...Object.keys(Tesseract.languages).map((langCode) => {
	const element = document.createElement('option');
	element.value = langCode;
	element.innerText = langCode;
	return element;
}));

init();

confirmInputButton.addEventListener('click', async () => {
	const langCode = languageInput.value;
	const imgSrc = imageSrcInput.value;

	if (!URL.canParse(imgSrc)) {
		throw new Error('No valid image source.');
	}

	confirmInputButton.disabled = true;

	urlLocation.searchParams.set('lang', langCode);
	urlLocation.searchParams.set('img', imgSrc);
	history.pushState(null, '', urlLocation);

	await setImage(imgSrc);
	await recognize(imageBlob, langCode);

	confirmInputButton.disabled = false;
});
