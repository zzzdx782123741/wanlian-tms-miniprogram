const EXACT_TEXT_MAP = {
  'Standard 10k KM Package': '1万公里标准保养套餐',
  'Standard package for 10,000 KM': '适用于1万公里的标准保养套餐',
  'Engine oil replacement': '更换发动机机油',
  'Replace engine oil': '更换发动机机油',
  'Oil filter replacement': '更换机油滤清器',
  'Replace oil filter': '更换机油滤清器',
  featured: '推荐',
  'Engine Oil 10W-40': '发动机机油 10W-40',
  'Oil Filter': '机油滤清器',
  'Maintenance Labor': '保养工时',
  Universal: '通用',
  '18L package': '18L装',
  'Basic maintenance labor': '基础保养工时',
  'Default recommendation': '默认推荐',
  'ALL vehicles 8k-15k': '全车型 8千-1.5万公里'
};

const TIER_MAP = {
  basic: '基础',
  standard: '标准',
  premium: '高级',
  deluxe: '尊享'
};

const ICON_MAP = {
  oil: '机油',
  filter: '滤芯',
  labor: '工时'
};

function localizeText(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return value;
  if (Object.prototype.hasOwnProperty.call(EXACT_TEXT_MAP, text)) {
    return EXACT_TEXT_MAP[text];
  }

  const lowered = text.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(EXACT_TEXT_MAP, lowered)) {
    return EXACT_TEXT_MAP[lowered];
  }

  return value;
}

function localizeTier(tier) {
  if (typeof tier !== 'string') return tier;
  const key = tier.trim().toLowerCase();
  return TIER_MAP[key] || tier;
}

function localizeIcon(icon) {
  if (typeof icon !== 'string') return icon;
  const key = icon.trim().toLowerCase();
  return ICON_MAP[key] || icon;
}

function localizeProduct(product) {
  if (!product || typeof product !== 'object') return product;

  const localized = { ...product };
  if (localized.name) localized.name = localizeText(localized.name);
  if (localized.spec) localized.spec = localizeText(localized.spec);
  if (localized.description) localized.description = localizeText(localized.description);

  if (localized.productId && typeof localized.productId === 'object') {
    localized.productId = { ...localized.productId };
    if (localized.productId.name) localized.productId.name = localizeText(localized.productId.name);
    if (localized.productId.spec) localized.productId.spec = localizeText(localized.productId.spec);
    if (localized.productId.description) localized.productId.description = localizeText(localized.productId.description);
  }

  return localized;
}

function localizePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') return pkg;

  const localized = { ...pkg };
  if (localized.name) localized.name = localizeText(localized.name);
  if (localized.description) localized.description = localizeText(localized.description);
  if (localized.recommendationReason) localized.recommendationReason = localizeText(localized.recommendationReason);
  if (localized.tier) localized.tier = localizeTier(localized.tier);

  if (Array.isArray(localized.tags)) {
    localized.tags = localized.tags.map((tag) => localizeText(tag));
  }

  if (Array.isArray(localized.serviceItems)) {
    localized.serviceItems = localized.serviceItems.map((item) => {
      const nextItem = { ...item };
      if (nextItem.name) nextItem.name = localizeText(nextItem.name);
      if (nextItem.description) nextItem.description = localizeText(nextItem.description);
      if (nextItem.icon) nextItem.icon = localizeIcon(nextItem.icon);
      return nextItem;
    });
  }

  if (Array.isArray(localized.products)) {
    localized.products = localized.products.map((product) => localizeProduct(product));
  }

  return localized;
}

module.exports = {
  localizeText,
  localizeTier,
  localizeProduct,
  localizePackage
};
