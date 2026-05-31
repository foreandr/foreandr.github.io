(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HomepageCountryIntel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COUNTRY_ALIASES = {
    usa: 'united states of america',
    'u.s.a.': 'united states of america',
    'u.s.': 'united states of america',
    'united states': 'united states of america',
    uk: 'united kingdom',
    'south korea': 'korea, rep.',
    'north korea': "korea, dem. people's rep.",
    russia: 'russian federation',
    bolivia: 'bolivia',
    venezuela: 'venezuela, rb',
    iran: 'iran, islamic rep.',
    syria: 'syrian arab republic',
    laos: 'lao pdr',
    vietnam: 'viet nam',
    tanzania: 'tanzania',
    moldova: 'moldova',
    brunei: 'brunei darussalam',
    czechia: 'czech republic',
    'democratic republic of the congo': 'congo, dem. rep.',
    'dr congo': 'congo, dem. rep.',
    'republic of the congo': 'congo, rep.',
    congo: 'congo, rep.'
  };

  const IMF_GROUPS = [
    {
      id: 'economy',
      title: 'Economic Data',
      source: 'IMF',
      metrics: ['NGDPD', 'PPPGDP', 'NGDPDPC', 'PPPPC', 'LP', 'NGDPRPCH', 'PCPIPCH', 'LUR']
    },
    {
      id: 'financial',
      title: 'Finance',
      source: 'IMF',
      metrics: ['GGXWDGNGDP', 'GGXCNLNGDP', 'GGRG01GDPPT', 'GXG01GDPPT', 'rev', 'exp', 'pb', 'ie']
    },
    {
      id: 'trade',
      title: 'Trade + External',
      source: 'IMF',
      metrics: ['BXGDP', 'BMGDP', 'BCAGDP', 'BCA', 'TTT', 'PPPEX', 'PPPSH']
    }
  ];

  const WB_GROUPS = [
    {
      id: 'power-access',
      title: 'Power + Access',
      source: 'World Bank',
      metrics: [
        'ID11ACCESSELECTRICITYTOT',
        'ID12ACCESSELECTRICITYRURAL',
        'ID13ACCESSELECTRICITYURBAN',
        'ID21ACCESSCFTTOT',
        'ID21SHARETOTALREINTFEC',
        'ID11TOTALFINALENERGYCONSUM',
        'ID31RECONSUMPTION',
        'ID411TOTALELECTRICITYOUTPUT',
        'ID412RENELECTRICITYOUTPUT',
        'ID41SHAREREINELECTRICITY'
      ]
    }
  ];

  function normalizeCountryName(name) {
    return String(name || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[().']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^the /, '')
      .replace(/\s+republic$/, '')
      .replace(/\s+state$/, '')
      .replace(/\s+states$/, ' states');
  }

  function normalizeWithAliases(name) {
    const normalized = normalizeCountryName(name);
    return COUNTRY_ALIASES[normalized] || normalized;
  }

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function pickLatestSeriesValue(series) {
    if (!series || typeof series !== 'object') return null;
    const years = Object.keys(series)
      .map(key => Number(key))
      .filter(Number.isFinite)
      .sort((a, b) => b - a);

    for (const year of years) {
      const value = toNumber(series[year]);
      if (value !== null) return { year, value };
    }

    return null;
  }

  function buildGeoIndex(geojson) {
    const byNormalizedName = new Map();
    const byIso3 = new Map();

    if (!geojson || !Array.isArray(geojson.features)) {
      return { byNormalizedName, byIso3 };
    }

    geojson.features.forEach(feature => {
      const props = feature && feature.properties ? feature.properties : {};
      const iso3 = props.ISO_A3 || props.ADM0_A3 || props.SOV_A3 || null;
      const name = props.NAME || props.ADMIN || props.NAME_LONG || props.FORMAL_EN || iso3 || 'Unknown';
      const entry = {
        name,
        iso3,
        continent: props.CONTINENT || '',
        region: props.REGION_WB || props.REGION_UN || '',
        subregion: props.SUBREGION || '',
        incomeGroup: props.INCOME_GRP || ''
      };

      byNormalizedName.set(normalizeWithAliases(name), entry);

      const alternates = [
        props.ADMIN,
        props.NAME_LONG,
        props.FORMAL_EN,
        props.NAME_SORT,
        props.BRK_NAME,
        props.NAME_CIAWF
      ];

      alternates.forEach(value => {
        if (value) byNormalizedName.set(normalizeWithAliases(value), entry);
      });

      if (iso3) byIso3.set(iso3, entry);
    });

    return { byNormalizedName, byIso3 };
  }

  function findDataset(datasets, id) {
    return (datasets || []).find(dataset => dataset && dataset.id === id) || null;
  }

  function getDatasetCountryValues(dataset) {
    if (!dataset || typeof dataset !== 'object') return null;
    if (dataset.values && typeof dataset.values === 'object') return dataset.values;
    if (dataset.data && typeof dataset.data === 'object') return dataset.data;
    return null;
  }

  function findCountryData(source, countryName) {
    if (!source || typeof source !== 'object') return null;
    const target = normalizeWithAliases(countryName);
    for (const [key, value] of Object.entries(source)) {
      if (normalizeWithAliases(key) === target) return { key, value };
    }
    return null;
  }

  function formatMetricValue(value, unit) {
    if (!Number.isFinite(value)) return 'n/a';
    if (Math.abs(value) >= 1000 && unit === 'USD') {
      return Math.round(value).toLocaleString('en-US');
    }
    if (Math.abs(value) >= 1000 && unit === 'B USD') {
      return Math.round(value).toLocaleString('en-US');
    }
    if (Math.abs(value) >= 100) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (Math.abs(value) >= 10) return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function getSeriesYears(series) {
    if (!series || typeof series !== 'object') return [];
    return Object.keys(series)
      .map(key => Number(key))
      .filter(Number.isFinite)
      .sort((a, b) => b - a);
  }

  function createSeriesRow(config) {
    const years = getSeriesYears(config.series);
    const valuesByYear = {};
    const history = [];

    years.forEach(year => {
      const value = toNumber(config.series[year]);
      if (value !== null) {
        valuesByYear[year] = value;
        history.push({
          year,
          value,
          displayValue: formatMetricValue(value, config.unit || '')
        });
      }
    });

    if (!history.length) return null;

    return {
      id: config.id,
      label: config.label,
      unit: config.unit || '',
      source: config.source || '',
      category: config.category || '',
      years: history.map(point => point.year),
      valuesByYear,
      history,
      year: history[0].year,
      value: history[0].value,
      displayValue: history[0].displayValue
    };
  }

  function buildIndicatorMap(dataset) {
    return new Map(((dataset && dataset.indicators) || []).map(indicator => [indicator.id, indicator]));
  }

  function collectMetricGroupRows(countryData, group, indicatorMap) {
    return group.metrics.map(metricId => {
      const indicator = indicatorMap.get(metricId) || {};
      return createSeriesRow({
        id: metricId,
        label: indicator.label || metricId,
        unit: indicator.unit || '',
        source: group.source,
        category: group.title,
        series: countryData && countryData[metricId]
      });
    }).filter(Boolean);
  }

  function collectResourceGroups(iso3, resourceData) {
    if (!iso3 || !resourceData || !resourceData.countries) return [];
    const country = resourceData.countries[iso3];
    if (!country) return [];

    const metaById = new Map((resourceData.meta && resourceData.meta.resources || []).map(resource => [resource.id, resource]));
    const grouped = new Map();

    Object.entries(country).forEach(([resourceId, series]) => {
      const meta = metaById.get(resourceId);
      if (!meta) return;
      const row = createSeriesRow({
        id: resourceId,
        label: meta.label,
        unit: meta.unitShort || meta.unit || '',
        source: 'Resources',
        category: meta.category || 'Resources',
        series
      });
      if (!row || row.value <= 0) return;
      const groupId = 'resources-' + String(meta.category || 'resources').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          id: groupId,
          title: meta.category || 'Resources',
          source: 'Resources',
          rows: []
        });
      }
      grouped.get(groupId).rows.push(row);
    });

    return Array.from(grouped.values())
      .map(group => ({
        id: group.id,
        title: group.title,
        source: group.source,
        rows: group.rows.sort((a, b) => b.value - a.value)
      }))
      .filter(group => group.rows.length);
  }

  function buildCountryProfile(options) {
    const geoIndex = options.geoIndex || { byNormalizedName: new Map(), byIso3: new Map() };
    const resourceData = options.resourceData || null;
    const datasets = options.datasets || [];
    const fallbackName = options.countryName || 'Unknown';
    const normalizedName = normalizeWithAliases(fallbackName);
    const geo = geoIndex.byNormalizedName.get(normalizedName) || null;
    const iso3 = options.iso3 || (geo && geo.iso3) || null;
    const resolvedGeo = (iso3 && geoIndex.byIso3.get(iso3)) || geo || null;
    const displayName = (resolvedGeo && resolvedGeo.name) || fallbackName;

    const imfDataset = findDataset(datasets, 'imf_data');
    const wbDataset = findDataset(datasets, 'world_bank_data');
    const imfCountry = findCountryData(getDatasetCountryValues(imfDataset), displayName);
    const wbCountry = findCountryData(getDatasetCountryValues(wbDataset), displayName);
    const imfIndicatorMap = buildIndicatorMap(imfDataset);
    const wbIndicatorMap = buildIndicatorMap(wbDataset);
    const sections = [];

    IMF_GROUPS.forEach(group => {
      const rows = collectMetricGroupRows(imfCountry && imfCountry.value, group, imfIndicatorMap);
      if (rows.length) sections.push({ id: group.id, title: group.title, source: group.source, rows });
    });

    WB_GROUPS.forEach(group => {
      const rows = collectMetricGroupRows(wbCountry && wbCountry.value, group, wbIndicatorMap);
      if (rows.length) sections.push({ id: group.id, title: group.title, source: group.source, rows });
    });

    sections.push(...collectResourceGroups(iso3, resourceData));

    return {
      name: displayName,
      iso3: iso3 || 'n/a',
      meta: {
        continent: resolvedGeo && resolvedGeo.continent || '',
        region: resolvedGeo && resolvedGeo.region || '',
        subregion: resolvedGeo && resolvedGeo.subregion || '',
        incomeGroup: resolvedGeo && resolvedGeo.incomeGroup || ''
      },
      sections
    };
  }

  return {
    normalizeCountryName: normalizeWithAliases,
    pickLatestSeriesValue,
    createSeriesRow,
    formatMetricValue,
    buildGeoIndex,
    buildCountryProfile
  };
});
