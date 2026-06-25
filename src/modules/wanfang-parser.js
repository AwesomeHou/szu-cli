import { formatAcademicSearchExports } from './academic-format.js';

const WANFANG_BASE_URL = 'https://s.wanfangdata.com.cn/';

export function parseWanfangSearchMeta(text) {
  const normalized = cleanText(text);
  return {
    total: matchNumber(normalized, /(?:共|找到)?\s*([\d,]+)\s*(?:篇|条文献)/),
    authorized: normalized.includes('深圳大学'),
    institution: normalized.includes('深圳大学') ? '深圳大学' : null
  };
}

export function parseWanfangSearchRows(rows = []) {
  return rows
    .map((row, index) => {
      const rawText = stringOrNull(row.rawText ?? [
        row.title,
        row.authors,
        row.source,
        row.abstract,
        row.stats
      ].filter(Boolean).join(' '));
      const sourceInfo = parseSource(row.source, rawText);
      return {
        index: row.index ?? index + 1,
        title: cleanTitle(row.title),
        authors: splitAuthors(cleanAuthorValue(row.authors) || sourceInfo.authors),
        source: sourceInfo.source,
        publishedAt: null,
        year: sourceInfo.year,
        type: sourceInfo.type,
        downloadCount: matchNumber(row.stats, /(?:下载量|下载)\s*[：:]?\s*([\d,]+)/),
        abstract: stringOrNull(row.abstract),
        url: absoluteWanfangUrl(row.href),
        rawText
      };
    })
    .filter((item) => item.title);
}

export function buildWanfangSearchPayload(options) {
  const meta = parseWanfangSearchMeta(options.text ?? '');
  const items = parseWanfangSearchRows(options.rows ?? []);
  const limit = options.limit ?? items.length;
  const limitedItems = items.slice(0, limit);

  return {
    keyword: options.keyword,
    ...(options.advanced ? { advanced: options.advanced } : {}),
    total: meta.total,
    authorized: meta.authorized,
    institution: meta.institution,
    items: limitedItems,
    ...(options.format ? { exports: formatWanfangSearchExports(limitedItems, options.format) } : {}),
    sourceUrl: options.sourceUrl
  };
}

export function formatWanfangSearchExports(items, format) {
  return formatAcademicSearchExports(items, format, 'wanfang');
}

export function buildWanfangItemPayload(options) {
  const detail = options.detail ?? {};
  const text = cleanText(options.text ?? '');
  const sourceInfo = parseSource(detail.source, text);
  const authors = splitAuthors(detail.authors);
  const institutions = splitInstitutions(detail.institutions);
  const title = stringOrNull(detail.title);
  return {
    provider: 'wanfang',
    title,
    authors,
    institutions,
    source: sourceInfo.source,
    publishedAt: null,
    year: sourceInfo.year,
    type: sourceInfo.type,
    abstract: cleanLabeledValue(detail.abstract, '摘要'),
    keywords: splitDelimitedValues(cleanLabeledValue(detail.keywords, '关键词')),
    doi: matchValue(text, /DOI[：:]\s*([^\s]+)/i),
    fund: matchValue(text, /基金[：:]\s*(.*?)(?=\s*(?:分类号|DOI)[：:]|$)/),
    classification: matchValue(text, /分类号[：:]\s*([A-Z0-9.]+)/i),
    citationTitle: title,
    citationAuthorsText: authors.join(', ') || null,
    citationSourceText: sourceInfo.source,
    citationYear: sourceInfo.year,
    sourceUrl: options.sourceUrl
  };
}

function parseSource(value, rawValue) {
  const text = cleanText(value);
  const raw = cleanText(rawValue);
  const compact = raw.match(/\[(?<type>[^\]]+)\](?<authors>.*?)-《(?<source>[^》]+)》(?<date>\d{4}年[^ ]*)?/);
  const year = text.match(/(\d{4})年/)?.[1]
    ?? compact?.groups?.date?.match(/(\d{4})年/)?.[1]
    ?? raw.match(/年,卷\(期\)[：:]?\s*(\d{4})/)?.[1]
    ?? null;
  const source = stringOrNull(text.replace(/\s*\d{4}年.*$/, '')) ?? stringOrNull(compact?.groups?.source);
  return {
    authors: compact?.groups?.authors ?? '',
    source,
    year,
    type: compact?.groups?.type?.replace(/论文$/, '') ?? '期刊'
  };
}

function cleanTitle(value) {
  return stringOrNull(cleanText(value).replace(/^\d+\.\s*/, ''));
}

function absoluteWanfangUrl(href) {
  if (!href) {
    return null;
  }
  return new URL(href, WANFANG_BASE_URL).toString();
}

function splitAuthors(value) {
  const text = cleanText(value).replace(/等$/, '');
  const parts = splitDelimitedValues(text);
  if (parts.length > 1) {
    return unique(parts.map(cleanAuthorName).filter(isMeaningfulAuthor));
  }
  return unique(splitCompactChineseAuthors(text).map(cleanAuthorName).filter(isMeaningfulAuthor));
}

function splitDelimitedValues(value) {
  return unique(cleanText(value).split(/[;；,，、]+/).map((item) => item.trim()).filter(Boolean));
}

function splitInstitutions(value) {
  const text = cleanText(value).replace(/(\d{6})(\d+[.．])/g, '$1; $2');
  if (/\d+[.．]/.test(text)) {
    return unique(text.split(/[;；]\s*(?=\d+[.．])/).map((item) => item.trim()).filter(Boolean));
  }
  return splitDelimitedValues(text);
}

function unique(items) {
  return [...new Set(items)];
}

function cleanAuthorValue(value) {
  const text = cleanText(value);
  return text.startsWith('[') ? '' : text;
}

function cleanAuthorName(value) {
  return cleanText(value).replace(/\s+\d+$/g, '').trim();
}

function isMeaningfulAuthor(value) {
  return Boolean(value && !/^\d+$/.test(value));
}

function cleanLabeledValue(value, label) {
  return stringOrNull(cleanText(value).replace(new RegExp(`^${label}[：:]?\\s*`), ''));
}

function splitCompactChineseAuthors(value) {
  const text = cleanText(value);
  if (!text || /[A-Za-z]/.test(text) || text.length < 5) {
    return text ? [text] : [];
  }

  const boundaries = [0];
  for (let index = 2; index < text.length - 1; index += 1) {
    if (isChineseSurnameAt(text, index) && index - boundaries.at(-1) >= 2) {
      boundaries.push(index);
    }
  }

  if (boundaries.length < 2) {
    return [text];
  }

  return boundaries.map((start, index) => {
    const end = boundaries[index + 1] ?? text.length;
    return text.slice(start, end);
  }).filter((name) => name.length >= 2);
}

function isChineseSurnameAt(text, index) {
  const compoundSurnames = ['欧阳', '司马', '诸葛', '上官', '东方', '夏侯', '皇甫', '尉迟', '公孙', '慕容'];
  if (compoundSurnames.some((surname) => text.startsWith(surname, index))) {
    return true;
  }
  return '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉龚程邢裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘厉戎祖武符刘景詹龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀浦尚农温别庄晏柴瞿阎充连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东殴殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公迟'.includes(text[index]);
}

function matchValue(text, pattern) {
  return stringOrNull(cleanText(text).match(pattern)?.[1]);
}

function matchNumber(text, pattern) {
  const match = cleanText(text).match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function stringOrNull(value) {
  const text = cleanText(value);
  return text || null;
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
