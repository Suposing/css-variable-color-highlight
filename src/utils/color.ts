/**
 * @description 可识别的 CSS 颜色关键字列表，用于正则生成和关键字合法性判断。
 * @description 列表保持为源码常量，便于后续扩展或替换为更完整的 CSS 颜色数据。
 */
const CSS_COLOR_KEYWORDS = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'red',
  'rebeccapurple',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
  'transparent',
  'currentcolor',
];

/**
 * @description CSS 颜色关键字集合，用于 O(1) 判断单个文本是否是关键字颜色。
 */
const COLOR_KEYWORDS = new Set(CSS_COLOR_KEYWORDS);

/**
 * @description 估算前景色时使用的关键字到十六进制颜色映射。
 * @description 未列出的关键字仍可被识别为颜色，但无法参与亮度估算。
 */
const KEYWORD_HEX_COLORS = new Map<string, string>([
  ['black', '#000000'],
  ['blue', '#0000ff'],
  ['fuchsia', '#ff00ff'],
  ['gray', '#808080'],
  ['green', '#008000'],
  ['grey', '#808080'],
  ['lime', '#00ff00'],
  ['maroon', '#800000'],
  ['navy', '#000080'],
  ['olive', '#808000'],
  ['orange', '#ffa500'],
  ['purple', '#800080'],
  ['red', '#ff0000'],
  ['rebeccapurple', '#663399'],
  ['silver', '#c0c0c0'],
  ['teal', '#008080'],
  ['transparent', '#ffffff'],
  ['white', '#ffffff'],
  ['yellow', '#ffff00'],
]);

/**
 * @description 匹配十六进制 CSS 颜色，支持 3/4/6/8 位格式。
 */
const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

/**
 * @description 匹配常见 RGB/HSL 函数色值；当前不做完整 CSS 函数语法校验。
 */
const FUNCTION_COLOR_PATTERN = /\b(?:rgb|rgba|hsl|hsla)\(\s*[^)]*?\)/gi;

/**
 * @description 匹配 CSS 颜色关键字，并避免命中自定义属性名或标识符中的片段。
 */
const KEYWORD_COLOR_PATTERN = new RegExp(`(?<![-\\w])(?:${CSS_COLOR_KEYWORDS.join('|')})(?![-\\w])`, 'gi');

/**
 * @description 判断文本是否是可展示的 CSS 颜色值。
 * @param value 待判断的文本。
 * @returns 如果文本是十六进制、RGB/HSL 函数或颜色关键字则返回 true。
 */
export function isColorValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(normalized)
    || /^(?:rgb|rgba|hsl|hsla)\(\s*[^)]*?\)$/.test(normalized)
    || COLOR_KEYWORDS.has(normalized)
  );
}

/**
 * @description 从任意 CSS 值中提取可展示颜色。
 * @description 支持复合值中的多颜色片段，例如渐变、阴影、边框或背景声明。
 * @param value CSS 属性值或变量值。
 * @returns 按出现顺序提取出的颜色值；没有可识别颜色时返回空数组。
 */
export function extractColors(value: string): string[] {
  const colors: Array<{ value: string; index: number }> = [];

  for (const match of value.matchAll(HEX_COLOR_PATTERN)) {
    if (typeof match.index === 'number') {
      colors.push({ value: match[0], index: match.index });
    }
  }

  for (const match of value.matchAll(FUNCTION_COLOR_PATTERN)) {
    if (typeof match.index === 'number') {
      colors.push({ value: match[0], index: match.index });
    }
  }

  for (const match of value.matchAll(KEYWORD_COLOR_PATTERN)) {
    if (typeof match.index === 'number') {
      colors.push({ value: match[0], index: match.index });
    }
  }

  return colors
    .sort((a, b) => a.index - b.index)
    .map((color) => color.value);
}

/**
 * @description 将 CSS 颜色转换为可放进 VS Code 装饰 CSS 属性的展示值。
 * @param color CSS 颜色。
 * @returns 标准化后的展示颜色；当前仅去除首尾空白，保留原始格式。
 */
export function toDisplayColor(color: string): string {
  return color.trim();
}

