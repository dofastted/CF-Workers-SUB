
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31

//节点链接 + 订阅链接
let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];
let subConverter = "SUBAPI.cmliussss.net"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/dofastted/clash-rule-for-ai/main/chash_rules_for_ai.ini"; //订阅配置文件
let subProtocol = 'https';
const INLINE_SUBCONFIG_PATH = '/__subconfig__';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		const rawSubConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		const subConfigInfo = resolveSubConfig(rawSubConfig, url.origin, fakeToken);
		subConfig = subConfigInfo.displayValue;
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		const 订阅中转路径 = `/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		if (subConfigInfo.inlineContent && url.pathname === INLINE_SUBCONFIG_PATH) {
			if (![mytoken, fakeToken].includes(token)) {
				return new Response('Not found', { status: 404 });
			}
			return new Response(subConfigInfo.inlineContent, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=UTF-8',
					'Cache-Control': 'no-store',
				},
			});
		}

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			if (token == fakeToken && url.searchParams.has('url')) {
				const 远程订阅链接 = url.searchParams.get('url');
				const 追加UA参数 = url.searchParams.get('ua') || 'v2rayn';
				const 原始UA参数 = url.searchParams.get('uafull') || userAgentHeader || '';
				if (!远程订阅链接 || !/^https?:\/\//i.test(远程订阅链接)) {
					return new Response('无效的远程订阅链接', { status: 400 });
				}
				try {
					const 中转响应 = await getUrl(request, 远程订阅链接, 追加UA参数, 原始UA参数);
					const 中转头 = new Headers(中转响应.headers);
					if (!中转头.get('content-type')) 中转头.set('content-type', 'text/plain; charset=utf-8');
					return new Response(await 中转响应.text(), {
						status: 中转响应.status,
						headers: 中转头,
					});
				} catch (error) {
					console.error('远程订阅中转失败:', error);
					return new Response('远程订阅中转失败', { status: 502 });
				}
			}

			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				if (userAgent.includes('mozilla') && !url.search) {
					await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
					return await KV(request, env, 'LINK.txt', 访客订阅);
				} else {
					MainData = await env.KV.get('LINK.txt') || MainData;
				}
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
			let 自建节点 = "";
			let 订阅链接 = "";
			let 家宽原始节点 = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接 += x + '\n';
				} else if (isRawSocksProxyUrl(x)) {
					家宽原始节点 += x + '\n';
				} else {
					自建节点 += x + '\n';
				}
			}
			MainData = 自建节点;
			urls = await ADD(订阅链接);
			const 家宽Clash配置 = await buildResidentialClashConfig(await ADD(家宽原始节点));
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			const isSubConverterRequest = request.headers.get('subconverter-request') || request.headers.get('subconverter-version') || userAgent.includes('subconverter');
			let 订阅格式 = 'base64';
			if (!(userAgent.includes('null') || isSubConverterRequest || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase()))) {
				if (userAgent.includes('sing-box') || userAgent.includes('singbox') || url.searchParams.has('sb') || url.searchParams.has('singbox')) {
					订阅格式 = 'singbox';
				} else if (userAgent.includes('surge') || url.searchParams.has('surge')) {
					订阅格式 = 'surge';
				} else if (userAgent.includes('quantumult') || url.searchParams.has('quanx')) {
					订阅格式 = 'quanx';
				} else if (userAgent.includes('loon') || url.searchParams.has('loon')) {
					订阅格式 = 'loon';
				} else if (userAgent.includes('clash') || userAgent.includes('meta') || userAgent.includes('mihomo') || url.searchParams.has('clash')) {
					订阅格式 = 'clash';
				}
			}

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}${订阅中转路径}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
			else if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

			const 订阅链接数组 = [...new Set(urls)].filter(item => item?.trim?.()); // 去重
			let 第三方Clash配置 = [];
			if (家宽Clash配置) 第三方Clash配置.push(家宽Clash配置);
			if (订阅链接数组.length > 0) {
				const 请求订阅响应内容 = await getSUB(订阅链接数组, request, 追加UA, userAgentHeader, `${url.origin}${订阅中转路径}`);
				console.log(请求订阅响应内容);
				req_data += 请求订阅响应内容[0].join('\n');
				订阅转换URL += "|" + 请求订阅响应内容[1];
				第三方Clash配置.push(...(请求订阅响应内容[2] || []));
				if (订阅格式 === 'base64' && !isSubConverterRequest && 请求订阅响应内容[1].includes('://')) {
					subConverterUrl = `${subProtocol}://${subConverter}/sub?target=mixed&url=${encodeURIComponent(请求订阅响应内容[1])}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
					try {
						const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': 'v2rayN/CF-Workers-SUB  (https://github.com/cmliu/CF-Workers-SUB)' } });
						if (subConverterResponse.ok) {
							const subConverterContent = await subConverterResponse.text();
							req_data += '\n' + atob(subConverterContent);
						}
					} catch (error) {
						console.log('订阅转换请回base64失败，检查订阅转换后端是否正常运行');
					}
				}
			}

			if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			const result = [...uniqueLines].join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result)
			}

			// 构建响应头对象
			const responseHeaders = {
				"content-type": "text/plain; charset=utf-8",
				"Profile-Update-Interval": `${SUBUpdateTime}`,
				"Profile-web-page-url": request.url.includes('?') ? request.url.split('?')[0] : request.url,
				//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
			};

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, { headers: responseHeaders });
			} else if (订阅格式 == 'clash') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'singbox') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'surge') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&ver=4&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'quanx') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
			} else if (订阅格式 == 'loon') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfigInfo.converterUrl)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
			}
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl, { headers: { 'User-Agent': userAgentHeader } });//订阅转换
				if (!subConverterResponse.ok) return new Response(base64Data, { headers: responseHeaders });
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') {
					subConverterContent = mergeClashSubscription(subConverterContent, 第三方Clash配置);
					subConverterContent = await clashFix(subConverterContent);
					subConverterContent = await applyResidentialProxyRouting(subConverterContent);
					subConverterContent = ensureResidentialAndRegionalGroups(subConverterContent);
				}
				// 只有非浏览器订阅才会返回SUBNAME
				if (!userAgent.includes('mozilla')) responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`;
				return new Response(subConverterContent, { headers: responseHeaders });
			} catch (error) {
				return new Response(base64Data, { headers: responseHeaders });
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, '\n').replace(/\n+/g, '\n');	// 替换为换行
	//console.log(addtext);
	if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split('\n');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

function resolveSubConfig(rawValue, origin, fakeToken) {
	const value = normalizeSubscriptionConfigUrl((rawValue || '').trim());
	if (!value) {
		return {
			converterUrl: '',
			displayValue: '',
			inlineContent: '',
		};
	}

	if (isHttpUrl(value)) {
		return {
			converterUrl: value,
			displayValue: value,
			inlineContent: '',
		};
	}

	const decodedInlineValue = tryDecodeInlineSubConfig(value);
	const inlineValue = looksLikeIniConfig(decodedInlineValue) ? decodedInlineValue : (looksLikeIniConfig(value) ? value : '');
	if (inlineValue) {
		const normalizedInlineValue = normalizeIniContent(inlineValue);
		const inlineUrl = `${origin}${INLINE_SUBCONFIG_PATH}?token=${fakeToken}`;
		return {
			converterUrl: inlineUrl,
			displayValue: `[inline] ${inlineUrl}`,
			inlineContent: normalizedInlineValue,
		};
	}

	if (looksLikeLocalPath(value)) {
		return {
			converterUrl: value,
			displayValue: `[本地路径无效] ${value}`,
			inlineContent: '',
		};
	}

	return {
		converterUrl: value,
		displayValue: value,
		inlineContent: '',
	};
}

function normalizeIniContent(content) {
	return content.replace(/\r\n?/g, '\n').trim() + '\n';
}

function isHttpUrl(value) {
	return /^https?:\/\//i.test(value);
}

function looksLikeIniConfig(value) {
	return /^\s*\[custom\]/i.test(value) || /(^|\n)\s*ruleset=/i.test(value) || /(^|\n)\s*custom_proxy_group=/i.test(value) || /(^|\n)\s*clash_rule_base=/i.test(value);
}

function looksLikeLocalPath(value) {
	return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('./') || value.startsWith('../') || value.startsWith('/');
}

function tryDecodeInlineSubConfig(value) {
	if (!/^[A-Za-z0-9+/=\r\n]+$/.test(value) || value.includes('\n')) {
		return '';
	}

	try {
		return base64Decode(value);
	} catch (error) {
		return '';
	}
}

function normalizeSubscriptionConfigUrl(configUrl) {
	if (!configUrl || typeof configUrl !== 'string') return configUrl;
	let normalized = configUrl.trim();
	normalized = normalized.replace(
		/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/([^/]+)\/(.+)$/i,
		'https://raw.githubusercontent.com/$1/$2/$3/$4'
	);
	normalized = normalized.replace(
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i,
		'https://raw.githubusercontent.com/$1/$2/$3/$4'
	);
	return normalized;
}

function extractClashProxySection(content) {
	const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
	const proxiesIndex = lines.findIndex(line => line.trim() === 'proxies:');
	if (proxiesIndex === -1) return '';

	const proxyLines = [];
	for (let i = proxiesIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		if (line && !/^\s/.test(line) && /^[^#\s][^:]*:/.test(line)) break;
		proxyLines.push(line);
	}

	while (proxyLines.length > 0 && !proxyLines[0].trim()) proxyLines.shift();
	while (proxyLines.length > 0 && !proxyLines[proxyLines.length - 1].trim()) proxyLines.pop();
	return proxyLines.join('\n');
}

function mergeClashSubscription(mainConfig, thirdPartyClashConfigs = []) {
	const extraProxyContent = [...new Set(thirdPartyClashConfigs.map(extractClashProxySection).filter(Boolean))].join('\n');
	if (!extraProxyContent) return mainConfig;

	if (mainConfig.includes('\nproxy-groups:')) {
		return mainConfig.replace('\nproxy-groups:', `\n${extraProxyContent}\nproxy-groups:`);
	}
	if (mainConfig.includes('proxies:')) {
		return `${mainConfig}\n${extraProxyContent}`;
	}
	return mainConfig;
}

async function buildResidentialClashConfig(rawProxyUrls) {
	const socksUrls = rawProxyUrls.filter(isRawSocksProxyUrl);
	if (socksUrls.length === 0) return '';

	const countryCache = new Map();
	const proxies = [];
	for (const proxyUrl of socksUrls) {
		const proxy = await parseRawSocksProxyUrl(proxyUrl, countryCache);
		if (proxy) proxies.push(proxy);
	}
	if (proxies.length === 0) return '';

	return `proxies:\n${proxies.map(proxyToClashLine).join('\n')}`;
}

function isRawSocksProxyUrl(value) {
	return /^socks5?:\/\//i.test((value || '').trim());
}

async function parseRawSocksProxyUrl(rawUrl, countryCache) {
	const value = rawUrl.trim();
	const protocol = value.match(/^socks5?:\/\//i)?.[0]?.replace('://', '').toLowerCase() || 'socks5';
	const payload = value.replace(/^socks5?:\/\//i, '');
	let server = '';
	let port = '';
	let username = '';
	let password = '';
	let rawName = '';

	if (payload.includes('@')) {
		try {
			const parsed = new URL(value);
			server = parsed.hostname.replace(/^\[|\]$/g, '');
			port = parsed.port;
			username = decodeURIComponent(parsed.username || '');
			password = decodeURIComponent(parsed.password || '');
			rawName = decodeURIComponent(parsed.hash.replace(/^#/, ''));
		} catch (error) {
			return null;
		}
	} else {
		const [mainPart, hashPart = ''] = payload.split('#');
		const parts = mainPart.split(':');
		server = parts[0] || '';
		port = parts[1] || '';
		username = parts[2] || '';
		password = parts.slice(3).join(':');
		rawName = decodeURIComponent(hashPart);
	}

	if (!server || !port) return null;
	const countryCode = await lookupProxyCountryCode(server, countryCache);
	const baseName = rawName || `${protocol.toUpperCase()} ${server}:${port}`;
	return {
		name: formatResidentialProxyName(baseName, countryCode),
		server,
		port,
		type: protocol === 'socks' ? 'socks5' : protocol,
		username,
		password,
	};
}

function proxyToClashLine(proxy) {
	const fields = [
		`name: "${escapeYamlDoubleQuoted(proxy.name)}"`,
		`server: ${proxy.server}`,
		`port: ${proxy.port}`,
		`type: ${proxy.type}`,
	];
	if (proxy.username) fields.push(`username: "${escapeYamlDoubleQuoted(proxy.username)}"`);
	if (proxy.password) fields.push(`password: "${escapeYamlDoubleQuoted(proxy.password)}"`);
	fields.push(`dialer-proxy: "家宽前置节点"`);
	return `  - {${fields.join(', ')}}`;
}

async function applyResidentialProxyRouting(content) {
	if (!content || !/type:\s*socks5?/i.test(content)) {
		return content;
	}

	const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
	const countryCache = new Map();
	const result = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const trimmed = line.trim();

		if (/^-\s*\{.*\btype:\s*socks5?\b/i.test(trimmed)) {
			result.push(await routeInlineResidentialProxy(line, countryCache));
			continue;
		}

		if (/^-\s*name\s*:/i.test(trimmed)) {
			const block = [line];
			let cursor = index + 1;
			while (cursor < lines.length && /^\s+/.test(lines[cursor])) {
				block.push(lines[cursor]);
				cursor++;
			}

			if (block.some(item => /^\s*type\s*:\s*socks5?\s*$/i.test(item.trim()) || /^\s*type\s*:\s*socks5?\s*(?:#.*)?$/i.test(item.trim()))) {
				result.push(...await routeBlockResidentialProxy(block, countryCache));
				index = cursor - 1;
				continue;
			}

			result.push(line);
			continue;
		}

		result.push(line);
	}

	return result.join('\n');
}

function ensureResidentialAndRegionalGroups(content) {
	if (!content || !content.includes('\nproxy-groups:')) return content;

	const proxyNames = extractProxyNames(content);
	const existingGroups = extractProxyGroupNames(content);
	const prependGroups = [];

	if (!existingGroups.has('DE - 节点选择')) {
		prependGroups.push(buildProxyGroupYaml('DE - 节点选择', 'select', matchProxyNames(proxyNames, /德国|德國|Germany|Deutschland|Frankfurt|法兰克福|法蘭克福|Berlin|柏林|(?:^|\s|[-_\[\(])(DE|DEU|GER)\d{0,3}(?:$|\s|[-_\]\)])|🇩🇪/i)));
	}

	if (!existingGroups.has('AU - 节点选择')) {
		prependGroups.push(buildProxyGroupYaml('AU - 节点选择', 'select', matchProxyNames(proxyNames, /澳大利亚|澳洲|Australia|Sydney|悉尼|Melbourne|墨尔本|(?:^|\s|[-_\[\(])(AU|AUS)\d{0,3}(?:$|\s|[-_\]\)])|🇦🇺/i)));
	}

	if (!existingGroups.has('家宽前置节点')) {
		prependGroups.push(buildProxyGroupYaml('家宽前置节点', 'select', [
			'手动选择',
			'HK - 自动选择',
			'JP - 自动选择',
			'US - 节点选择',
			'DE - 节点选择',
			'AU - 节点选择',
		]));
	}

	const residentialNames = proxyNames.filter(name => /(\[家宽\]|家宽|住宅|residential|socks5?)/i.test(name));
	if (!existingGroups.has('家宽节点')) {
		prependGroups.push(buildProxyGroupYaml('家宽节点', 'select', residentialNames));
	}

	let nextContent = content;
	if (prependGroups.length > 0) {
		nextContent = nextContent.replace('\nproxy-groups:', `\nproxy-groups:\n${prependGroups.filter(Boolean).join('\n')}`);
	}

	nextContent = ensureGroupReferences(nextContent, [
		'🔮 全局策略',
		'🧩 自定义扩展',
		'🤖 OpenAI',
		'🤖 Claude',
		'🤖 Gemini',
		'🤖 XAI',
		'🤖 wechat',
		'🎬 奈飞分组',
		'📱 社交媒体',
		'📺 YouTube',
		'🎵 Spotify',
		'🎮 游戏平台',
		'🎮 Dota2',
		'💻 微软服务',
		'🍎 苹果服务',
		'🐟 漏网之鱼',
		'🔒 IP 伪装',
	], ['DE - 节点选择']);
	return nextContent;
}

function extractProxyNames(content) {
	const names = [];
	const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
	let inProxies = false;

	for (const line of lines) {
		if (line.trim() === 'proxies:') {
			inProxies = true;
			continue;
		}
		if (inProxies && line.trim() === 'proxy-groups:') break;
		if (!inProxies) continue;

		const inlineName = extractFlowMapValue(line, 'name');
		if (inlineName) {
			names.push(inlineName);
			continue;
		}

		const blockMatch = line.match(/^\s*-\s*name\s*:\s*(.+)$/i);
		if (blockMatch) names.push(unquoteYamlValue(blockMatch[1]));
	}

	return [...new Set(names)];
}

function extractProxyGroupNames(content) {
	const names = new Set();
	const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
	let inGroups = false;

	for (const line of lines) {
		if (line.trim() === 'proxy-groups:') {
			inGroups = true;
			continue;
		}
		if (inGroups && line && !/^\s/.test(line) && /^[^#\s][^:]*:/.test(line)) break;
		if (!inGroups) continue;

		const match = line.match(/^\s*-\s*name\s*:\s*(.+)$/i);
		if (match) names.add(unquoteYamlValue(match[1]));
	}

	return names;
}

function matchProxyNames(proxyNames, pattern) {
	const matched = proxyNames.filter(name => pattern.test(name));
	return matched.length > 0 ? matched : ['DIRECT'];
}

function buildProxyGroupYaml(name, type, proxies) {
	const uniqueProxies = [...new Set(proxies.filter(Boolean))];
	if (uniqueProxies.length === 0) uniqueProxies.push('DIRECT');
	return [
		`  - name: ${name}`,
		`    type: ${type}`,
		`    proxies:`,
		...uniqueProxies.map(proxy => `      - ${proxy}`),
	].join('\n');
}

function ensureGroupReferences(content, groupNames, references) {
	const targetGroups = new Set(groupNames);
	const lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
	const result = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const match = line.match(/^\s*-\s*name\s*:\s*(.+)$/i);
		if (!match || !targetGroups.has(unquoteYamlValue(match[1]))) {
			result.push(line);
			continue;
		}

		const block = [line];
		let cursor = index + 1;
		while (cursor < lines.length && /^\s+/.test(lines[cursor])) {
			block.push(lines[cursor]);
			cursor++;
		}

		result.push(...insertProxyReferences(block, references));
		index = cursor - 1;
	}

	return result.join('\n');
}

function insertProxyReferences(block, references) {
	const existing = new Set(block.map(line => line.trim().replace(/^-\s*/, '')));
	const result = [];
	let inserted = false;

	for (const line of block) {
		result.push(line);
		if (!inserted && line.trim() === 'proxies:') {
			for (const reference of references) {
				if (!existing.has(reference)) result.push(`      - ${reference}`);
			}
			inserted = true;
		}
	}

	return result;
}

async function routeInlineResidentialProxy(line, countryCache) {
	const server = extractFlowMapValue(line, 'server');
	const countryCode = await lookupProxyCountryCode(server, countryCache);
	const name = extractFlowMapValue(line, 'name');
	let routedLine = line;

	if (name && !/(\[家宽\]|家宽|住宅|residential)/i.test(name)) {
		routedLine = replaceFlowMapValue(routedLine, 'name', formatResidentialProxyName(name, countryCode));
	}

	if (!/\bdialer-proxy\s*:/i.test(routedLine)) {
		routedLine = routedLine.replace(/\}\s*$/, ', dialer-proxy: "家宽前置节点"}');
	}

	return routedLine;
}

async function routeBlockResidentialProxy(block, countryCache) {
	const serverLine = block.find(line => /^\s*server\s*:/i.test(line.trim()));
	const server = serverLine ? serverLine.split(/:\s*/).slice(1).join(':').trim().replace(/^["']|["']$/g, '') : '';
	const countryCode = await lookupProxyCountryCode(server, countryCache);
	const result = [];
	let hasDialerProxy = false;

	for (const line of block) {
		if (/^\s*dialer-proxy\s*:/i.test(line.trim())) hasDialerProxy = true;
		if (/^-\s*name\s*:/i.test(line.trim())) {
			const prefix = line.match(/^(\s*-\s*name\s*:\s*)/i)?.[1] || '';
			const name = line.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
			if (name && !/(\[家宽\]|家宽|住宅|residential)/i.test(name)) {
				result.push(`${prefix}"${escapeYamlDoubleQuoted(formatResidentialProxyName(name, countryCode))}"`);
				continue;
			}
		}
		result.push(line);
	}

	if (!hasDialerProxy) {
		const indent = block.find(line => /^\s+\S/.test(line))?.match(/^(\s+)/)?.[1] || '  ';
		result.push(`${indent}dialer-proxy: 家宽前置节点`);
	}

	return result;
}

function extractFlowMapValue(line, key) {
	const match = line.match(new RegExp(`(?:^|[,\\s])${key}\\s*:\\s*("[^"]*"|'[^']*'|[^,}]+)`, 'i'));
	if (!match) return '';
	return match[1].trim().replace(/^["']|["']$/g, '');
}

function unquoteYamlValue(value) {
	return (value || '').trim().replace(/^["']|["']$/g, '');
}

function replaceFlowMapValue(line, key, value) {
	const replacement = `${key}: "${escapeYamlDoubleQuoted(value)}"`;
	return line.replace(new RegExp(`(${key}\\s*:\\s*)("[^"]*"|'[^']*'|[^,}]+)`, 'i'), replacement);
}

function formatResidentialProxyName(name, countryCode) {
	const code = countryCode ? `[${countryCode}]` : '';
	return `[家宽]${code} ${name}`;
}

function escapeYamlDoubleQuoted(value) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function lookupProxyCountryCode(server, countryCache) {
	const host = normalizeProxyHost(server);
	if (!host) return '';
	if (countryCache.has(host)) return countryCache.get(host);

	try {
		const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(host)}?fields=status,countryCode,query`);
		if (!response.ok) {
			countryCache.set(host, '');
			return '';
		}
		const data = await response.json();
		const countryCode = data && data.status === 'success' && data.countryCode ? data.countryCode.toUpperCase() : '';
		countryCache.set(host, countryCode);
		return countryCode;
	} catch (error) {
		console.log(`家宽节点归属地探测失败: ${host}`);
		countryCache.set(host, '');
		return '';
	}
}

function normalizeProxyHost(server) {
	if (!server) return '';
	let host = server.toString().trim().replace(/^["']|["']$/g, '');
	if (!host) return '';
	host = host.replace(/^\[|\]$/g, '');
	return host;
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

function createRelaySubscriptionUrl(relayBaseUrl, originalSubscriptionUrl, appendUA, originalUA = '') {
	return `${relayBaseUrl}&url=${encodeURIComponent(originalSubscriptionUrl)}&ua=${encodeURIComponent(appendUA || 'v2rayn')}&uafull=${encodeURIComponent(originalUA)}`;
}

async function getSUB(api, request, 追加UA, userAgentHeader, relayBaseUrl = '') {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重
	let newapi = "";
	let 订阅转换URLs = "";
	let 第三方Clash配置 = [];
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies:')) {
					if (追加UA === 'clash') {
						第三方Clash配置.push(content);
					} else {
						订阅转换URLs += "|" + (relayBaseUrl ? createRelaySubscriptionUrl(relayBaseUrl, response.apiUrl, 追加UA, userAgentHeader || '') : response.apiUrl);
					}
				} else if (content.includes('outbounds"') && content.includes('inbounds"')) {
					//console.log('Singbox订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + (relayBaseUrl ? createRelaySubscriptionUrl(relayBaseUrl, response.apiUrl, 追加UA, userAgentHeader || '') : response.apiUrl); // Singbox 配置
				} else if (content.includes('://')) {
					//console.log('明文订阅: ' + response.apiUrl);
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					//console.log('Base64订阅: ' + response.apiUrl);
					try {
						newapi += base64Decode(content) + '\n'; // 解码并追加内容
					} catch (error) {
						console.log('Base64订阅解码失败，转交订阅转换器: ' + response.apiUrl);
						订阅转换URLs += "|" + response.apiUrl;
					}
				} else {
					console.log('未识别订阅格式，转交订阅转换器: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl;
				}
			} else {
				console.log('订阅请求失败，转交订阅转换器: ' + response.apiUrl);
				订阅转换URLs += "|" + response.apiUrl;
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs, 第三方Clash配置];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", getSubscriptionUA(追加UA, userAgentHeader));

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function getSubscriptionUA(追加UA, userAgentHeader = '') {
	if (userAgentHeader && !userAgentHeader.toLowerCase().includes('mozilla') && !userAgentHeader.toLowerCase().includes('subconverter')) {
		return userAgentHeader;
	}
	if (追加UA === 'clash') return 'Clash Verge/2.0';
	if (追加UA === 'singbox') return 'sing-box';
	if (追加UA === 'surge') return 'Surge';
	if (追加UA === 'Quantumult%20X') return 'Quantumult X';
	if (追加UA === 'Loon') return 'Loon';
	return `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB`;
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	if (!cleanStr || cleanStr.length < 16) return false;
	const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
	if (!base64Regex.test(cleanStr)) return false;
	try {
		atob(cleanStr);
		return true;
	} catch {
		return false;
	}
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest) {
	const url = new URL(request.url);
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅编辑</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						body {
							margin: 0;
							padding: 15px; /* 调整padding */
							box-sizing: border-box;
							font-size: 13px; /* 设置全局字体大小 */
						}
						.editor-container {
							width: 100%;
							max-width: 100%;
							margin: 0 auto;
						}
						.editor {
							width: 100%;
							height: 300px; /* 调整高度 */
							margin: 15px 0; /* 调整margin */
							padding: 10px; /* 调整padding */
							box-sizing: border-box;
							border: 1px solid #ccc;
							border-radius: 4px;
							font-size: 13px;
							line-height: 1.5;
							overflow-y: auto;
							resize: none;
						}
						.save-container {
							margin-top: 8px; /* 调整margin */
							display: flex;
							align-items: center;
							gap: 10px; /* 调整gap */
						}
						.save-btn, .back-btn {
							padding: 6px 15px; /* 调整padding */
							color: white;
							border: none;
							border-radius: 4px;
							cursor: pointer;
						}
						.save-btn {
							background: #4CAF50;
						}
						.save-btn:hover {
							background: #45a049;
						}
						.back-btn {
							background: #666;
						}
						.back-btn:hover {
							background: #555;
						}
						.save-status {
							color: #666;
						}
					</style>
					<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
				</head>
				<body>
					################################################################<br>
					Subscribe / sub 订阅地址, 点击链接自动 <strong>复制订阅链接</strong> 并 <strong>生成订阅二维码</strong> <br>
					---------------------------------------------------------------<br>
					自适应订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sub','qrcode_0')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}</a><br>
					<div id="qrcode_0" style="margin: 10px 10px 10px 10px;"></div>
					Base64订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?b64</a><br>
					<div id="qrcode_1" style="margin: 10px 10px 10px 10px;"></div>
					clash订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?clash</a><br>
					<div id="qrcode_2" style="margin: 10px 10px 10px 10px;"></div>
					singbox订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?sb</a><br>
					<div id="qrcode_3" style="margin: 10px 10px 10px 10px;"></div>
					surge订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?surge</a><br>
					<div id="qrcode_4" style="margin: 10px 10px 10px 10px;"></div>
					loon订阅地址:<br>
					<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/${mytoken}?loon</a><br>
					<div id="qrcode_5" style="margin: 10px 10px 10px 10px;"></div>
					&nbsp;&nbsp;<strong><a href="javascript:void(0);" id="noticeToggle" onclick="toggleNotice()">查看访客订阅∨</a></strong><br>
					<div id="noticeContent" class="notice-content" style="display: none;">
						---------------------------------------------------------------<br>
						访客订阅只能使用订阅功能，无法查看配置页！<br>
						GUEST（访客订阅TOKEN）: <strong>${guest}</strong><br>
						---------------------------------------------------------------<br>
						自适应订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}','guest_0')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}</a><br>
						<div id="guest_0" style="margin: 10px 10px 10px 10px;"></div>
						Base64订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&b64','guest_1')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&b64</a><br>
						<div id="guest_1" style="margin: 10px 10px 10px 10px;"></div>
						clash订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&clash','guest_2')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&clash</a><br>
						<div id="guest_2" style="margin: 10px 10px 10px 10px;"></div>
						singbox订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&sb','guest_3')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&sb</a><br>
						<div id="guest_3" style="margin: 10px 10px 10px 10px;"></div>
						surge订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&surge','guest_4')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&surge</a><br>
						<div id="guest_4" style="margin: 10px 10px 10px 10px;"></div>
						loon订阅地址:<br>
						<a href="javascript:void(0)" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&loon','guest_5')" style="color:blue;text-decoration:underline;cursor:pointer;">https://${url.hostname}/sub?token=${guest}&loon</a><br>
						<div id="guest_5" style="margin: 10px 10px 10px 10px;"></div>
					</div>
					---------------------------------------------------------------<br>
					################################################################<br>
					订阅转换配置<br>
					---------------------------------------------------------------<br>
					SUBAPI（订阅转换后端）: <strong>${subProtocol}://${subConverter}</strong><br>
					SUBCONFIG（订阅转换配置文件）: <strong>${subConfig}</strong><br>
					---------------------------------------------------------------<br>
					################################################################<br>
					${FileName} 汇聚订阅编辑: 
					<div class="editor-container">
						${hasKV ? `
						<textarea class="editor" 
							placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNCVCOCVBQSVFOCU4QSU4MiVFNyU4MiVCOSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}"
							id="content">${content}</textarea>
						<div class="save-container">
							<button class="save-btn" onclick="saveContent(this)">保存</button>
							<span class="save-status" id="saveStatus"></span>
						</div>
						` : '<p>请绑定 <strong>变量名称</strong> 为 <strong>KV</strong> 的KV命名空间</p>'}
					</div>
					<br>
					################################################################<br>
					${decodeURIComponent(atob('dGVsZWdyYW0lMjAlRTQlQkElQTQlRTYlQjUlODElRTclQkUlQTQlMjAlRTYlOEElODAlRTYlOUMlQUYlRTUlQTQlQTclRTQlQkQlQUMlN0UlRTUlOUMlQTglRTclQkElQkYlRTUlOEYlOTElRTclODklOEMhJTNDYnIlM0UKJTNDYSUyMGhyZWYlM0QlMjdodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlMjclM0VodHRwcyUzQSUyRiUyRnQubWUlMkZDTUxpdXNzc3MlM0MlMkZhJTNFJTNDYnIlM0UKLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJTNDYnIlM0UKZ2l0aHViJTIwJUU5JUExJUI5JUU3JTlCJUFFJUU1JTlDJUIwJUU1JTlEJTgwJTIwU3RhciFTdGFyIVN0YXIhISElM0NiciUzRQolM0NhJTIwaHJlZiUzRCUyN2h0dHBzJTNBJTJGJTJGZ2l0aHViLmNvbSUyRmNtbGl1JTJGQ0YtV29ya2Vycy1TVUIlMjclM0VodHRwcyUzQSUyRiUyRmdpdGh1Yi5jb20lMkZjbWxpdSUyRkNGLVdvcmtlcnMtU1VCJTNDJTJGYSUzRSUzQ2JyJTNFCi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSUzQ2JyJTNFCiUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMyUyMw=='))}
					<br><br>UA: <strong>${request.headers.get('User-Agent')}</strong>
					<script>
					function copyToClipboard(text, qrcode) {
						navigator.clipboard.writeText(text).then(() => {
							alert('已复制到剪贴板');
						}).catch(err => {
							console.error('复制失败:', err);
						});
						const qrcodeDiv = document.getElementById(qrcode);
						qrcodeDiv.innerHTML = '';
						new QRCode(qrcodeDiv, {
							text: text,
							width: 220, // 调整宽度
							height: 220, // 调整高度
							colorDark: "#000000", // 二维码颜色
							colorLight: "#ffffff", // 背景颜色
							correctLevel: QRCode.CorrectLevel.Q, // 设置纠错级别
							scale: 1 // 调整像素颗粒度
						});
					}
						
					if (document.querySelector('.editor')) {
						let timer;
						const textarea = document.getElementById('content');
						const originalContent = textarea.value;
		
						function goBack() {
							const currentUrl = window.location.href;
							const parentUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
							window.location.href = parentUrl;
						}
		
						function replaceFullwidthColon() {
							const text = textarea.value;
							textarea.value = text.replace(/：/g, ':');
						}
						
						function saveContent(button) {
							try {
								const updateButtonText = (step) => {
									button.textContent = \`保存中: \${step}\`;
								};
								// 检测是否为iOS设备
								const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
								
								// 仅在非iOS设备上执行replaceFullwidthColon
								if (!isIOS) {
									replaceFullwidthColon();
								}
								updateButtonText('开始保存');
								button.disabled = true;

								// 获取textarea内容和原始内容
								const textarea = document.getElementById('content');
								if (!textarea) {
									throw new Error('找不到文本编辑区域');
								}

								updateButtonText('获取内容');
								let newContent;
								let originalContent;
								try {
									newContent = textarea.value || '';
									originalContent = textarea.defaultValue || '';
								} catch (e) {
									console.error('获取内容错误:', e);
									throw new Error('无法获取编辑内容');
								}

								updateButtonText('准备状态更新函数');
								const updateStatus = (message, isError = false) => {
									const statusElem = document.getElementById('saveStatus');
									if (statusElem) {
										statusElem.textContent = message;
										statusElem.style.color = isError ? 'red' : '#666';
									}
								};

								updateButtonText('准备按钮重置函数');
								const resetButton = () => {
									button.textContent = '保存';
									button.disabled = false;
								};

								if (newContent !== originalContent) {
									updateButtonText('发送保存请求');
									fetch(window.location.href, {
										method: 'POST',
										body: newContent,
										headers: {
											'Content-Type': 'text/plain;charset=UTF-8'
										},
										cache: 'no-cache'
									})
									.then(response => {
										updateButtonText('检查响应状态');
										if (!response.ok) {
											throw new Error(\`HTTP error! status: \${response.status}\`);
										}
										updateButtonText('更新保存状态');
										const now = new Date().toLocaleString();
										document.title = \`编辑已保存 \${now}\`;
										updateStatus(\`已保存 \${now}\`);
									})
									.catch(error => {
										updateButtonText('处理错误');
										console.error('Save error:', error);
										updateStatus(\`保存失败: \${error.message}\`, true);
									})
									.finally(() => {
										resetButton();
									});
								} else {
									updateButtonText('检查内容变化');
									updateStatus('内容未变化');
									resetButton();
								}
							} catch (error) {
								console.error('保存过程出错:', error);
								button.textContent = '保存';
								button.disabled = false;
								const statusElem = document.getElementById('saveStatus');
								if (statusElem) {
									statusElem.textContent = \`错误: \${error.message}\`;
									statusElem.style.color = 'red';
								}
							}
						}
		
						textarea.addEventListener('blur', saveContent);
						textarea.addEventListener('input', () => {
							clearTimeout(timer);
							timer = setTimeout(saveContent, 5000);
						});
					}

					function toggleNotice() {
						const noticeContent = document.getElementById('noticeContent');
						const noticeToggle = document.getElementById('noticeToggle');
						if (noticeContent.style.display === 'none' || noticeContent.style.display === '') {
							noticeContent.style.display = 'block';
							noticeToggle.textContent = '隐藏访客订阅∧';
						} else {
							noticeContent.style.display = 'none';
							noticeToggle.textContent = '查看访客订阅∨';
						}
					}
			
					// 初始化 noticeContent 的 display 属性
					document.addEventListener('DOMContentLoaded', () => {
						document.getElementById('noticeContent').style.display = 'none';
					});
					</script>
				</body>
			</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}