/**
 * @description 根据背景色估算可读的前景色。
 * @param color CSS 背景色，支持十六进制、RGB、HSL 和部分关键字。
 * @returns 黑色或白色；无法解析颜色通道时返回 undefined，让调用方保留默认前景色。
 */
export function getReadableTextColor(color: string): string | undefined {
  const rgb = parseRgbColor(color);
  if (!rgb) {
    return undefined;
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.58 ? '#000000' : '#ffffff';
}

/**
 * @description 将常见 CSS 颜色转成 RGB。
 * @param color CSS 颜色。
 * @returns RGB 数值；不支持的格式或未知关键字返回 undefined。
 */
function parseRgbColor(color: string): { r: number; g: number; b: number } | undefined {
  const normalized = color.trim().toLowerCase();
  const keywordHex = KEYWORD_HEX_COLORS.get(normalized);

  if (keywordHex) {
    return parseHexColor(keywordHex);
  }

  if (normalized.startsWith('#')) {
    return parseHexColor(normalized);
  }

  const rgbMatch = normalized.match(/^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)/);
  if (rgbMatch) {
    return {
      r: clampColorChannel(Number(rgbMatch[1])),
      g: clampColorChannel(Number(rgbMatch[2])),
      b: clampColorChannel(Number(rgbMatch[3])),
    };
  }

  const hslMatch = normalized.match(/^hsla?\(\s*([\d.]+)(?:deg)?(?:\s*,\s*|\s+)([\d.]+)%(?:\s*,\s*|\s+)([\d.]+)%/);
  if (hslMatch) {
    return hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
  }

  return undefined;
}

/**
 * @description 解析十六进制颜色为 RGB。
 * @param color 十六进制颜色，支持 3/4/6/8 位格式。
 * @returns RGB 数值；长度不合法时返回 undefined，透明度通道会被忽略。
 */
function parseHexColor(color: string): { r: number; g: number; b: number } | undefined {
  const hex = color.slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) {
    return undefined;
  }

  const normalized = hex.length <= 4
    ? hex.slice(0, 3).split('').map((char) => char + char).join('')
    : hex.slice(0, 6);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

/**
 * @description 将 HSL 转换为 RGB。
 * @param hue 色相。
 * @param saturation 饱和度百分比。
 * @param lightness 亮度百分比。
 * @returns RGB 数值；输入会被归一化到合法范围。
 */
function hslToRgb(hue: number, saturation: number, lightness: number): { r: number; g: number; b: number } {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360;
  const normalizedSaturation = Math.max(0, Math.min(100, saturation)) / 100;
  const normalizedLightness = Math.max(0, Math.min(100, lightness)) / 100;

  if (normalizedSaturation === 0) {
    const channel = Math.round(normalizedLightness * 255);
    return { r: channel, g: channel, b: channel };
  }

  const q = normalizedLightness < 0.5
    ? normalizedLightness * (1 + normalizedSaturation)
    : normalizedLightness + normalizedSaturation - normalizedLightness * normalizedSaturation;
  const p = 2 * normalizedLightness - q;

  return {
    r: Math.round(hueToRgb(p, q, normalizedHue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, normalizedHue) * 255),
    b: Math.round(hueToRgb(p, q, normalizedHue - 1 / 3) * 255),
  };
}

/**
 * @description HSL 转 RGB 的单通道转换。
 * @param p 中间值 p。
 * @param q 中间值 q。
 * @param t 色相偏移。
 * @returns 标准化颜色通道。
 */
function hueToRgb(p: number, q: number, t: number): number {
  let value = t;
  if (value < 0) {
    value += 1;
  }
  if (value > 1) {
    value -= 1;
  }
  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }
  if (value < 1 / 2) {
    return q;
  }
  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }

  return p;
}

/**
 * @description 限制 RGB 通道到 0-255。
 * @param value 原始通道值。
 * @returns 安全通道值。
 */
function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * @description 对外暴露的颜色匹配正则集合，供文档扫描器按类别收集颜色。
 */
export const COLOR_PATTERNS = {
  hex: HEX_COLOR_PATTERN,
  function: FUNCTION_COLOR_PATTERN,
  keyword: KEYWORD_COLOR_PATTERN,
};
